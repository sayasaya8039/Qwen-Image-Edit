// SD-Turbo backend using web-txt2img
import type {
  BackendExecutor,
  BackendType,
  BackendCapabilities,
  GenerationParams,
  MemoryInfo,
} from './types';

// web-txt2imgはWorkerを使うため、動的インポート
let Txt2ImgWorkerClient: any = null;

export class SDTurboBackend implements BackendExecutor {
  readonly name = 'SD-Turbo (web-txt2img)';
  readonly type: BackendType = 'sd-turbo' as BackendType;

  private client: any = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[SDTurbo] Initializing...');

      // 動的インポート（Worker対応）
      const module = await import('web-txt2img');
      Txt2ImgWorkerClient = module.Txt2ImgWorkerClient;

      // SD-Turboクライアント作成
      this.client = new Txt2ImgWorkerClient({
        model: 'sd-turbo', // SD-Turboを指定
        device: 'webgpu',
      });

      // 進捗ハンドラー登録
      this.client.addEventListener('loadstart', () => {
        console.log('[SDTurbo] Model loading started...');
      });

      this.client.addEventListener('progress', (event: any) => {
        console.log(`[SDTurbo] Loading progress: ${event.detail.progress.toFixed(1)}%`);
      });

      this.client.addEventListener('loadend', () => {
        console.log('[SDTurbo] Model loaded successfully');
      });

      // モデル初期化（最初の生成時に自動ロード）
      await this.client.load();

      this.initialized = true;
      console.log('[SDTurbo] Initialization complete');
    } catch (error) {
      console.error('[SDTurbo] Initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    // WebGPUが利用可能かチェック
    if (!('gpu' in navigator)) {
      console.log('[SDTurbo] WebGPU not available');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.log('[SDTurbo] WebGPU adapter not available');
        return false;
      }
      console.log('[SDTurbo] WebGPU is available OK');
      return true;
    } catch (error) {
      console.log('[SDTurbo] WebGPU check failed:', error);
      return false;
    }
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: false,
      supportsOffline: true,
      maxModelSize: 1500, // SD-Turboは約1.5GB
      estimatedSpeed: 'very-fast', // Turboモデルは高速
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized || !this.client) {
      throw new Error('Backend not initialized');
    }

    console.log('[SDTurbo] Generating image...', params);

    try {
      const width = params.width || 512;
      const height = params.height || 512;
      const seed = params.seed !== undefined ? params.seed : Math.floor(Math.random() * 2147483647);

      // SD-Turboで画像生成
      const result = await this.client.generate({
        prompt: params.prompt,
        width,
        height,
        seed,
        num_inference_steps: 1, // Turboは1ステップで高速生成
      });

      // 結果からBlobを取得
      if (!result || !result.blob) {
        throw new Error('No image generated');
      }

      console.log('[SDTurbo] Image generated successfully:', {
        size: result.blob.size,
        type: result.blob.type,
      });

      return result.blob;
    } catch (error) {
      console.error('[SDTurbo] Generation failed:', error);
      throw error;
    }
  }

  async processImage(input: ImageData, operation: string): Promise<ImageData> {
    throw new Error('Image processing not supported');
  }

  async dispose(): Promise<void> {
    if (this.client) {
      await this.client.dispose?.();
      this.client = null;
    }
    this.initialized = false;
    console.log('[SDTurbo] Disposed');
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
      available: 3000,
      peak: 0,
    };
  }
}