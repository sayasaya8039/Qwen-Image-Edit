// Transformers.js WebGPUバックエンド実装
import { pipeline, env } from '@xenova/transformers';
import type { BackendExecutor, BackendCapabilities, BackendType, GenerationParams, MemoryInfo } from './types';

export class TransformersWebGPUBackend implements BackendExecutor {
  readonly name = 'Transformers.js (WebGPU)';
  readonly type: BackendType = 'transformers-webgpu' as BackendType;
  
  private generator: any = null;
  private initialized = false;
  private gpuAdapter: GPUAdapter | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // WebGPU対応確認
      if (!('gpu' in navigator)) {
        throw new Error('WebGPU is not supported');
      }

      // GPUアダプター取得
      this.gpuAdapter = await navigator.gpu.requestAdapter();
      if (!this.gpuAdapter) {
        throw new Error('Failed to get GPU adapter');
      }

      console.log('[TransformersWebGPU] GPU Adapter:', {
        vendor: this.gpuAdapter.info?.vendor,
        architecture: this.gpuAdapter.info?.architecture,
      });

      // WebGPU backendを設定
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.webgpu.device = 'gpu';
      
      console.log('[TransformersWebGPU] Initializing WebGPU backend...');
      
      // モデルロード
      this.generator = await pipeline(
        'text-to-image',
        'Xenova/sd-turbo',
        { 
          device: 'webgpu',
          dtype: 'fp16', // WebGPUではfp16が高速
        }
      );
      
      this.initialized = true;
      console.log('[TransformersWebGPU] Initialized successfully');
    } catch (error) {
      console.error('[TransformersWebGPU] Initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return 'gpu' in navigator;
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: false,
      supportsOffline: true,
      maxModelSize: 2000, // MB (VRAM)
      estimatedSpeed: 'fast',
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized || !this.generator) {
      await this.init();
    }

    console.log('[TransformersWebGPU] Generating image with params:', params);

    try {
      const output = await this.generator(params.prompt, {
        negative_prompt: params.negativePrompt,
        num_inference_steps: params.steps || 4,
        guidance_scale: params.guidanceScale || 0.0,
        width: params.width || 512,
        height: params.height || 512,
      });

      return this.convertToBlob(output);
    } catch (error) {
      console.error('[TransformersWebGPU] Generation failed:', error);
      throw error;
    }
  }

  private async convertToBlob(output: any): Promise<Blob> {
    if (output instanceof Blob) {
      return output;
    }
    
    if (output?.toBlob) {
      return await output.toBlob();
    }
    
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
    this.gpuAdapter = null;
    this.initialized = false;
    console.log('[TransformersWebGPU] Disposed');
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    const memory = (performance as any).memory;
    if (memory) {
      const used = memory.usedJSHeapSize / 1024 / 1024;
      const limit = memory.jsHeapSizeLimit / 1024 / 1024;
      const total = memory.totalJSHeapSize / 1024 / 1024;
      
      return {
        used: Math.round(used),
        available: Math.round(limit - used),
        peak: Math.round(total),
      };
    }
    
    return { used: 0, available: 4096, peak: 0 };
  }
}
