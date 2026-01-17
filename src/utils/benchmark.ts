// ベンチマーク用ユーティリティ

/**
 * JavaScript版の画像リサイズ（Bilinear補間）
 */
export function resizeImageJS(
  imageData: ImageData,
  newWidth: number,
  newHeight: number
): ImageData {
  const { width: srcWidth, height: srcHeight, data: srcData } = imageData;
  const dstData = new Uint8ClampedArray(newWidth * newHeight * 4);

  const xRatio = srcWidth / newWidth;
  const yRatio = srcHeight / newHeight;

  for (let dstY = 0; dstY < newHeight; dstY++) {
    for (let dstX = 0; dstX < newWidth; dstX++) {
      const srcX = dstX * xRatio;
      const srcY = dstY * yRatio;

      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const y1 = Math.min(y0 + 1, srcHeight - 1);

      const dx = srcX - x0;
      const dy = srcY - y0;

      for (let c = 0; c < 4; c++) {
        const i00 = (y0 * srcWidth + x0) * 4 + c;
        const i01 = (y0 * srcWidth + x1) * 4 + c;
        const i10 = (y1 * srcWidth + x0) * 4 + c;
        const i11 = (y1 * srcWidth + x1) * 4 + c;

        const v00 = srcData[i00];
        const v01 = srcData[i01];
        const v10 = srcData[i10];
        const v11 = srcData[i11];

        const v0 = v00 * (1 - dx) + v01 * dx;
        const v1 = v10 * (1 - dx) + v11 * dx;
        const v = v0 * (1 - dy) + v1 * dy;

        dstData[(dstY * newWidth + dstX) * 4 + c] = Math.round(v);
      }
    }
  }

  return new ImageData(dstData, newWidth, newHeight);
}

/**
 * ベンチマークを実行
 */
export async function runBenchmark(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
  wasmResizeFunc: ((data: ImageData, w: number, h: number) => ImageData | null) | null,
  iterations: number = 10
): Promise<{ jsTime: number; wasmTime: number | null; speedup: number | null }> {
  // JavaScript版ベンチマーク
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    resizeImageJS(imageData, targetWidth, targetHeight);
  }
  const jsEnd = performance.now();
  const jsTime = (jsEnd - jsStart) / iterations;

  // WASM版ベンチマーク
  let wasmTime: number | null = null;
  let speedup: number | null = null;

  if (wasmResizeFunc) {
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      wasmResizeFunc(imageData, targetWidth, targetHeight);
    }
    const wasmEnd = performance.now();
    wasmTime = (wasmEnd - wasmStart) / iterations;
    speedup = jsTime / wasmTime;
  }

  return { jsTime, wasmTime, speedup };
}

/**
 * テスト用の画像データを生成
 */
export function generateTestImage(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = (x / width) * 255; // R
      data[i + 1] = (y / height) * 255; // G
      data[i + 2] = 128; // B
      data[i + 3] = 255; // A
    }
  }
  return new ImageData(data, width, height);
}
