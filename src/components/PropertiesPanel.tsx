import type { EditMode, CudaProcessingConfig } from "../types";

interface ModelInfo {
	id: string;
	name: string;
	description: string;
	type: string;
	isDefault: boolean;
}

interface PropertiesPanelProps {
	prompt: string;
	negativePrompt: string;
	editMode: EditMode;
	imageCount: number;
	enabledImageCount: number;
	aspectRatio: string;
	resolution: string;
	models: ModelInfo[];
	selectedModelId: string;
	backendType: string;
	cudaConfig: CudaProcessingConfig;
	onPromptChange: (value: string) => void;
	onNegativePromptChange: (value: string) => void;
	onAspectRatioChange: (value: string) => void;
	onResolutionChange: (value: string) => void;
	onModelChange: (value: string) => void;
	onCudaConfigChange: (config: CudaProcessingConfig) => void;
	onGenerate: () => void;
	isProcessing: boolean;
}

const ASPECT_RATIOS = [
	{ value: "1:1", label: "1:1 (正方形)" },
	{ value: "16:9", label: "16:9 (横長)" },
	{ value: "9:16", label: "9:16 (縦長)" },
	{ value: "4:3", label: "4:3 (横長)" },
	{ value: "3:4", label: "3:4 (縦長)" },
	{ value: "3:2", label: "3:2 (横長)" },
	{ value: "2:3", label: "2:3 (縦長)" },
];

const RESOLUTIONS = [
	{ value: "512", label: "512px (低)" },
	{ value: "768", label: "768px (中)" },
	{ value: "1024", label: "1024px (高)" },
	{ value: "1280", label: "1280px (超高)" },
];

const modeInfo = {
	generate: {
		title: "画像生成",
		description: "プロンプトから新しい画像を生成します。",
		placeholder:
			"生成したい画像の説明を入力...\n例: A beautiful sunset over the ocean with vibrant orange and purple colors",
	},
	edit: {
		title: "画像編集",
		description: "アップロードした画像をプロンプトに従って編集します。",
		placeholder:
			"編集内容を入力...\n例: Change the background to a forest, keep the person",
	},
	combine: {
		title: "画像合成",
		description: "2枚の画像を組み合わせて新しい画像を生成します。",
		placeholder:
			"合成方法を入力...\n例: Combine the person from image 1 with the background from image 2",
	},
};

// サンプルWGSLコード
const SAMPLE_WGSL_PREPROCESSING = `// グレースケール変換（前処理サンプル）
@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.y * 1024u + global_id.x;
    let pixel = input[idx];
    
    let r = f32((pixel >> 16u) & 0xFFu);
    let g = f32((pixel >> 8u) & 0xFFu);
    let b = f32(pixel & 0xFFu);
    
    let gray = u32(r * 0.299 + g * 0.587 + b * 0.114);
    output[idx] = (pixel & 0xFF000000u) | (gray << 16u) | (gray << 8u) | gray;
}`;

const SAMPLE_WGSL_POSTPROCESSING = `// シャープニング（後処理サンプル）
@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;
    let width = 1024u;
    let idx = y * width + x;
    
    // 3x3カーネルでシャープニング
    let center = input[idx];
    output[idx] = center; // 簡易実装
}`;

export function PropertiesPanel({
	prompt,
	negativePrompt,
	editMode,
	imageCount,
	enabledImageCount,
	aspectRatio,
	resolution,
	models,
	selectedModelId,
	backendType,
	cudaConfig,
	onPromptChange,
	onNegativePromptChange,
	onAspectRatioChange,
	onResolutionChange,
	onModelChange,
	onCudaConfigChange,
	onGenerate,
	isProcessing,
}: PropertiesPanelProps) {
	const showResolution = backendType !== "replicate";
	const currentMode = modeInfo[editMode];

	// 実行可能かどうか（有効な画像数でチェック）
	const canGenerate = (() => {
		if (!prompt.trim()) return false;
		if (isProcessing) return false;
		if (editMode === "edit" && enabledImageCount < 1) return false;
		if (editMode === "combine" && enabledImageCount < 2) return false;
		return true;
	})();

	// ボタンのラベル
	const buttonLabel = (() => {
		if (isProcessing) return "処理中...";
		switch (editMode) {
			case "generate":
				return "生成する";
			case "edit":
				return "編集する";
			case "combine":
				return "合成する";
		}
	})();

	return (
		<aside className="panel w-72 flex flex-col border-l border-[var(--ps-border)]">
			{/* モード情報 */}
			<div className="panel-header flex items-center gap-2">
				<ModeIcon mode={editMode} />
				<span>{currentMode.title}</span>
			</div>
			<div className="p-3 text-xs text-[var(--ps-text-muted)] border-b border-[var(--ps-border)]">
				{currentMode.description}
			</div>

			{/* プロンプト入力 */}
			<div className="flex-1 overflow-auto">
				<div className="p-3 space-y-4">
					{/* メインプロンプト */}
					<div>
						<label
							htmlFor="main-prompt"
							className="block text-xs font-medium mb-2"
						>
							プロンプト <span className="text-[var(--ps-error)]">*</span>
						</label>
						<textarea
							id="main-prompt"
							className="input-field min-h-32 resize-none"
							placeholder={currentMode.placeholder}
							value={prompt}
							onChange={(e) => onPromptChange(e.target.value)}
							disabled={isProcessing}
						/>
					</div>

					{/* ネガティブプロンプト */}
					<div>
						<label
							htmlFor="negative-prompt"
							className="block text-xs font-medium mb-2"
						>
							ネガティブプロンプト
						</label>
						<textarea
							id="negative-prompt"
							className="input-field min-h-20 resize-none text-sm"
							placeholder="除外したい要素を入力..."
							value={negativePrompt}
							onChange={(e) => onNegativePromptChange(e.target.value)}
							disabled={isProcessing}
						/>
					</div>

					{/* モデル選択 */}
					{models.length > 0 && (
						<div>
							<label
								htmlFor="model-select"
								className="block text-xs font-medium mb-2"
							>
								モデル
							</label>
							<select
								id="model-select"
								className="input-field text-sm"
								value={selectedModelId}
								onChange={(e) => onModelChange(e.target.value)}
								disabled={isProcessing}
							>
								{models.map((model) => (
									<option key={model.id} value={model.id}>
										{model.name} {model.isDefault ? "(デフォルト)" : ""}
									</option>
								))}
							</select>
							{selectedModelId && (
								<p className="text-xs text-[var(--ps-text-muted)] mt-1">
									{models.find((m) => m.id === selectedModelId)?.description}
								</p>
							)}
						</div>
					)}

					{/* アスペクト比と解像度 */}
					<div className={showResolution ? "grid grid-cols-2 gap-3" : ""}>
						<div>
							<label
								htmlFor="aspect-ratio"
								className="block text-xs font-medium mb-2"
							>
								アスペクト比
							</label>
							<select
								id="aspect-ratio"
								className="input-field text-sm"
								value={aspectRatio}
								onChange={(e) => onAspectRatioChange(e.target.value)}
								disabled={isProcessing}
							>
								{ASPECT_RATIOS.map((ratio) => (
									<option key={ratio.value} value={ratio.value}>
										{ratio.label}
									</option>
								))}
							</select>
						</div>
						{showResolution && (
							<div>
								<label
									htmlFor="resolution"
									className="block text-xs font-medium mb-2"
								>
									解像度
								</label>
								<select
									id="resolution"
									className="input-field text-sm"
									value={resolution}
									onChange={(e) => onResolutionChange(e.target.value)}
									disabled={isProcessing}
								>
									{RESOLUTIONS.map((res) => (
										<option key={res.value} value={res.value}>
											{res.label}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					{/* 状態表示 */}
					<div className="space-y-2">
						<StatusItem
							label="モード"
							value={currentMode.title}
							icon={<ModeIcon mode={editMode} size="small" />}
						/>
						<StatusItem
							label="入力画像"
							value={`${enabledImageCount}/${imageCount} (有効/全${imageCount > 0 ? imageCount : 0}枚)`}
							status={
								editMode === "generate"
									? "neutral"
									: editMode === "edit"
										? enabledImageCount >= 1
											? "success"
											: "warning"
										: enabledImageCount >= 2
											? "success"
											: "warning"
							}
						/>
						{cudaConfig.enabled && (
							<StatusItem
								label="CUDA処理"
								value={
									cudaConfig.preprocessing && cudaConfig.postprocessing
										? "前処理+後処理"
										: cudaConfig.preprocessing
											? "前処理のみ"
											: cudaConfig.postprocessing
												? "後処理のみ"
												: "有効"
								}
								status="success"
							/>
						)}
					</div>
				</div>
			</div>

			{/* 生成ボタン */}
			<div className="p-3 border-t border-[var(--ps-border)]">
				<button
					type="button"
					className="btn-primary w-full py-3 text-sm font-medium flex items-center justify-center gap-2"
					disabled={!canGenerate}
					onClick={onGenerate}
				>
					{isProcessing ? (
						<>
							<div className="spinner w-4 h-4 border-2" />
							{buttonLabel}
						</>
					) : (
						<>
							<svg
								aria-hidden="true"
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
							{buttonLabel}
						</>
					)}
				</button>
				{!canGenerate && !isProcessing && (
					<p className="text-xs text-[var(--ps-text-muted)] mt-2 text-center">
						{!prompt.trim()
							? "プロンプトを入力してください"
							: editMode === "edit" && enabledImageCount < 1
								? "画像を1枚以上有効にしてください"
								: editMode === "combine" && enabledImageCount < 2
									? "画像を2枚以上有効にしてください"
									: ""}
					</p>
				)}
			</div>

			{/* 詳細設定 */}
			<details className="border-t border-[var(--ps-border)]">
				<summary className="panel-header cursor-pointer">詳細設定</summary>
				<div className="p-3 space-y-3">
					<div>
						<label
							htmlFor="inference-steps"
							className="block text-xs font-medium mb-1"
						>
							推論ステップ数
						</label>
						<input
							id="inference-steps"
							type="range"
							min="20"
							max="100"
							defaultValue="40"
							className="w-full"
							disabled={isProcessing}
						/>
						<div className="flex justify-between text-xs text-[var(--ps-text-muted)]">
							<span>20</span>
							<span>40</span>
							<span>100</span>
						</div>
					</div>
					<div>
						<label
							htmlFor="cfg-scale"
							className="block text-xs font-medium mb-1"
						>
							CFGスケール
						</label>
						<input
							id="cfg-scale"
							type="range"
							min="1"
							max="10"
							step="0.5"
							defaultValue="4"
							className="w-full"
							disabled={isProcessing}
						/>
						<div className="flex justify-between text-xs text-[var(--ps-text-muted)]">
							<span>1</span>
							<span>4</span>
							<span>10</span>
						</div>
					</div>

					{/* CUDA処理設定 */}
					<div className="border-t border-[var(--ps-border)] pt-3">
						<div className="flex items-center justify-between mb-2">
							<label className="text-xs font-medium">CUDA GPU処理</label>
							<input
								type="checkbox"
								checked={cudaConfig.enabled}
								onChange={(e) =>
									onCudaConfigChange({
										...cudaConfig,
										enabled: e.target.checked,
									})
								}
								disabled={isProcessing}
								className="w-4 h-4"
							/>
						</div>
						<p className="text-xs text-[var(--ps-text-muted)] mb-2">
							WebGPUでCUDAカーネルを実行し、AI処理前後に画像処理を適用
						</p>

						{cudaConfig.enabled && (
							<div className="space-y-2">
								{/* 前処理 */}
								<div>
									<label className="block text-xs font-medium mb-1">
										前処理 (WGSL)
									</label>
									<textarea
										className="input-field text-xs font-mono resize-none"
										rows={3}
										placeholder={SAMPLE_WGSL_PREPROCESSING}
										value={cudaConfig.preprocessing || ""}
										onChange={(e) =>
											onCudaConfigChange({
												...cudaConfig,
												preprocessing: e.target.value,
											})
										}
										disabled={isProcessing}
									/>
								</div>

								{/* 後処理 */}
								<div>
									<label className="block text-xs font-medium mb-1">
										後処理 (WGSL)
									</label>
									<textarea
										className="input-field text-xs font-mono resize-none"
										rows={3}
										placeholder={SAMPLE_WGSL_POSTPROCESSING}
										value={cudaConfig.postprocessing || ""}
										onChange={(e) =>
											onCudaConfigChange({
												...cudaConfig,
												postprocessing: e.target.value,
											})
										}
										disabled={isProcessing}
									/>
								</div>

								{/* サンプルロードボタン */}
								<div className="flex gap-2">
									<button
										type="button"
										className="text-xs px-2 py-1 bg-[var(--ps-bg-dark)] hover:bg-[var(--ps-bg-hover)] rounded"
										onClick={() =>
											onCudaConfigChange({
												...cudaConfig,
												preprocessing: SAMPLE_WGSL_PREPROCESSING,
											})
										}
										disabled={isProcessing}
									>
										前処理サンプル
									</button>
									<button
										type="button"
										className="text-xs px-2 py-1 bg-[var(--ps-bg-dark)] hover:bg-[var(--ps-bg-hover)] rounded"
										onClick={() =>
											onCudaConfigChange({
												...cudaConfig,
												postprocessing: SAMPLE_WGSL_POSTPROCESSING,
											})
										}
										disabled={isProcessing}
									>
										後処理サンプル
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</details>
		</aside>
	);
}

function ModeIcon({
	mode,
	size = "normal",
}: {
	mode: EditMode;
	size?: "small" | "normal";
}) {
	const sizeClass = size === "small" ? "w-3 h-3" : "w-4 h-4";

	switch (mode) {
		case "generate":
			return (
				<svg
					aria-hidden="true"
					className={sizeClass}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			);
		case "edit":
			return (
				<svg
					aria-hidden="true"
					className={sizeClass}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			);
		case "combine":
			return (
				<svg
					aria-hidden="true"
					className={sizeClass}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			);
	}
}

function StatusItem({
	label,
	value,
	icon,
	status = "neutral",
}: {
	label: string;
	value: string;
	icon?: React.ReactNode;
	status?: "neutral" | "success" | "warning";
}) {
	const statusColor =
		status === "success"
			? "text-[var(--ps-success)]"
			: status === "warning"
				? "text-[var(--ps-warning)]"
				: "text-[var(--ps-text)]";

	return (
		<div className="flex items-center justify-between py-1.5 px-2 bg-[var(--ps-bg-dark)] rounded text-xs">
			<span className="text-[var(--ps-text-muted)]">{label}</span>
			<span className={`flex items-center gap-1 ${statusColor}`}>
				{icon}
				{value}
			</span>
		</div>
	);
}
