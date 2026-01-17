import type { KVNamespace } from '@cloudflare/workers-types'

export interface Env {
  // KV Namespaces
  MODELS_KV: KVNamespace
  SESSIONS_KV: KVNamespace

  // Environment Variables
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  SESSION_SECRET: string
  PYTHON_SERVER_URL?: string
  HF_SPACE_URL?: string
  REPLICATE_API_TOKEN?: string
}

export interface ModelConfig {
  id: string
  name: string
  type: 'diffusers' | 'onnx' | 'cloud'
  source: string
  description: string
  backends: ('cuda' | 'directml' | 'cpu' | 'cloud')[]
  isDefault: boolean
  enabled: boolean
  createdAt: string
  updatedAt?: string
}

export interface ModelSettings {
  activeModelId: string
  fallbackToCloud: boolean
}

export interface ModelsData {
  models: ModelConfig[]
  settings: ModelSettings
}

export interface Session {
  username: string
  createdAt: number
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
