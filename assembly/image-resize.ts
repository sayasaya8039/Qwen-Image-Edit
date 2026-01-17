// 画像リサイズWASMモジュール
// Bilinear補間を使用した高速リサイズ

export function resizeImageBilinear(
  srcWidth: i32,
  srcHeight: i32,
  dstWidth: i32,
  dstHeight: i32,
  srcDataPtr: usize,
  dstDataPtr: usize
): void {
  const xRatio: f32 = f32(srcWidth) / f32(dstWidth);
  const yRatio: f32 = f32(srcHeight) / f32(dstHeight);

  for (let dstY: i32 = 0; dstY < dstHeight; dstY++) {
    for (let dstX: i32 = 0; dstX < dstWidth; dstX++) {
      const srcX: f32 = f32(dstX) * xRatio;
      const srcY: f32 = f32(dstY) * yRatio;

      const srcXInt: i32 = i32(srcX);
      const srcYInt: i32 = i32(srcY);
      const srcXFrac: f32 = srcX - f32(srcXInt);
      const srcYFrac: f32 = srcY - f32(srcYInt);

      const x1: i32 = srcXInt;
      const y1: i32 = srcYInt;
      const x2: i32 = min(srcXInt + 1, srcWidth - 1);
      const y2: i32 = min(srcYInt + 1, srcHeight - 1);

      const idx11: usize = srcDataPtr + usize((y1 * srcWidth + x1) * 4);
      const idx21: usize = srcDataPtr + usize((y1 * srcWidth + x2) * 4);
      const idx12: usize = srcDataPtr + usize((y2 * srcWidth + x1) * 4);
      const idx22: usize = srcDataPtr + usize((y2 * srcWidth + x2) * 4);

      const dstIdx: usize = dstDataPtr + usize((dstY * dstWidth + dstX) * 4);

      for (let channel: i32 = 0; channel < 4; channel++) {
        const p11: f32 = f32(load<u8>(idx11 + usize(channel)));
        const p21: f32 = f32(load<u8>(idx21 + usize(channel)));
        const p12: f32 = f32(load<u8>(idx12 + usize(channel)));
        const p22: f32 = f32(load<u8>(idx22 + usize(channel)));

        const pX1: f32 = p11 * (1.0 - srcXFrac) + p21 * srcXFrac;
        const pX2: f32 = p12 * (1.0 - srcXFrac) + p22 * srcXFrac;
        const pXY: f32 = pX1 * (1.0 - srcYFrac) + pX2 * srcYFrac;

        store<u8>(dstIdx + usize(channel), u8(pXY));
      }
    }
  }
}

function min(a: i32, b: i32): i32 {
  return a < b ? a : b;
}
