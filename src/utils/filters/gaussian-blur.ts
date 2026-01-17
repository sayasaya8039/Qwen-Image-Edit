/**
 * ガウシアンブラーフィルター
 * GPU加速（HipScript/WebGPU）とCPUフォールバック（Canvas API）の両対応
 */

import { isWebGPUAvailable, getGPUCapabilities } from '../webgpu';
import { isHipScriptAvailable, loadHipScript } from '../hipscript-loader';

export interface GaussianBlurOptions {
  radius: number; // ブラー半径（1-20）
  sigma?: number; // ガウス分布の標準偏差（自動計算可）
  useGPU?: boolean; // GPU使用を強制（デフォルト: 自動判定）
}

export interface BlurResult {
  imageData: ImageData;
  executionTime: number; // ミリ秒
  method: 'gpu-hipscript' | 'gpu-webgpu' | 'cpu-canvas';
}

/**
 * ガウシアンカーネルを生成
 */
function generateGaussianKernel(radius: number, sigma: number): Float32Array {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }

  // 正規化
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

/**
 * CPUフォールバック: Canvas APIを使用したガウシアンブラー
 */
async function applyCPUBlur(
  imageData: ImageData,
  options: GaussianBlurOptions
): Promise<BlurResult> {
  const startTime = performance.now();
  const { radius } = options;
  const sigma = options.sigma ?? radius / 3;

  const { width, height, data } = imageData;
  const kernel = generateGaussianKernel(radius, sigma);
  const output = new Uint8ClampedArray(data.length);

  // 水平方向のブラー
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      for (let kx = -radius; kx <= radius; kx++) {
        const px = Math.min(Math.max(x + kx, 0), width - 1);
        const idx = (y * width + px) * 4;
        const weight = kernel[kx + radius];

        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = r;
      output[outIdx + 1] = g;
      output[outIdx + 2] = b;
      output[outIdx + 3] = a;
    }
  }

  // 垂直方向のブラー
  const finalData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        const py = Math.min(Math.max(y + ky, 0), height - 1);
        const idx = (py * width + x) * 4;
        const weight = kernel[ky + radius];

        r += output[idx] * weight;
        g += output[idx + 1] * weight;
        b += output[idx + 2] * weight;
        a += output[idx + 3] * weight;
      }

      const outIdx = (y * width + x) * 4;
      finalData[outIdx] = r;
      finalData[outIdx + 1] = g;
      finalData[outIdx + 2] = b;
      finalData[outIdx + 3] = a;
    }
  }

  const executionTime = performance.now() - startTime;

  return {
    imageData: new ImageData(finalData, width, height),
    executionTime,
    method: 'cpu-canvas',
  };
}

/**
 * GPUフォールバック: WebGPU Compute Shaderを使用したガウシアンブラー
 * （HipScriptが利用不可の場合）
 */
async function applyWebGPUBlur(
  imageData: ImageData,
  options: GaussianBlurOptions
): Promise<BlurResult> {
  const startTime = performance.now();

  // TODO: 実際のWebGPU Compute Shader実装
  console.warn('[GaussianBlur] WebGPU blur not yet implemented, falling back to CPU');

  // 現時点ではCPUフォールバック
  return applyCPUBlur(imageData, options);
}

/**
 * HipScriptを使用したGPU加速ガウシアンブラー
 */
async function applyHipScriptBlur(
  imageData: ImageData,
  options: GaussianBlurOptions
): Promise<BlurResult> {
  const startTime = performance.now();

  // TODO: 実際のHipScript CUDA/HIP実装
  console.warn('[GaussianBlur] HipScript blur not yet implemented, falling back to CPU');

  // 現時点ではCPUフォールバック
  return applyCPUBlur(imageData, options);
}

/**
 * ガウシアンブラーを適用（自動的に最適な方法を選択）
 */
export async function applyGaussianBlur(
  imageData: ImageData,
  options: GaussianBlurOptions
): Promise<BlurResult> {
  const { useGPU } = options;

  // GPU使用を強制する場合、またはGPU利用可能な場合
  if (useGPU !== false) {
    // HipScript優先
    if (isHipScriptAvailable()) {
      console.log('[GaussianBlur] Using HipScript GPU acceleration');
      return applyHipScriptBlur(imageData, options);
    }

    // WebGPU次点
    if (isWebGPUAvailable()) {
      console.log('[GaussianBlur] Using WebGPU acceleration');
      return applyWebGPUBlur(imageData, options);
    }
  }

  // CPUフォールバック
  console.log('[GaussianBlur] Using CPU fallback');
  return applyCPUBlur(imageData, options);
}

/**
 * 初期化: WebGPU/HipScriptを事前ロード
 */
export async function initializeGPUBlur(): Promise<{
  webgpuAvailable: boolean;
  hipscriptAvailable: boolean;
}> {
  const webgpuAvailable = isWebGPUAvailable();
  
  // HipScriptをバックグラウンドでロード試行
  let hipscriptAvailable = false;
  if (webgpuAvailable) {
    const hipscript = await loadHipScript();
    hipscriptAvailable = hipscript !== null;
  }

  return { webgpuAvailable, hipscriptAvailable };
}