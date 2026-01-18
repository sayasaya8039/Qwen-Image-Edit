// バックエンド管理フック
import { useState, useEffect, useCallback, useRef } from 'react';
import { BackendSelector } from '../lib/backends/selector';
import { FallbackEngine, type FallbackResult } from '../lib/backends/fallback';
import { MemoryManager } from '../lib/backends/memory-manager';
import { TransformersWasmBackend } from '../lib/backends/transformers-wasm';
import { TransformersWebGPUBackend } from '../lib/backends/transformers-webgpu';
import { CloudBackend } from '../lib/backends/cloud';
import { TransformersWebNNWasmBackend } from '../lib/backends/transformers-webnn-wasm';
import { CustomWasmWebGPUBackend } from '../lib/backends/custom-wasm-webgpu';
import { HipScriptCudaBackend } from '../lib/backends/hipscript-cuda';
import type { GenerationParams, BackendType } from '../lib/backends/types';

export interface BackendState {
  initialized: boolean;
  initializing: boolean;
  error: string | null;
  availableBackends: BackendType[];
  currentBackend: BackendType | null;
}

export interface GenerateOptions extends GenerationParams {
  preferOffline?: boolean;
  prioritizeSpeed?: boolean;
  preferredBackend?: string; // 'auto' or specific backend type
}

export function useBackend() {
  const [state, setState] = useState<BackendState>({
    initialized: false,
    initializing: false,
    error: null,
    availableBackends: [],
    currentBackend: null,
  });

  const selectorRef = useRef<BackendSelector | null>(null);
  const fallbackEngineRef = useRef<FallbackEngine | null>(null);
  const memoryManagerRef = useRef<MemoryManager | null>(null);

  // バックエンド初期化
  useEffect(() => {
    let mounted = true;

    const initBackends = async () => {
      if (state.initialized || state.initializing) return;

      setState(prev => ({ ...prev, initializing: true }));

      try {
        console.log('[useBackend] Initializing backends...');

        // BackendSelector作成
        const selector = new BackendSelector();
        selectorRef.current = selector;

        // バックエンド登録
        const wasmBackend = new TransformersWasmBackend();
        const webgpuBackend = new TransformersWebGPUBackend();
        const webnnWasmBackend = new TransformersWebNNWasmBackend();
        const customWasmWebGPUBackend = new CustomWasmWebGPUBackend();
        const hipScriptCudaBackend = new HipScriptCudaBackend();
        const cloudBackend = new CloudBackend();

        await Promise.allSettled([
          selector.registerBackend(wasmBackend),
          selector.registerBackend(webgpuBackend),
          selector.registerBackend(webnnWasmBackend),
          selector.registerBackend(customWasmWebGPUBackend),
          selector.registerBackend(hipScriptCudaBackend),
          selector.registerBackend(cloudBackend),
        ]);

        // 利用可能なバックエンド
        const available = selector.getAvailableTypes();

        if (available.length === 0) {
          throw new Error('No backends available');
        }

        // FallbackEngine作成
        const fallbackEngine = new FallbackEngine(selector.getBackendsMap());
        fallbackEngineRef.current = fallbackEngine;

        // MemoryManager作成
        const memoryManager = new MemoryManager({
          maxTotalMemory: 4096, // 4GB
          singleModelLimit: 2000, // 2GB
          reservedMemory: 512, // 512MB
        });
        memoryManagerRef.current = memoryManager;

        // バックエンド登録（現在は使用しない）
        // for (const backend of selector.getAllBackends()) {
        //   await memoryManager.registerBackend(backend);
        // }

        if (mounted) {
          setState({
            initialized: true,
            initializing: false,
            error: null,
            availableBackends: available,
            currentBackend: null,
          });

          console.log('[useBackend] Initialization complete:', available);
        }
      } catch (error) {
        console.error('[useBackend] Initialization failed:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            initializing: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      }
    };

    initBackends();

    return () => {
      mounted = false;
    };
  }, []);

  // 画像生成
  const generateImage = useCallback(async (
    options: GenerateOptions
  ): Promise<Blob> => {
    if (!state.initialized) {
      throw new Error('Backends not initialized');
    }

    const selector = selectorRef.current;
    const fallbackEngine = fallbackEngineRef.current;
    const memoryManager = memoryManagerRef.current;

    if (!selector || !fallbackEngine || !memoryManager) {
      throw new Error('Backend system not ready');
    }

    console.log('[useBackend] Generating image with options:', options);

    // 選択基準
    const criteria = {
      modelSize: 1000, // 1GB
      preferOffline: options.preferOffline ?? true,
      prioritizeSpeed: options.prioritizeSpeed ?? false,
      needsImageGeneration: true,
      needsImageProcessing: false,
    };

    // 手動選択バックエンドがある場合、それを最優先
    let priorityList: BackendType[];
    
    if (options.preferredBackend && options.preferredBackend !== 'auto') {
      const preferred = options.preferredBackend as BackendType;
      const allBackends = await selector.selectPriorityList(criteria);
      
      // 選択されたバックエンドを最優先、残りは通常の優先順位
      if (allBackends.includes(preferred)) {
        priorityList = [preferred, ...allBackends.filter(b => b !== preferred)];
        console.log('[useBackend] Using preferred backend:', preferred);
      } else {
        console.warn('[useBackend] Preferred backend not available:', preferred);
        priorityList = allBackends;
      }
    } else {
      // 自動選択
      priorityList = await selector.selectPriorityList(criteria);
    }

    if (priorityList.length === 0) {
      throw new Error('No suitable backends found');
    }

    console.log('[useBackend] Priority list:', priorityList);

    // フォールバック付きで実行
    const result: FallbackResult<Blob> = await fallbackEngine.executeWithFallback(
      priorityList,
      {
        prompt: options.prompt,
        negativePrompt: options.negativePrompt,
        width: options.width,
        height: options.height,
        steps: options.steps,
        guidanceScale: options.guidanceScale,
        seed: options.seed,
      }
    );

    if (!result.success || !result.result) {
      const errors = result.failedBackends.map(f => `${f.backend}: ${f.error}`).join(', ');
      throw new Error(`All backends failed: ${errors}`);
    }

    // 使用したバックエンドを記録
    setState(prev => ({
      ...prev,
      currentBackend: result.usedBackend || null,
    }));

    console.log('[useBackend] Image generated successfully with:', result.usedBackend);
    console.log('[useBackend] Fallback info:', {
      failedBackends: result.failedBackends.length,
      retries: result.retries,
    });

    return result.result;
  }, [state.initialized]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (memoryManagerRef.current) {
        memoryManagerRef.current.dispose?.();
      }
    };
  }, []);

  return {
    ...state,
    generateImage,
  };
}
