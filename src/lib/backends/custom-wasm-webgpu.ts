// カスタム Wasm + WebGPU バックエンド
import type {
  BackendExecutor,
  BackendType,
  BackendCapabilities,
  GenerationParams,
  MemoryInfo,
} from './types';

export class CustomWasmWebGPUBackend implements BackendExecutor {
  readonly name = 'Custom Wasm+WebGPU';
  readonly type: BackendType = 'custom-wasm-webgpu' as BackendType;

  private device: GPUDevice | null = null;
  private wasmModule: WebAssembly.Module | null = null;
  private wasmInstance: WebAssembly.Instance | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[CustomWasmWebGPU] Initializing...');

      // WebGPU初期化
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: 'high-performance',
        });
        
        if (adapter) {
          this.device = await adapter.requestDevice();
          console.log('[CustomWasmWebGPU] WebGPU device acquired');
        }
      }

      // カスタムWasmモジュール読み込み
      const wasmUrl = '/wasm/image-model.wasm';
      
      try {
        const response = await fetch(wasmUrl);
        const wasmBuffer = await response.arrayBuffer();
        this.wasmModule = await WebAssembly.compile(wasmBuffer);
        
        const imports = {
          env: {
            memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
          },
        };
        
        this.wasmInstance = await WebAssembly.instantiate(this.wasmModule, imports);
        console.log('[CustomWasmWebGPU] Wasm module loaded');
      } catch (error) {
        console.warn('[CustomWasmWebGPU] Wasm module not found, running without Wasm');
      }

      this.initialized = true;
      console.log('[CustomWasmWebGPU] Initialization complete');
    } catch (error) {
      console.error('[CustomWasmWebGPU] Initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!('gpu' in navigator)) {
      console.log('[CustomWasmWebGPU] WebGPU not available');
      return false;
    }

    if (typeof WebAssembly === 'undefined') {
      console.log('[CustomWasmWebGPU] WebAssembly not available');
      return false;
    }

    return true;
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: true,
      supportsOffline: true,
      maxModelSize: 3000,
      estimatedSpeed: 'fast',
    };
  }

  async generateImage(params: GenerationParams): Promise<Blob> {
    if (!this.initialized || !this.device) {
      throw new Error('Backend not initialized');
    }

    console.log('[CustomWasmWebGPU] Generating image...', params);

    try {
      const width = params.width || 512;
      const height = params.height || 512;

      const computePipeline = await this.createComputePipeline(width, height);
      const outputBuffer = this.device.createBuffer({
        size: width * height * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);

      const readBuffer = this.device.createBuffer({
        size: width * height * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, width * height * 4);
      this.device.queue.submit([copyEncoder.finish()]);

      await readBuffer.mapAsync(GPUMapMode.READ);
      const arrayBuffer = readBuffer.getMappedRange();
      const imageData = new Uint8ClampedArray(arrayBuffer);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Failed to get canvas context');

      const imgData = new ImageData(imageData, width, height);
      ctx.putImageData(imgData, 0, 0);

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          readBuffer.unmap();
          outputBuffer.destroy();
          readBuffer.destroy();

          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      });
    } catch (error) {
      console.error('[CustomWasmWebGPU] Generation failed:', error);
      throw error;
    }
  }

  private async createComputePipeline(width: number, height: number): Promise<GPUComputePipeline> {
    if (!this.device) throw new Error('Device not initialized');

    const shaderCode = `
      @group(0) @binding(0) var<storage, read_write> output: array<vec4<f32>>;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let width = ${width}u;
        let height = ${height}u;
        let index = global_id.y * width + global_id.x;
        
        if (global_id.x < width && global_id.y < height) {
          let noise = fract(sin(f32(index) * 43758.5453));
          output[index] = vec4<f32>(noise, noise, noise, 1.0);
        }
      }
    `;

    const shaderModule = this.device.createShaderModule({
      code: shaderCode,
    });

    return this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });
  }

  async processImage(input: ImageData, operation: string): Promise<ImageData> {
    console.log('[CustomWasmWebGPU] Processing image:', operation);
    return input;
  }

  async dispose(): Promise<void> {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.wasmModule = null;
    this.wasmInstance = null;
    this.initialized = false;
    console.log('[CustomWasmWebGPU] Disposed');
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
