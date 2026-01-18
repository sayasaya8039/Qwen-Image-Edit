// WebNN + Transformers.js バックエンド
import type {
  BackendExecutor,
  BackendType,
  BackendCapabilities,
  GenerationParams,
  MemoryInfo,
} from './types';

export class TransformersWebNNWasmBackend implements BackendExecutor {
  readonly name = 'Transformers.js WebNN+Wasm';
  readonly type: BackendType = 'transformers-webnn-wasm' as BackendType;

  private pipeline: any = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[TransformersWebNNWasm] Initializing...');

      // Transformers.jsをインポート
      const { pipeline, env } = await import('@xenova/transformers');

      // WebNN + Wasm設定
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;
      
      // WebNN有効化
      if ('ml' in navigator) {
        env.backends.onnx.webnn = {
          deviceType: 'cpu', // または 'gpu'
          powerPreference: 'high-performance',
        };
      }

      // 軽量モデルで初期化
      this.pipeline = await pipeline(
        'text-to-image',
        'Xenova/stable-diffusion-2-1-base',
        {
          device: 'webnn', // WebNN使用
          dtype: 'fp32',
        }
      );

      this.initialized = true;
      console.log('[TransformersWebNNWasm] Initialization complete');
    } catch (error) {
      console.error('[TransformersWebNNWasm] Initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    // WebNN APIの存在確認
    if (!('ml' in navigator)) {
      console.log('[TransformersWebNNWasm] WebNN not available');
      return false;
    }

    // WebAssemblyサポート確認
    if (typeof WebAssembly === 'undefined') {
      console.log('[TransformersWebNNWasm] WebAssembly not available');
      return false;
    }

    return true;
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: true,
      supportsOffline: true,
      maxModelSize: 2000, // 2GB
      estimatedSpeed: 'medium',
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized || !this.pipeline) {
      throw new Error('Backend not initialized');
    }

    console.log('[TransformersWebNNWasm] Generating image...', params);

    try {
      const result = await this.pipeline(params.prompt, {
        negative_prompt: params.negativePrompt,
        width: params.width || 512,
        height: params.height || 512,
        num_inference_steps: params.steps || 4,
        guidance_scale: params.guidanceScale || 0.0,
      });

      // Tensor → Canvas → Blob
      const canvas = document.createElement('canvas');
      canvas.width = params.width || 512;
      canvas.height = params.height || 512;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Failed to get canvas context');

      const imageData = new ImageData(
        new Uint8ClampedArray(result.data),
        canvas.width,
        canvas.height
      );
      ctx.putImageData(imageData, 0, 0);

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      });
    } catch (error) {
      console.error('[TransformersWebNNWasm] Generation failed:', error);
      throw error;
    }
  }

  async processImage(input: ImageData, operation: string): Promise<ImageData> {
    console.log('[TransformersWebNNWasm] Processing image:', operation);
    
    // 画像処理の実装（オプション）
    // WebNNを使った画像フィルター等
    
    return input;
  }

  async dispose(): Promise<void> {
    if (this.pipeline) {
      await this.pipeline.dispose?.();
      this.pipeline = null;
    }
    this.initialized = false;
    console.log('[TransformersWebNNWasm] Disposed');
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    // @ts-ignore
    const memory = performance.memory;
    
    if (memory) {
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        available: Math.round((memory.jsHeapSizeLimit - memory.usedJSHeapSize) / 1024 / 1024),
        peak: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      };
    }

    return {
      used: 0,
      available: 2000,
      peak: 0,
    };
  }
}
