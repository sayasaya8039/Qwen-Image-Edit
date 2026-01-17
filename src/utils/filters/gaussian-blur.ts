import { applyWebGPUGaussianBlur, type WebGPUBlurOptions } from './webgpu-blur';

export interface GaussianBlurOptions {
  radius: number;
  sigma?: number;
  forceGPU?: boolean;
}

// CPU fallback implementation
function applyCPUGaussianBlur(
  imageData: ImageData,
  options: GaussianBlurOptions
): ImageData {
  const { width, height, data } = imageData;
  const { radius, sigma = radius / 3 } = options;

  const kernelSize = radius * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  let sum = 0;

  for (let i = 0; i &lt; kernelSize; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }

  for (let i = 0; i &lt; kernelSize; i++) {
    kernel[i] /= sum;
  }

  const temp = new Uint8ClampedArray(data.length);
  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y &lt; height; y++) {
    for (let x = 0; x &lt; width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let ky = -radius; ky &lt;= radius; ky++) {
        const sy = Math.max(0, Math.min(height - 1, y + ky));
        const idx = (sy * width + x) * 4;
        const weight = kernel[ky + radius];

        r += data[idx + 0] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
      }

      const outIdx = (y * width + x) * 4;
      temp[outIdx + 0] = r;
      temp[outIdx + 1] = g;
      temp[outIdx + 2] = b;
      temp[outIdx + 3] = a;
    }
  }

  for (let y = 0; y &lt; height; y++) {
    for (let x = 0; x &lt; width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let kx = -radius; kx &lt;= radius; kx++) {
        const sx = Math.max(0, Math.min(width - 1, x + kx));
        const idx = (y * width + sx) * 4;
        const weight = kernel[kx + radius];

        r += temp[idx + 0] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        a += temp[idx + 3] * weight;
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx + 0] = Math.round(r);
      output[outIdx + 1] = Math.round(g);
      output[outIdx + 2] = Math.round(b);
      output[outIdx + 3] = Math.round(a);
    }
  }

  return new ImageData(output, width, height);
}

export async function applyGaussianBlur(
  imageData: ImageData,
  options: GaussianBlurOptions
): Promise&lt;ImageData> {
  const useGPU = navigator.gpu &amp;&amp; !options.forceGPU === false;

  if (useGPU) {
    try {
      const webgpuOptions: WebGPUBlurOptions = {
        radius: options.radius,
        sigma: options.sigma,
      };
      return await applyWebGPUGaussianBlur(imageData, webgpuOptions);
    } catch (error) {
      console.warn('WebGPU blur failed, falling back to CPU:', error);
    }
  }

  return applyCPUGaussianBlur(imageData, options);
}

export class GaussianBlurFilter {
  async apply(
    imageData: ImageData,
    options: GaussianBlurOptions
  ): Promise&lt;ImageData> {
    return applyGaussianBlur(imageData, options);
  }
}