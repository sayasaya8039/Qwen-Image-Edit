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
  private wasmAvailable = false;
  private readonly wasmUrl = '/wasm/image-model.wasm';
  private initialized = false;
  private warnedUnavailable = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[CustomWasmWebGPU] Initializing...');

      // WebGPU初期化
      if (!('gpu' in navigator)) {
        throw new Error('WebGPU not supported');
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });
      
      if (!adapter) {
        throw new Error('WebGPU adapter not available');
      }

      this.device = await adapter.requestDevice();
      console.log('[CustomWasmWebGPU] WebGPU device acquired');

      // Wasmモジュールはオプション（なくても動作する）
      try {
        const response = await fetch(this.wasmUrl);
        if (response.ok) {
          const wasmBuffer = await response.arrayBuffer();
          if (this.isValidWasmBinary(wasmBuffer)) {
            this.wasmModule = await WebAssembly.compile(wasmBuffer);
            const imports = {
              env: {
                memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
              },
            };
            this.wasmInstance = await WebAssembly.instantiate(this.wasmModule, imports);
            console.log('[CustomWasmWebGPU] Wasm module loaded (optional)');
          }
        }
      } catch (error) {
        console.log('[CustomWasmWebGPU] Running without Wasm (GPU-only mode)');
      }

      this.initialized = true;
      console.log('[CustomWasmWebGPU] Initialization complete');
    } catch (error) {
      console.error('[CustomWasmWebGPU] Initialization failed:', error);
      throw error;
    }
  }


  async isAvailable(): Promise<boolean> {
    // WebGPUが利用可能かチェック
    if (!('gpu' in navigator)) {
      console.log('[CustomWasmWebGPU] WebGPU not available');
      return false;
    }

    // WebGPUアダプターが取得できるかテスト
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.log('[CustomWasmWebGPU] WebGPU adapter not available');
        return false;
      }
      console.log('[CustomWasmWebGPU] WebGPU is available ✅');
      return true;
    } catch (error) {
      console.log('[CustomWasmWebGPU] WebGPU check failed:', error);
      return false;
    }
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
      const seed = this.hashPrompt(params.prompt);
      const steps = params.steps || 4;

      console.log('[CustomWasmWebGPU] Generating with seed:', seed, 'from prompt:', params.prompt.substring(0, 50));

      // Uniformバッファを作成（シード値とステップ数）
      const uniformData = new Float32Array([seed, steps, 0, 0]);
      const uniformBuffer = this.device.createBuffer({
        size: uniformData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      // 出力バッファを作成
      const outputBuffer = this.device.createBuffer({
        size: width * height * 4 * 4, // vec4<f32> = 16 bytes per pixel
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      // バインドグループレイアウトを明示的に作成
      const bindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: 'storage',
            },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
              type: 'uniform',
            },
          },
        ],
      });

      // バインドグループを作成
      const bindGroup = this.device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: {
              buffer: outputBuffer,
            },
          },
          {
            binding: 1,
            resource: {
              buffer: uniformBuffer,
            },
          },
        ],
      });

      // パイプラインレイアウトを作成
      const pipelineLayout = this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });

      // コンピュートパイプラインを作成
      const computePipeline = await this.createComputePipeline(width, height, pipelineLayout);

      // コマンドエンコーダーでコンピュート処理を実行
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup); // ★ バインドグループを設定
      passEncoder.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);
      
      // GPU処理の完了を待つ
      await this.device.queue.onSubmittedWorkDone();

      const readBuffer = this.device.createBuffer({
        size: width * height * 4 * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      const copyEncoder = this.device.createCommandEncoder();
      copyEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, width * height * 4 * 4);
      this.device.queue.submit([copyEncoder.finish()]);
      
      // コピー完了を待つ
      await this.device.queue.onSubmittedWorkDone();

      await readBuffer.mapAsync(GPUMapMode.READ);
      const arrayBuffer = readBuffer.getMappedRange();
      
      // Float32からUint8Clampedに変換
      const float32Data = new Float32Array(arrayBuffer);
      const imageData = new Uint8ClampedArray(width * height * 4);
      
      console.log('[CustomWasmWebGPU] Buffer info:', {
        arrayBufferSize: arrayBuffer.byteLength,
        float32Length: float32Data.length,
        expectedLength: width * height * 4,
        firstValues: Array.from(float32Data.slice(0, 16))
      });
      
      for (let i = 0; i < width * height * 4; i++) {
        imageData[i] = Math.floor(float32Data[i] * 255);
      }
      
      console.log('[CustomWasmWebGPU] ImageData info:', {
        imageDataLength: imageData.length,
        firstValues: Array.from(imageData.slice(0, 16)),
        nonZeroCount: Array.from(imageData).filter(v => v > 0).length
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Failed to get canvas context');

      const imgData = new ImageData(imageData, width, height);
      ctx.putImageData(imgData, 0, 0);
      
      console.log('[CustomWasmWebGPU] Canvas info:', {
        width: canvas.width,
        height: canvas.height,
        dataUrl: canvas.toDataURL('image/png').substring(0, 100)
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          console.log('[CustomWasmWebGPU] toBlob callback:', { blob: blob ? { size: blob.size, type: blob.type } : null });
          
          readBuffer.unmap();
          outputBuffer.destroy();
          readBuffer.destroy();

          if (blob) {
            console.log('[CustomWasmWebGPU] Blob created successfully:', { size: blob.size });
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

  private async createComputePipeline(
    width: number, 
    height: number,
    pipelineLayout: GPUPipelineLayout
  ): Promise<GPUComputePipeline> {
    if (!this.device) throw new Error('Device not initialized');

    const shaderCode = `
      @group(0) @binding(0) var<storage, read_write> output: array<vec4<f32>>;
      @group(0) @binding(1) var<uniform> uniforms: vec4<f32>; // seed, steps, unused, unused

      // ノイズ生成関数（プロンプトベース）
      fn hash(p: vec2<f32>) -> f32 {
        let seed = uniforms.x;
        var h = dot(p, vec2<f32>(127.1, 311.7)) + seed;
        return fract(sin(h) * 43758.5453123);
      }

      fn noise(p: vec2<f32>) -> f32 {
        let i = floor(p);
        let f = fract(p);
        let u = f * f * (3.0 - 2.0 * f);
        
        return mix(
          mix(hash(i + vec2<f32>(0.0, 0.0)), hash(i + vec2<f32>(1.0, 0.0)), u.x),
          mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), u.x),
          u.y
        );
      }

      fn fbm(p: vec2<f32>) -> f32 {
        var value = 0.0;
        var amplitude = 0.5;
        var frequency = 1.0;
        var pp = p;
        
        for (var i = 0; i < 6; i = i + 1) {
          value = value + amplitude * noise(pp * frequency);
          frequency = frequency * 2.0;
          amplitude = amplitude * 0.5;
        }
        
        return value;
      }

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let width = ${width}u;
        let height = ${height}u;
        let index = global_id.y * width + global_id.x;
        
        if (global_id.x < width && global_id.y < height) {
          let x = f32(global_id.x) / f32(width);
          let y = f32(global_id.y) / f32(height);
          let pos = vec2<f32>(x, y) * 8.0;
          
          // プロンプトベースのノイズ生成
          let seed = uniforms.x;
          let n1 = fbm(pos + vec2<f32>(seed * 0.1, 0.0));
          let n2 = fbm(pos + vec2<f32>(0.0, seed * 0.1));
          let n3 = fbm(pos + vec2<f32>(seed * 0.05));
          
          // 色の合成（プロンプトハッシュに基づく）
          let hue = fract(seed * 0.01);
          let r = clamp(n1 * 0.8 + 0.2 + hue * 0.3, 0.0, 1.0);
          let g = clamp(n2 * 0.8 + 0.2 + (1.0 - hue) * 0.3, 0.0, 1.0);
          let b = clamp(n3 * 0.8 + 0.2 + abs(0.5 - hue) * 0.3, 0.0, 1.0);
          
          output[index] = vec4<f32>(r, g, b, 1.0);
        }
      }
    `;

    const shaderModule = this.device.createShaderModule({
      code: shaderCode,
    });

    return this.device.createComputePipeline({
      layout: pipelineLayout,
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
  private hashPrompt(prompt: string): number {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 10000;
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

  private async isWasmBinaryAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.wasmUrl);
      if (!response.ok) return false;
      const buffer = await response.arrayBuffer();
      return this.isValidWasmBinary(buffer);
    } catch {
      return false;
    }
  }

  private isValidWasmBinary(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 4) return false;
    const magic = new Uint8Array(buffer.slice(0, 4));
    return magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d;
  }
}
