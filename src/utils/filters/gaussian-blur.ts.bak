/**
 * ガウシアンブラーフィルター
 * WebGPU compute shaderを使用した高速ガウシアンブラー実装
 */

export interface GaussianBlurOptions {
  radius: number;
  sigma?: number;
}

export class GaussianBlurFilter {
  private device: GPUDevice | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('No GPU adapter found');
    }

    this.device = await adapter.requestDevice();
    this.initialized = true;
  }

  async apply(
    imageData: ImageData,
    options: GaussianBlurOptions
  ): Promise<ImageData> {
    await this.initialize();
    if (!this.device) throw new Error('Device not initialized');

    const { radius, sigma = radius / 3 } = options;
    
    const kernelSize = radius * 2 + 1;
    const kernel = this.generateGaussianKernel(kernelSize, sigma);

    const tempData = await this.applyPass(imageData, kernel, true);
    const result = await this.applyPass(tempData, kernel, false);

    return result;
  }

  private generateGaussianKernel(size: number, sigma: number): Float32Array {
    const kernel = new Float32Array(size);
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      sum += kernel[i];
    }

    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  private async applyPass(
    imageData: ImageData,
    kernel: Float32Array,
    horizontal: boolean
  ): Promise<ImageData> {
    if (!this.device) throw new Error('Device not initialized');

    const { width, height, data } = imageData;

    const inputBuffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint8Array(inputBuffer.getMappedRange()).set(data);
    inputBuffer.unmap();

    const outputBuffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const kernelBuffer = this.device.createBuffer({
      size: kernel.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(kernelBuffer.getMappedRange()).set(kernel);
    kernelBuffer.unmap();

    const shaderModule = this.device.createShaderModule({
      code: this.getShaderCode(horizontal, kernel.length)
    });

    const pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: kernelBuffer } }
      ]
    });

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(
      Math.ceil(width / 8),
      Math.ceil(height / 8)
    );
    passEncoder.end();

    const readBuffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    commandEncoder.copyBufferToBuffer(
      outputBuffer,
      0,
      readBuffer,
      0,
      data.byteLength
    );

    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const resultData = new Uint8ClampedArray(
      readBuffer.getMappedRange()
    ).slice();
    readBuffer.unmap();

    inputBuffer.destroy();
    outputBuffer.destroy();
    kernelBuffer.destroy();
    readBuffer.destroy();

    return new ImageData(resultData, width, height);
  }

  private getShaderCode(horizontal: boolean, kernelSize: number): string {
    const direction = horizontal ? 'vec2<i32>(x, 0)' : 'vec2<i32>(0, y)';
    const kernelRadius = Math.floor(kernelSize / 2);
    
    return `
      @group(0) @binding(0) var<storage, read> input: array<vec4<f32>>;
      @group(0) @binding(1) var<storage, read_write> output: array<vec4<f32>>;
      @group(0) @binding(2) var<storage, read> kernel: array<f32>;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        let width = 1024u;
        let height = 1024u;
        let idx = id.y * width + id.x;

        if (id.x >= width || id.y >= height) {
          return;
        }

        var sum = vec4<f32>(0.0);
        let kernelRadius = ${kernelRadius};

        for (var i = -kernelRadius; i <= kernelRadius; i = i + 1) {
          let offset = ${direction.replace('x', 'i').replace('y', 'i')};
          let sampleIdx = clamp(
            i32(id.y) + offset.y,
            0,
            i32(height) - 1
          ) * i32(width) + clamp(
            i32(id.x) + offset.x,
            0,
            i32(width) - 1
          );
          
          sum = sum + input[sampleIdx] * kernel[i + kernelRadius];
        }

        output[idx] = sum;
      }
    `;
  }

  destroy() {
    this.device = null;
    this.pipeline = null;
    this.initialized = false;
  }
}
