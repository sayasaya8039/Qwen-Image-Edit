export interface GPUKernelConfig {
  wgsl: string;
  entryPoint: string;
  workgroupSize: [number, number, number];
  bindings: {
    input?: GPUBuffer;
    output?: GPUBuffer;
    params?: GPUBuffer;
  };
}

export class WebGPUExecutor {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;

  async initialize(): Promise<void> {
    if (this.device) return;

    if (!navigator.gpu) {
      throw new Error('WebGPU not supported in this browser');
    }

    this.adapter = await navigator.gpu.requestAdapter();
    if (!this.adapter) {
      throw new Error('Failed to get GPU adapter');
    }

    this.device = await this.adapter.requestDevice();
  }

  async executeKernel(config: GPUKernelConfig, inputData: Uint8Array): Promise<Uint8Array> {
    if (!this.device) {
      await this.initialize();
    }

    const device = this.device!;

    // Create buffers
    const inputBuffer = device.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const outputBuffer = device.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const readBuffer = device.createBuffer({
      size: inputData.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Write input data
    device.queue.writeBuffer(inputBuffer, 0, inputData);

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: config.wgsl,
    });

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ],
    });

    // Create pipeline
    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: shaderModule,
        entryPoint: config.entryPoint,
      },
    });

    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
      ],
    });

    // Execute
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(...config.workgroupSize);
    passEncoder.end();

    // Copy output to read buffer
    commandEncoder.copyBufferToBuffer(
      outputBuffer,
      0,
      readBuffer,
      0,
      inputData.byteLength
    );

    device.queue.submit([commandEncoder.finish()]);

    // Read result
    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Uint8Array(readBuffer.getMappedRange()).slice();
    readBuffer.unmap();

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return result;
  }

  async processImage(
    imageData: ImageData,
    wgsl: string,
    entryPoint: string = 'main'
  ): Promise<ImageData> {
    const inputArray = new Uint8Array(imageData.data.buffer);
    
    const workgroupSize: [number, number, number] = [
      Math.ceil(imageData.width / 8),
      Math.ceil(imageData.height / 8),
      1,
    ];

    const outputArray = await this.executeKernel(
      {
        wgsl,
        entryPoint,
        workgroupSize,
        bindings: {},
      },
      inputArray
    );

    return new ImageData(
      new Uint8ClampedArray(outputArray),
      imageData.width,
      imageData.height
    );
  }

  destroy(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
  }
}

export const webgpuExecutor = new WebGPUExecutor();
