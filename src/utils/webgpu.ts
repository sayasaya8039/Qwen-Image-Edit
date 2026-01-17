/**
 * WebGPU検出・機能確認ユーティリティ
 * HipScript統合のための基盤モジュール
 */

export interface GPUCapabilities {
  supported: boolean;
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  limits: GPUSupportedLimits | null;
  features: GPUSupportedFeatures | null;
}

let cachedCapabilities: GPUCapabilities | null = null;

/**
 * WebGPU対応を検出
 */
export async function detectWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    console.warn('[WebGPU] Not supported in this browser');
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('[WebGPU] No adapter available');
      return false;
    }
    return true;
  } catch (error) {
    console.error('[WebGPU] Detection failed:', error);
    return false;
  }
}

/**
 * GPU機能情報を取得（キャッシュ付き）
 */
export async function getGPUCapabilities(): Promise<GPUCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  if (!navigator.gpu) {
    cachedCapabilities = {
      supported: false,
      adapter: null,
      device: null,
      limits: null,
      features: null,
    };
    return cachedCapabilities;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      cachedCapabilities = {
        supported: false,
        adapter: null,
        device: null,
        limits: null,
        features: null,
      };
      return cachedCapabilities;
    }

    const device = await adapter.requestDevice();

    cachedCapabilities = {
      supported: true,
      adapter,
      device,
      limits: adapter.limits,
      features: adapter.features,
    };

    console.log('[WebGPU] Initialized successfully', {
      maxTextureSize: adapter.limits.maxTextureDimension2D,
      maxBufferSize: adapter.limits.maxStorageBufferBindingSize,
    });

    return cachedCapabilities;
  } catch (error) {
    console.error('[WebGPU] Failed to get capabilities:', error);
    cachedCapabilities = {
      supported: false,
      adapter: null,
      device: null,
      limits: null,
      features: null,
    };
    return cachedCapabilities;
  }
}

/**
 * WebGPU利用可能かどうかを同期的に確認
 * （初回は非同期でgetGPUCapabilities()を呼ぶ必要あり）
 */
export function isWebGPUAvailable(): boolean {
  return cachedCapabilities?.supported ?? false;
}

/**
 * GPUデバイスをクリーンアップ
 */
export function cleanupGPU(): void {
  if (cachedCapabilities?.device) {
    cachedCapabilities.device.destroy();
    cachedCapabilities = null;
    console.log('[WebGPU] Device cleaned up');
  }
}