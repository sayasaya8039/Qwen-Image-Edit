// HipScript + CUDA バックエンド
import type {
  BackendExecutor,
  BackendType,
  BackendCapabilities,
  GenerationParams,
  MemoryInfo,
} from './types';

export class HipScriptCudaBackend implements BackendExecutor {
  readonly name = 'HipScript CUDA';
  readonly type: BackendType = 'hipscript-cuda' as BackendType;

  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;
  private cudaKernels: Map<string, Function> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[HipScriptCuda] Initializing...');

      // HipScript CUDAカーネルをコンパイル済みWasmとして読み込み
      const wasmUrl = '/wasm/cuda-kernels.wasm';
      
      try {
        const response = await fetch(wasmUrl);
        const wasmBuffer = await response.arrayBuffer();
        this.wasmModule = await WebAssembly.compile(wasmBuffer);
        
        const memory = new WebAssembly.Memory({ initial: 512, maximum: 1024 });
        
        const imports = {
          env: {
            memory,
            // CUDA APIエミュレーション
            cudaMalloc: this.cudaMalloc.bind(this),
            cudaMemcpy: this.cudaMemcpy.bind(this),
            cudaFree: this.cudaFree.bind(this),
            cudaLaunchKernel: this.cudaLaunchKernel.bind(this),
          },
        };
        
        this.wasmInstance = await WebAssembly.instantiate(this.wasmModule, imports);
        
        // エクスポートされたCUDAカーネルを登録
        const exports = this.wasmInstance.exports as any;
        if (exports.imageGenerationKernel) {
          this.cudaKernels.set('imageGeneration', exports.imageGenerationKernel);
        }
        if (exports.imageProcessingKernel) {
          this.cudaKernels.set('imageProcessing', exports.imageProcessingKernel);
        }
        
        console.log('[HipScriptCuda] CUDA kernels loaded:', Array.from(this.cudaKernels.keys()));
      } catch (error) {
        console.warn('[HipScriptCuda] Wasm module not found:', error);
        throw new Error('HipScript CUDA module not available');
      }

      this.initialized = true;
      console.log('[HipScriptCuda] Initialization complete');
    } catch (error) {
      console.error('[HipScriptCuda] Initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    // WebAssembly必須
    if (typeof WebAssembly === 'undefined') {
      console.log('[HipScriptCuda] WebAssembly not available');
      return false;
    }

    // HipScript CUDAカーネルの存在確認
    try {
      const response = await fetch('/wasm/cuda-kernels.wasm');
      return response.ok;
    } catch {
      console.log('[HipScriptCuda] CUDA kernels not found');
      return false;
    }
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: true,
      supportsOffline: true,
      maxModelSize: 4000, // 4GB
      estimatedSpeed: 'fast',
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized || !this.wasmInstance) {
      throw new Error('Backend not initialized');
    }

    console.log('[HipScriptCuda] Generating image...', params);

    const kernel = this.cudaKernels.get('imageGeneration');
    if (!kernel) {
      throw new Error('Image generation kernel not found');
    }

    try {
      const width = params.width || 512;
      const height = params.height || 512;
      const outputSize = width * height * 4; // RGBA

      // メモリ確保
      const memory = (this.wasmInstance.exports.memory as WebAssembly.Memory);
      const outputPtr = (this.wasmInstance.exports.malloc as Function)(outputSize);

      // CUDAカーネル実行
      const gridDim = { x: Math.ceil(width / 16), y: Math.ceil(height / 16), z: 1 };
      const blockDim = { x: 16, y: 16, z: 1 };

      kernel(
        outputPtr,
        width,
        height,
        params.steps || 4,
        this.hashPrompt(params.prompt),
        gridDim,
        blockDim
      );

      // 結果を読み取り
      const buffer = new Uint8Array(memory.buffer, outputPtr, outputSize);
      const imageData = new Uint8ClampedArray(buffer);

      // クリーンアップ
      (this.wasmInstance.exports.free as Function)(outputPtr);

      // Canvas → Blob
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Failed to get canvas context');

      const imgData = new ImageData(imageData, width, height);
      ctx.putImageData(imgData, 0, 0);

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
      console.error('[HipScriptCuda] Generation failed:', error);
      throw error;
    }
  }

  async processImage(input: ImageData, operation: string): Promise<ImageData> {
    console.log('[HipScriptCuda] Processing image:', operation);

    const kernel = this.cudaKernels.get('imageProcessing');
    if (!kernel) {
      console.warn('[HipScriptCuda] Image processing kernel not found');
      return input;
    }

    // CUDAカーネルで画像処理
    return input;
  }

  // CUDA APIエミュレーション
  private cudaMalloc(size: number): number {
    if (!this.wasmInstance) return 0;
    return (this.wasmInstance.exports.malloc as Function)(size);
  }

  private cudaMemcpy(dest: number, src: number, size: number, kind: number): void {
    if (!this.wasmInstance) return;
    const memory = (this.wasmInstance.exports.memory as WebAssembly.Memory);
    const srcView = new Uint8Array(memory.buffer, src, size);
    const destView = new Uint8Array(memory.buffer, dest, size);
    destView.set(srcView);
  }

  private cudaFree(ptr: number): void {
    if (!this.wasmInstance) return;
    (this.wasmInstance.exports.free as Function)(ptr);
  }

  private cudaLaunchKernel(
    kernel: Function,
    gridDim: { x: number; y: number; z: number },
    blockDim: { x: number; y: number; z: number },
    args: any[]
  ): void {
    kernel(...args, gridDim, blockDim);
  }

  private hashPrompt(prompt: string): number {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
      hash |= 0;
    }
    return hash >>> 0;
  }

  async dispose(): Promise<void> {
    this.cudaKernels.clear();
    this.wasmModule = null;
    this.wasmInstance = null;
    this.initialized = false;
    console.log('[HipScriptCuda] Disposed');
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
      available: 4000,
      peak: 0,
    };
  }
}
