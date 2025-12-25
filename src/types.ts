export interface ImageFile {
  id: string
  file: File
  preview: string
  enabled: boolean  // 生成時に使用するかどうか
}

export type EditMode = 'generate' | 'edit' | 'combine'

export interface GenerationStatus {
  isProcessing: boolean
  progress: number
  message: string
}

export interface GenerationParams {
  prompt: string
  negative_prompt: string
  num_inference_steps: number
  guidance_scale: number
  true_cfg_scale: number
}

export interface BackendStatus {
  mode: 'local' | 'cloud' | 'unavailable'
  cudaAvailable: boolean
  directmlAvailable: boolean
  gpuVendor: 'nvidia' | 'amd' | 'intel' | 'unknown'
  gpuName: string
  gpuInfo: string
  backend: string
  modelLoaded: boolean
  lastCheck: number
}
