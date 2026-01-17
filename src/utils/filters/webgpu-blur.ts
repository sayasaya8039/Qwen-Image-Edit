// WebGPU Gaussian Blur Implementation
import verticalShader from './shaders/gaussian-vertical.wgsl?raw';
import horizontalShader from './shaders/gaussian-horizontal.wgsl?raw';

export interface WebGPUBlurOptions {
  radius: number;
  sigma?: number;
}

// Calculate 1D Gaussian kernel
function calculateGaussianKernel(radius: number, sigma: number): Float32Array {
  const kernelSize = radius * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  let sum = 0;

  for (let i = 0; i &lt; kernelSize; i++) {
    const x = i - radius;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel[i] = value;
    sum += value;
  }

  // Normalize
  for (let i = 0; i &lt; kernelSize; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}
export async function applyWebGPUGaussianBlur(
  imageData: ImageData,
  options: WebGPUBlurOptions
): Promise&lt;ImageData> {
  const { width, height, data } = imageData;
  const { radius, sigma = radius / 3 } = options;

  // WebGPU availability check
  if (\!navigator.gpu) {
    throw new Error('WebGPU is not supported in this browser');
  }

  // Get adapter and device
  const adapter = await navigator.gpu.requestAdapter();
  if (\!adapter) {
    throw new Error('Failed to get GPU adapter');
  }

  const device = await adapter.requestDevice();

  try {
    // Calculate Gaussian kernel
    const kernel = calculateGaussianKernel(radius, sigma);
    const kernelSize = kernel.length;

    // Convert ImageData to Float32Array (RGBA normalized to 0-1)
    const pixelCount = width * height;
    const inputBuffer = new Float32Array(pixelCount * 4);
    for (let i = 0; i &lt; pixelCount; i++) {
      inputBuffer[i * 4 + 0] = data[i * 4 + 0] / 255;
      inputBuffer[i * 4 + 1] = data[i * 4 + 1] / 255;
      inputBuffer[i * 4 + 2] = data[i * 4 + 2] / 255;
      inputBuffer[i * 4 + 3] = data[i * 4 + 3] / 255;
    }

    // Create GPU buffers
    const inputGPUBuffer = device.createBuffer({
      size: inputBuffer.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const intermediateGPUBuffer = device.createBuffer({
      size: inputBuffer.byteLength,
      usage: GPUBufferUsage.STORAGE,
    });

    const outputGPUBuffer = device.createBuffer({
      size: inputBuffer.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const kernelGPUBuffer = device.createBuffer({
      size: kernel.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const imageSizeBuffer = device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const kernelSizeBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const readbackBuffer = device.createBuffer({
      size: inputBuffer.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Upload data to GPU
    device.queue.writeBuffer(inputGPUBuffer, 0, inputBuffer);
    device.queue.writeBuffer(kernelGPUBuffer, 0, kernel);
    device.queue.writeBuffer(imageSizeBuffer, 0, new Uint32Array([width, height]));
    device.queue.writeBuffer(kernelSizeBuffer, 0, new Uint32Array([kernelSize]));
    // Create shader modules
    const verticalShaderModule = device.createShaderModule({
      code: verticalShader,
    });

    const horizontalShaderModule = device.createShaderModule({
      code: horizontalShader,
    });

    // Create compute pipelines
    const verticalPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: verticalShaderModule,
        entryPoint: 'main',
      },
    });

    const horizontalPipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: horizontalShaderModule,
        entryPoint: 'main',
      },
    });

    // Create bind groups
    const verticalBindGroup = device.createBindGroup({
      layout: verticalPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputGPUBuffer } },
        { binding: 1, resource: { buffer: intermediateGPUBuffer } },
        { binding: 2, resource: { buffer: imageSizeBuffer } },
        { binding: 3, resource: { buffer: kernelGPUBuffer } },
        { binding: 4, resource: { buffer: kernelSizeBuffer } },
      ],
    });

    const horizontalBindGroup = device.createBindGroup({
      layout: horizontalPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: intermediateGPUBuffer } },
        { binding: 1, resource: { buffer: outputGPUBuffer } },
        { binding: 2, resource: { buffer: imageSizeBuffer } },
        { binding: 3, resource: { buffer: kernelGPUBuffer } },
        { binding: 4, resource: { buffer: kernelSizeBuffer } },
      ],
    });
    // Create command encoder
    const commandEncoder = device.createCommandEncoder();

    // Vertical blur pass
    const verticalPass = commandEncoder.beginComputePass();
    verticalPass.setPipeline(verticalPipeline);
    verticalPass.setBindGroup(0, verticalBindGroup);
    const workgroupsX = Math.ceil(width / 8);
    const workgroupsY = Math.ceil(height / 8);
    verticalPass.dispatchWorkgroups(workgroupsX, workgroupsY);
    verticalPass.end();

    // Horizontal blur pass
    const horizontalPass = commandEncoder.beginComputePass();
    horizontalPass.setPipeline(horizontalPipeline);
    horizontalPass.setBindGroup(0, horizontalBindGroup);
    horizontalPass.dispatchWorkgroups(workgroupsX, workgroupsY);
    horizontalPass.end();

    // Copy result to readback buffer
    commandEncoder.copyBufferToBuffer(
      outputGPUBuffer,
      0,
      readbackBuffer,
      0,
      inputBuffer.byteLength
    );

    // Submit commands
    device.queue.submit([commandEncoder.finish()]);

    // Read back results
    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const resultBuffer = new Float32Array(readbackBuffer.getMappedRange());

    // Convert back to ImageData (denormalize 0-1 to 0-255)
    const resultData = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0; i &lt; pixelCount; i++) {
      resultData[i * 4 + 0] = Math.round(resultBuffer[i * 4 + 0] * 255);
      resultData[i * 4 + 1] = Math.round(resultBuffer[i * 4 + 1] * 255);
      resultData[i * 4 + 2] = Math.round(resultBuffer[i * 4 + 2] * 255);
      resultData[i * 4 + 3] = Math.round(resultBuffer[i * 4 + 3] * 255);
    }

    readbackBuffer.unmap();

    return new ImageData(resultData, width, height);
  } catch (error) {
    throw new Error('WebGPU blur failed: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    device.destroy();
  }
}