import { env } from '@xenova/transformers';
import type { BackendExecutor, BackendType, BackendCapabilities, GenerationParams, MemoryInfo } from './types';

/**
 * Transformers.js + WebGPU Backend (GPU)
 * 
 * 注意: text-to-imageタスクは現在Transformers.jsで未サポート
 * 参考: https://github.com/xenova/transformers.js/issues/908
 */
export class TransformersWebGPUBackend implements BackendExecutor {
  readonly type: BackendType = 'transformers-webgpu' as BackendType;

  private _gpu: GPU | null = null;
  private gpuAdapter: GPUAdapter | null = null;
  private gpuDevice: GPUDevice | null = null;

  async init(): Promise<void> {
    console.log('[TransformersWebGPU] Initializing...');
    
    // WebGPU対応チェック
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU not supported');
    }

    this._gpu = navigator.gpu as GPU;

    // WebGPUアダプターとデバイスを取得
    this.gpuAdapter = await this._gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!this.gpuAdapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    console.log('[TransformersWebGPU] GPU Adapter:', { 
      vendor: this.gpuAdapter.info?.vendor,
      architecture: this.gpuAdapter.info?.architecture
    });

    this.gpuDevice = await this.gpuAdapter.requestDevice();
    console.log('[TransformersWebGPU] GPU device acquired');

    // 注意: text-to-imageパイプラインは未サポート
    // 将来的に実装される予定
    console.warn('[TransformersWebGPU] text-to-image pipeline not yet supported by Transformers.js');
    
    console.log('[TransformersWebGPU] Initialization complete (text-to-image not available)');
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!('gpu' in navigator)) {
        return false;
      }

      const adapter = await (navigator.gpu as GPU).requestAdapter();
      // text-to-imageサポートがないため、現時点では利用不可とする
      return false; // 将来的にサポートされたらtrueに変更
    } catch {
      return false;
    }
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: false, // text-to-image未サポート
      supportsImageProcessing: false,
      supportsOffline: true,
      maxModelSize: 2000,
      estimatedSpeed: 'fast',
    };
  }

  async generateImage(_params: GenerationParams): Promise<void> {
    throw new Error('text-to-image pipeline not yet supported by Transformers.js WebGPU backend');
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    return { used: 0, total: 0 };
  }

  async dispose(): Promise<void> {
    if (this.gpuDevice) {
      this.gpuDevice.destroy();
      this.gpuDevice = null;
    }

    this.gpuAdapter = null;
  }
}
