import { useEffect, useState } from "react";
import { useImageResize } from "../hooks/useImageResize";
import { generateTestImage, runBenchmark } from "../utils/benchmark";

export function BenchmarkPanel() {
	const { resizeImage, ready: wasmReady } = useImageResize();
	const [results, setResults] = useState<{
		size: string;
		jsTime: number;
		wasmTime: number | null;
		speedup: number | null;
	}[]>([]);
	const [running, setRunning] = useState(false);

	useEffect(() => {
		if (wasmReady && results.length === 0) {
			// 自動的にベンチマークを実行
			runBenchmarks();
		}
	}, [wasmReady]);

	const runBenchmarks = async () => {
		setRunning(true);
		const testCases = [
			{ name: "512x512 → 256x256", srcW: 512, srcH: 512, dstW: 256, dstH: 256 },
			{ name: "1024x1024 → 512x512", srcW: 1024, srcH: 1024, dstW: 512, dstH: 512 },
			{ name: "2048x1536 → 1024x768", srcW: 2048, srcH: 1536, dstW: 1024, dstH: 768 },
			{ name: "4096x3072 → 1024x768", srcW: 4096, srcH: 3072, dstW: 1024, dstH: 768 },
		];

		const newResults = [];
		for (const test of testCases) {
			const testImage = generateTestImage(test.srcW, test.srcH);
			const result = await runBenchmark(
				testImage,
				test.dstW,
				test.dstH,
				resizeImage,
				5 // 5回繰り返し
			);
			newResults.push({
				size: test.name,
				...result,
			});
		}

		setResults(newResults);
		setRunning(false);

		// コンソールに結果を出力
		console.log("=== WASM Benchmark Results ===");
		newResults.forEach((r) => {
			console.log(
				
			);
		});
	};

	if (!wasmReady) {
		return (
			<div className="p-4 bg-gray-100 rounded">
				<p>WASM読み込み中...</p>
			</div>
		);
	}

	return (
		<div className="p-4 bg-white border rounded shadow-sm">
			<h3 className="text-lg font-bold mb-3">⚡ WASM ベンチマーク結果</h3>

			{running && <p className="text-blue-600 mb-2">ベンチマーク実行中...</p>}

			{results.length > 0 && (
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="text-left py-2">サイズ</th>
							<th className="text-right py-2">JavaScript</th>
							<th className="text-right py-2">WASM</th>
							<th className="text-right py-2">高速化</th>
						</tr>
					</thead>
					<tbody>
						{results.map((r, i) => (
							<tr key={i} className="border-b">
								<td className="py-2">{r.size}</td>
								<td className="text-right">{r.jsTime.toFixed(2)}ms</td>
								<td className="text-right text-green-600 font-bold">
									{r.wasmTime?.toFixed(2) || "N/A"}ms
								</td>
								<td className="text-right text-blue-600 font-bold">
									{r.speedup?.toFixed(2) || "N/A"}x
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			<button
				onClick={runBenchmarks}
				disabled={running}
				className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
			>
				再実行
			</button>
		</div>
	);
}
