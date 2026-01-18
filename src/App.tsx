import { useCallback, useEffect, useState } from "react";
import { useImageResize } from "./hooks/useImageResize";
import { useBackend } from "./hooks/useBackend";
import { Header } from "./components/Header";
import { ImageCanvas } from "./components/ImageCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import type { EditMode, GenerationStatus, ImageFile, CudaProcessingConfig } from "./types";
import { BenchmarkPanel } from "./components/BenchmarkPanel";
import { CudaKernelEditor } from "./components/CudaKernelEditor";
import { imageProcessor } from "./utils/cuda/image-processor";

// バックエンド名を日本語表示に変換
function getBackendDisplayName(backend: string): string {
	const names: Record<string, string> = {
		local: "ローカル",
		huggingface: "HuggingFace",
		replicate: "Replicate",
		bagel: "BAGEL Space",
		zimage: "Z-Image Space",
		flux2: "FLUX.2 Space",
	};
	return names[backend] || backend || "クラウド";
}

interface ModelInfo {
	id: string;
	name: string;
	description: string;
	type: string;
	isDefault: boolean;
}

export default function App() {
	const [images, setImages] = useState<ImageFile[]>([]);
	const { resizeImage, ready: wasmReady, loading: wasmLoading } = useImageResize();
	const backend = useBackend();
	const [outputImage, setOutputImage] = useState<string | null>(null);
	const [outputVideo, setOutputVideo] = useState<string | null>(null);
	const [prompt, setPrompt] = useState("");
	const [negativePrompt, setNegativePrompt] = useState("");
	const [editMode, setEditMode] = useState<EditMode>("generate");
	const [selectedBackend, setSelectedBackend] = useState<string>("auto");
	const [aspectRatio, setAspectRatio] = useState("1:1");
	const [resolution, setResolution] = useState("1024");
	const [models, setModels] = useState<ModelInfo[]>([]);
	const [selectedModelId, setSelectedModelId] = useState<string>("");
	const [backendType, setBackendType] = useState<string>("");
	const [status, setStatus] = useState<GenerationStatus>({
		isProcessing: false,
		progress: 0,
		message: "準備完了",
	});
	const [cudaConfig, setCudaConfig] = useState<CudaProcessingConfig>({
		enabled: false,
		preprocessing: undefined,
		postprocessing: undefined,
	});

	// モデル一覧とバックエンド情報を取得
	useEffect(() => {
		const fetchData = async () => {
			try {
				// モデル一覧を取得
				const modelsRes = await fetch("/api/models");
				if (modelsRes.ok) {
					const data = await modelsRes.json();
					setModels(data.models || []);
					const defaultModel = data.models?.find((m: ModelInfo) => m.isDefault);
					if (defaultModel) {
						setSelectedModelId(defaultModel.id);
					} else if (data.models?.length > 0) {
						setSelectedModelId(data.models[0].id);
					}
				}

				// バックエンド情報を取得
				const healthRes = await fetch("/api/health");
				if (healthRes.ok) {
					const data = await healthRes.json();
					setBackendType(data.backend?.backend || "");
				}
			} catch (error) {
				console.error("Failed to fetch data:", error);
			}
		};
		fetchData();
	}, []);

	// 画像の追加（最大4枚）- WASM統合版
	const handleAddImage = useCallback(
		async (files: File[]) => {
			const newImages = await Promise.all(
				files.slice(0, 4 - images.length).map(async (file) => {
					let preview = URL.createObjectURL(file);

					// WASMが利用可能で、画像が大きい場合はリサイズしてプレビューを最適化
					if (wasmReady && resizeImage) {
						try {
							const img = new Image();
							img.src = preview;
							await new Promise((resolve) => {
								img.onload = resolve;
							});

							// 1024px以上の画像はリサイズ（プレビュー最適化）
							const maxDimension = 1024;
							if (img.width > maxDimension || img.height > maxDimension) {
								const canvas = document.createElement("canvas");
								const ctx = canvas.getContext("2d");
								if (ctx) {
									canvas.width = img.width;
									canvas.height = img.height;
									ctx.drawImage(img, 0, 0);
									const imageData = ctx.getImageData(0, 0, img.width, img.height);

									// アスペクト比を維持してリサイズ
									const scale = maxDimension / Math.max(img.width, img.height);
									const newWidth = Math.floor(img.width * scale);
									const newHeight = Math.floor(img.height * scale);

									const resized = resizeImage(imageData, newWidth, newHeight);
									if (resized) {
										canvas.width = newWidth;
										canvas.height = newHeight;
										ctx.putImageData(resized, 0, 0);

										// 古いプレビューURLを解放
										URL.revokeObjectURL(preview);

										// 新しいプレビューを生成
										preview = await new Promise<string>((resolve) => {
											canvas.toBlob((blob) => {
												if (blob) {
													resolve(URL.createObjectURL(blob));
												} else {
													resolve(preview); // フォールバック
												}
											}, "image/jpeg", 0.85);
										});

										console.log(
											`WASM: ${img.width}x${img.height} → ${newWidth}x${newHeight}`
										);
									}
								}
							}
						} catch (err) {
							console.warn("WASM resize failed, using original:", err);
						}
					}

					return {
						id: crypto.randomUUID(),
						file,
						preview,
						enabled: true,
					};
				})
			);

			setImages((prev) => [...prev, ...newImages].slice(0, 4));

			// モード自動判定
			const totalImages = images.length + newImages.length;
			if (totalImages >= 1) {
				setEditMode("edit");
			}
			if (totalImages >= 2) {
				setEditMode("combine");
			}
		},
		[images.length, wasmReady, resizeImage],
	);

	// 画像の有効/無効切り替え
	const handleToggleImage = useCallback((id: string) => {
		setImages((prev) =>
			prev.map((img) =>
				img.id === id ? { ...img, enabled: !img.enabled } : img,
			),
		);
	}, []);

	// 画像の削除
	const handleRemoveImage = useCallback((id: string) => {
		setImages((prev) => {
			const filtered = prev.filter((img) => img.id !== id);
			// モード自動判定
			if (filtered.length === 0) {
				setEditMode("generate");
			} else if (filtered.length === 1) {
				setEditMode("edit");
			}
			return filtered;
		});
	}, []);

	// 画像のクリア
	const handleClearImages = useCallback(() => {
		for (const img of images) {
			URL.revokeObjectURL(img.preview);
		}
		setImages([]);
		setOutputImage(null);
		setOutputVideo(null);
		setEditMode("generate");
	}, [images]);

	// バックエンド切り替え
	const handleBackendChange = useCallback((backend: string) => {
		console.log('[App] handleBackendChange called with:', backend);
		setSelectedBackend(backend);
		console.log('[App] Backend changed to:', backend);
	}, []);

	// 画像生成/編集
	const handleGenerate = useCallback(async () => {
		if (!prompt.trim()) {
		console.log('[handleGenerate] START - prompt:', prompt);
		console.log('[handleGenerate] backend state:', {
			initialized: backend.initialized,
			initializing: backend.initializing,
			error: backend.error,
			availableBackends: backend.availableBackends
		});
		
			setStatus({
				isProcessing: false,
				progress: 0,
				message: "プロンプトを入力してください",
			});
			return;
		}

		// バックエンド初期化チェック
		if (!backend.initialized) {
			console.log('[handleGenerate] STOP: backend not initialized');
			if (backend.initializing) {
				setStatus({
					isProcessing: false,
					progress: 0,
					message: "バックエンド初期化中...",
				});
				return;
			}
			if (backend.error) {
				setStatus({
					isProcessing: false,
					progress: 0,
					message: `バックエンドエラー: ${backend.error}`,
				});
				return;
			}
		}

		console.log('[handleGenerate] Proceeding with generation...');
		setStatus({ isProcessing: true, progress: 10, message: "処理を開始..." });
		setOutputImage(null);
		setOutputVideo(null);

		try {
			// アスペクト比と解像度から幅と高さを計算
			const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
			const baseSize = Number(resolution);
			const isLandscape = widthRatio > heightRatio;
			const width = isLandscape ? baseSize : Math.round(baseSize * (widthRatio / heightRatio));
			const height = isLandscape ? Math.round(baseSize * (heightRatio / widthRatio)) : baseSize;

			setStatus({ isProcessing: true, progress: 30, message: "ローカルAI生成中..." });

			// バックエンドで画像生成
			const blob = await backend.generateImage({
				prompt,
				negativePrompt: negativePrompt || undefined,
				width,
				height,
				steps: 4, // sd-turboは4 stepsが最適
				guidanceScale: 0.0, // sd-turboはCFG不要
				preferOffline: true,
				prioritizeSpeed: false,
				preferredBackend: selectedBackend,
				aspectRatio,
				resolution: Number(resolution),
			});

			console.log('[handleGenerate] Blob received:', { size: blob.size, type: blob.type });
			setStatus({ isProcessing: true, progress: 70, message: "画像を処理中..." });

			// BlobをData URLに変換
			const dataUrl = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(blob);
			});
			
			console.log('[handleGenerate] Data URL created:', { length: dataUrl.length, preview: dataUrl.substring(0, 100) });

			// CUDA後処理を適用（動画以外）
			if (cudaConfig.enabled && cudaConfig.postprocessing) {
				setStatus({ isProcessing: true, progress: 85, message: "CUDA後処理中..." });
				
				try {
					// Data URLからImageDataに変換
					const img = new Image();
					img.src = dataUrl;
					await new Promise((resolve) => { img.onload = resolve; });
					
					const canvas = document.createElement('canvas');
					canvas.width = img.width;
					canvas.height = img.height;
					const ctx = canvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(img, 0, 0);
						const imageData = ctx.getImageData(0, 0, img.width, img.height);
						
						// CUDA後処理を適用
						const processed = await imageProcessor.applyPostprocessing(
							imageData,
							cudaConfig.postprocessing
						);
						
						// ImageDataをData URLに変換
						canvas.width = processed.width;
						canvas.height = processed.height;
						ctx.putImageData(processed, 0, 0);
						setOutputImage(canvas.toDataURL('image/png', 0.95));
					} else {
						setOutputImage(dataUrl);
					}
				} catch (error) {
					console.error('CUDA postprocessing failed:', error);
					setOutputImage(dataUrl);
				}
			} else {
				console.log('[handleGenerate] Setting output image (no CUDA)');
				setOutputImage(dataUrl);
				console.log('[handleGenerate] Output image set:', { length: dataUrl.length });
			}

			// バックエンド情報を表示
			const backendName = backend.currentBackend || "不明";
			const cudaInfo = cudaConfig.enabled ? " + CUDA処理" : "";

			console.log('[handleGenerate] Setting final status:', { backendName, cudaInfo });
			setStatus({
				isProcessing: false,
				progress: 100,
				message: `✓ ${backendName} (ローカル${cudaInfo}) で生成完了`,
			});
			console.log('[handleGenerate] Status updated to isProcessing: false');
		} catch (error) {
			console.error("Generation error:", error);
			setStatus({
				isProcessing: false,
				progress: 0,
				message: `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
			});
		}
	}, [
		prompt,
		negativePrompt,
		aspectRatio,
		resolution,
		backend,
		cudaConfig,
	]);

	// 画像の保存
	const handleSave = useCallback(
		(format: "png" | "jpeg") => {
			if (!outputImage) return;

			const link = document.createElement("a");
			link.href = outputImage;
			link.download = `qwen-image-edit-${Date.now()}.${format}`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		},
		[outputImage],
	);

	return (
		<div className="flex flex-col h-screen">
			{/* ヘッダー */}
			<Header onSave={handleSave} hasOutput={!!outputImage} />

			<div className="flex flex-1 overflow-hidden">
				{/* 左サイドバー - ツールバー */}
				<Toolbar editMode={editMode} onModeChange={setEditMode} />

				{/* メインコンテンツエリア */}
				{editMode === "cuda" ? (
					<div className="flex-1 p-6 overflow-auto">
						<CudaKernelEditor />
					</div>
				) : (
					<>
						{/* メインキャンバスエリア */}
						<div className="flex-1 flex flex-col">
							<ImageCanvas
								images={images}
								outputImage={outputImage}
								outputVideo={outputVideo}
								onAddImage={handleAddImage}
								onRemoveImage={handleRemoveImage}
								onToggleImage={handleToggleImage}
								onClearImages={handleClearImages}
								status={status}
							/>
						</div>

						{/* 右サイドバー - プロパティパネル */}
						<PropertiesPanel
							prompt={prompt}
							negativePrompt={negativePrompt}
							editMode={editMode}
							imageCount={images.length}
							enabledImageCount={images.filter((img) => img.enabled).length}
							aspectRatio={aspectRatio}
							resolution={resolution}
							models={models}
							selectedModelId={selectedModelId}
							backendType={backendType}
							availableBackends={backend.availableBackends}
							selectedBackend={selectedBackend}
							cudaConfig={cudaConfig}
							onPromptChange={setPrompt}
							onNegativePromptChange={setNegativePrompt}
							onAspectRatioChange={setAspectRatio}
							onResolutionChange={setResolution}
							onModelChange={setSelectedModelId}
							onCudaConfigChange={setCudaConfig}
							onBackendChange={handleBackendChange}
							onGenerate={handleGenerate}
							isProcessing={status.isProcessing}
						/>
					</>
				)}
			</div>

			{/* ステータスバー */}
			<StatusBar
				status={status}
				imageCount={images.length}
				enabledImageCount={images.filter((img) => img.enabled).length}
				editMode={editMode}
				backendState={backend}
				selectedBackend={selectedBackend}
			/>
		</div>
	);
}
