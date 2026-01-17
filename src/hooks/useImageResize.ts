import { useEffect, useRef, useState } from "react";

interface ImageResizeWasm {
	resizeImageBilinear(
		srcWidth: number,
		srcHeight: number,
		dstWidth: number,
		dstHeight: number,
		srcDataPtr: number,
		dstDataPtr: number,
	): void;
	memory: WebAssembly.Memory;
}

export function useImageResize() {
	const [wasm, setWasm] = useState<ImageResizeWasm | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const wasmRef = useRef<ImageResizeWasm | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadWasm() {
			try {
				const response = await fetch("/wasm/image-resize.wasm");
				if (!response.ok) {
					throw new Error(`Failed to fetch WASM: ${response.statusText}`);
				}

				const buffer = await response.arrayBuffer();
				const module = await WebAssembly.compile(buffer);
				const instance = await WebAssembly.instantiate(module, {});

				if (cancelled) return;

				const wasmModule = {
					resizeImageBilinear:
						instance.exports.resizeImageBilinear as ImageResizeWasm["resizeImageBilinear"],
					memory: instance.exports.memory as WebAssembly.Memory,
				};

				wasmRef.current = wasmModule;
				setWasm(wasmModule);
				setLoading(false);
			} catch (err) {
				if (cancelled) return;
				console.error("Failed to load WASM:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
				setLoading(false);
			}
		}

		loadWasm();

		return () => {
			cancelled = true;
		};
	}, []);

	const resizeImage = (
		srcImageData: ImageData,
		dstWidth: number,
		dstHeight: number,
	): ImageData | null => {
		if (!wasm) {
			console.error("WASM not loaded");
			return null;
		}

		try {
			const srcWidth = srcImageData.width;
			const srcHeight = srcImageData.height;
			const srcData = srcImageData.data;

			// メモリ確保
			const srcSize = srcWidth * srcHeight * 4;
			const dstSize = dstWidth * dstHeight * 4;
			const totalSize = srcSize + dstSize;

			// メモリが足りない場合は拡張
			const pages = Math.ceil(totalSize / 65536);
			const currentPages = wasm.memory.buffer.byteLength / 65536;
			if (pages > currentPages) {
				wasm.memory.grow(pages - currentPages);
			}

			// 元画像データをWASMメモリにコピー
			const srcPtr = 0;
			const dstPtr = srcSize;
			const memoryView = new Uint8Array(wasm.memory.buffer);
			memoryView.set(srcData, srcPtr);

			// WASMでリサイズ実行
			wasm.resizeImageBilinear(
				srcWidth,
				srcHeight,
				dstWidth,
				dstHeight,
				srcPtr,
				dstPtr,
			);

			// 結果を取得
			const dstData = new Uint8ClampedArray(
				wasm.memory.buffer,
				dstPtr,
				dstSize,
			);
			const result = new ImageData(
				new Uint8ClampedArray(dstData),
				dstWidth,
				dstHeight,
			);

			return result;
		} catch (err) {
			console.error("Resize error:", err);
			return null;
		}
	};

	return { resizeImage, loading, error, ready: !!wasm };
}
