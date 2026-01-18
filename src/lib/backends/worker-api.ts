import type {
  BackendExecutor,
  BackendType,
  BackendCapabilities,
  GenerationParams,
  MemoryInfo,
} from './types';

export class WorkerApiBackend implements BackendExecutor {
  readonly name = 'Worker API';
  readonly type: BackendType = 'worker-api' as BackendType;

  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const response = await fetch('/api/health', { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: false,
      supportsOffline: false,
      maxModelSize: 10000,
      estimatedSpeed: 'medium',
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized) {
      await this.init();
    }

    const formData = new FormData();
    formData.append('prompt', params.prompt);

    if (params.negativePrompt) {
      formData.append('negative_prompt', params.negativePrompt);
    }

    if (params.aspectRatio) {
      formData.append('aspect_ratio', params.aspectRatio);
    }

    if (params.resolution) {
      formData.append('resolution', String(params.resolution));
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message = payload?.message || `API request failed (${response.status})`;
      throw new Error(message);
    }

    const data = (await response.json()) as { image?: string };
    if (!data.image) {
      throw new Error('API response does not include image data');
    }

    return this.dataUrlToBlob(data.image);
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    return { used: 0, available: Number.MAX_SAFE_INTEGER, peak: 0 };
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const match = header.match(/data:(.*?);base64/);
    const mimeType = match?.[1] || 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }
}
