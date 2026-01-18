// バックエンド型定義
export interface BackendCapabilities {
  supportsImageGeneration: boolean;
  supportsImageProcessing: boolean;
  supportsOffline: boolean;
  maxModelSize: number; // MB
  estimatedSpeed: 'very-fast' | 'fast' | 'medium' | 'slow';
}

export interface BackendExecutor {
  readonly name: string;
  readonly type: BackendType;

  // 初期化
  init(): Promise<void>;
  isAvailable(): Promise<boolean>;
  getCapabilities(): BackendCapabilities;

  // 画像生成
  generateImage(params: GenerationParams): Promise<Blob>;

  // 画像処理（オプション）
  processImage?(input: ImageData, operation: string): Promise<ImageData>;

  // リソース管理
  dispose(): Promise<void>;
  getMemoryUsage(): Promise<MemoryInfo>;
}

export enum BackendType {
  TRANSFORMERS_WASM = 'transformers-wasm',
  TRANSFORMERS_WEBGPU = 'transformers-webgpu',
  TRANSFORMERS_WEBNN_WASM = 'transformers-webnn-wasm',
  CUSTOM_WASM_WEBGPU = 'custom-wasm-webgpu',
  HIPSCRIPT_CUDA = 'hipscript-cuda',
  CLOUD = 'cloud',
  WORKER_API = 'worker-api',
  SD_TURBO = 'sd-turbo',
}

export interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  guidanceScale?: number;
  aspectRatio?: string;
  resolution?: number;
}

export interface MemoryInfo {
  used: number; // MB
  available: number; // MB
  peak: number; // MB
}

export interface SelectionCriteria {
  modelSize: number; // MB
  preferOffline: boolean;
  prioritizeSpeed: boolean;
  needsImageGeneration: boolean;
  needsImageProcessing: boolean;
}

export interface OperationMetrics {
  operation: string;
  duration: number; // ms
  memoryDelta: number; // MB
  timestamp: number;
  success: boolean;
  error?: string;
}