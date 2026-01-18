// Cloud APIバックエンド実装（Hugging Face Inference API）
import type { BackendExecutor, BackendCapabilities, BackendType, GenerationParams, MemoryInfo } from './types';

export class CloudBackend implements BackendExecutor {
  readonly name = 'Cloud API (Hugging Face)';
  readonly type: BackendType = 'cloud' as BackendType;
  
  private apiKey: string | null = null;
  private initialized = false;
  private readonly API_BASE = 'https://api-inference.huggingface.co/models';
  private readonly DEFAULT_MODEL = 'stabilityai/stable-diffusion-2-1';

  async init(): Promise<void> {
    if (this.initialized) return;

    // APIキーを環境変数またはlocalStorageから取得
    this.apiKey = import.meta.env.VITE_HF_API_KEY || 
                   localStorage.getItem('hf_api_key') ||
                   null;

    if (!this.apiKey) {
      console.warn('[CloudBackend] No API key found. Cloud backend will not work without API key.');
    } else {
      console.log('[CloudBackend] Initialized with API key');
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    // ネットワーク接続とAPIキーの存在確認
    if (!navigator.onLine) {
      return false;
    }

    // APIキー取得試行
    await this.init();
    return this.apiKey !== null;
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: false,
      supportsOffline: false, // Cloud APIはオフライン不可
      maxModelSize: 10000, // MB（サーバー側の制限）
      estimatedSpeed: 'medium', // ネットワーク依存
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.apiKey) {
      throw new Error('Cloud API key is not configured');
    }

    if (!navigator.onLine) {
      throw new Error('Network is offline');
    }

    console.log('[CloudBackend] Generating image with params:', params);

    try {
      const response = await fetch(`${this.API_BASE}/${this.DEFAULT_MODEL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: params.prompt,
          parameters: {
            negative_prompt: params.negativePrompt,
            num_inference_steps: params.steps || 25,
            guidance_scale: params.guidanceScale || 7.5,
            width: params.width || 512,
            height: params.height || 512,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        
        // レート制限エラー
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        // 認証エラー
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key or unauthorized access');
        }
        
        // モデルロード中エラー
        if (response.status === 503) {
          const estimatedTime = response.headers.get('estimated_time');
          throw new Error(`Model is loading. Estimated time: ${estimatedTime || 'unknown'}s`);
        }
        
        throw new Error(`API request failed: ${response.status} ${error}`);
      }

      // レスポンスをBlobとして取得
      const blob = await response.blob();
      
      // 画像形式確認
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid response type: ${blob.type}`);
      }

      console.log('[CloudBackend] Image generated successfully');
      return blob;
    } catch (error) {
      console.error('[CloudBackend] Generation failed:', error);
      
      // ネットワークエラーの場合は特別なメッセージ
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Failed to connect to Cloud API');
      }
      
      throw error;
    }
  }

  async dispose(): Promise<void> {
    this.apiKey = null;
    this.initialized = false;
    console.log('[CloudBackend] Disposed');
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    // Cloud APIはローカルメモリを使用しない
    return {
      used: 0,
      available: Number.MAX_SAFE_INTEGER, // サーバー側のメモリは無限と仮定
      peak: 0,
    };
  }
}
