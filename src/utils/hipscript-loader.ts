/**
 * HipScriptローダー（実験的機能）
 * CUDA/HIPコードをWebGPU経由で実行するためのラッパー
 */

import { getGPUCapabilities, isWebGPUAvailable } from './webgpu';

export interface HipScriptModule {
  // HipScriptの基本API（将来的に拡張）
  initialized: boolean;
  execute: (kernelName: string, params: unknown) => Promise<unknown>;
}

let hipScriptModule: HipScriptModule | null = null;
let loadAttempted = false;

/**
 * HipScriptを動的にロード（CDN経由）
 * 注意: 2025年1月時点でHipScriptは実験的な技術のため、
 * この実装は将来的なAPIに基づくプレースホルダーです。
 */
export async function loadHipScript(): Promise<HipScriptModule | null> {
  // 既にロード済み
  if (hipScriptModule) {
    return hipScriptModule;
  }

  // ロード試行済みで失敗している場合
  if (loadAttempted) {
    return null;
  }

  loadAttempted = true;

  // WebGPU対応確認
  const capabilities = await getGPUCapabilities();
  if (!capabilities.supported) {
    console.warn('[HipScript] WebGPU not supported, cannot load HipScript');
    return null;
  }

  try {
    console.log('[HipScript] Loading (experimental)...');

    // TODO: 実際のHipScript統合実装
    // 現時点ではプレースホルダー
    // 将来的には以下のようなロード処理を実装：
    // const module = await import('hipscript-wasm');
    // await module.init();

    // プレースホルダー実装
    hipScriptModule = {
      initialized: true,
      execute: async (kernelName: string, params: unknown) => {
        console.warn('[HipScript] Placeholder execution:', kernelName, params);
        throw new Error('HipScript not yet integrated');
      },
    };

    console.log('[HipScript] Loaded successfully (placeholder mode)');
    return hipScriptModule;
  } catch (error) {
    console.error('[HipScript] Failed to load:', error);
    return null;
  }
}

/**
 * HipScriptが利用可能かどうかを確認
 */
export function isHipScriptAvailable(): boolean {
  return hipScriptModule?.initialized ?? false;
}

/**
 * HipScriptモジュールを取得
 */
export function getHipScriptModule(): HipScriptModule | null {
  return hipScriptModule;
}

/**
 * HipScriptをクリーンアップ
 */
export function cleanupHipScript(): void {
  hipScriptModule = null;
  loadAttempted = false;
  console.log('[HipScript] Cleaned up');
}