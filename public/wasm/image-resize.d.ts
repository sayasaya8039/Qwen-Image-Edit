/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * assembly/image-resize/resizeImageBilinear
 * @param srcWidth `i32`
 * @param srcHeight `i32`
 * @param dstWidth `i32`
 * @param dstHeight `i32`
 * @param srcDataPtr `usize`
 * @param dstDataPtr `usize`
 */
export declare function resizeImageBilinear(srcWidth: number, srcHeight: number, dstWidth: number, dstHeight: number, srcDataPtr: number, dstDataPtr: number): void;
