// Transformers.js Wasmバックエンド実装
import { pipeline, env } from '@xenova/transformers';
import type { BackendExecutor, BackendCapabilities, BackendType, GenerationParams, MemoryInfo } from './types';

export class TransformersWasmBackend implements BackendExecutor {
  readonly name = 'Transformers.js (Wasm/CPU)';
  readonly type: BackendType = 'transformers-wasm' as BackendType;
  
  private generator: any = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Wasm backendを設定
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;
      
      console.log('[TransformersWasm] Initializing Wasm backend...');
      
      // 軽量モデルをロード（sd-turbo等）
      this.generator = await pipeline(
        'text-to-image',
        'Xenova/sd-turbo',
        { 
          device: 'wasm',
          dtype: 'fp32',
        }
      );
      
      this.initialized = true;
      console.log('[TransformersWasm] Initialized successfully');
    } catch (error) {
      console.error('[TransformersWasm] Initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    // Wasmは常に利用可能
    return true;
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: false,
      supportsOffline: true,
      maxModelSize: 500, // MB (メモリ制約)
      estimatedSpeed: 'slow',
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized || !this.generator) {
      await this.init();
    }

    console.log('[TransformersWasm] Generating image with params:', params);

    try {
      const output = await this.generator(params.prompt, {
        negative_prompt: params.negativePrompt,
        num_inference_steps: params.steps || 4, // sd-turboは4 stepsが最適
        guidance_scale: params.guidanceScale || 0.0, // sd-turboはCFG不要
        width: params.width || 512,
        height: params.height || 512,
      });

      // 出力をBlobに変換
      return this.convertToBlob(output);
    } catch (error) {
      console.error('[TransformersWasm] Generation failed:', error);
      throw error;
    }
  }

  private async convertToBlob(output: any): Promise<Blob> {
    // Transformers.jsの出力形式に応じて変換
    if (output instanceof Blob) {
      return output;
    }
    
    // RawImageの場合
    if (output?.toBlob) {
      return await output.toBlob();
    }
    
    // Canvasの場合
    if (output?.toCanvas) {
      const canvas = await output.toCanvas();
      return new Promise((resolve) => {
        canvas.toBlob((blob: Blob | null) => {
          if (blob) resolve(blob);
          else throw new Error('Failed to convert to Blob');
        });
      });
    }

    throw new Error('Unsupported output format');
  }

  async dispose(): Promise<void> {
    if (this.generator) {
      // @ts-ignore
      await this.generator.dispose?.();
      this.generator = null;
    }
    this.initialized = false;
    console.log('[TransformersWasm] Disposed');
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    const memory = (performance as any).memory;
    if (memory) {
      const used = memory.usedJSHeapSize / 1024 / 1024;
      const total = memory.totalJSHeapSize / 1024 / 1024;
      const limit = memory.jsHeapSizeLimit / 1024 / 1024;
      
      return {
        used: Math.round(used),
        available: Math.round(limit - used),
        peak: Math.round(total),
      };
    }
    
    // メモリ情報が取得できない場合
    return { used: 0, available: 2048, peak: 0 };
  }
}
