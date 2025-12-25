import type { KVNamespace } from '@cloudflare/workers-types'
import type { ModelConfig, ModelSettings, ModelsData } from './types'

const MODELS_KEY = 'models_config'

// デフォルト設定
const defaultConfig: ModelsData = {
  models: [
    {
      id: 'qwen-image-edit',
      name: 'Qwen-Image-Edit-2511',
      type: 'diffusers',
      source: 'Qwen/Qwen-Image-Edit-2511',
      description: 'Qwenの画像編集モデル（CUDA対応）',
      backends: ['cuda', 'cpu'],
      isDefault: false,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'stable-diffusion-v1-5',
      name: 'Stable Diffusion 1.5',
      type: 'onnx',
      source: 'runwayml/stable-diffusion-v1-5',
      description: 'Stable Diffusion 1.5（DirectML対応）',
      backends: ['directml', 'cuda', 'cpu'],
      isDefault: false,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'huggingface-cloud',
      name: 'Qwen-Image-Edit (Cloud)',
      type: 'cloud',
      source: 'https://qwen-qwen-image-edit-2511.hf.space',
      description: 'Qwen画像編集モデル（HuggingFace Spaces）',
      backends: ['cloud'],
      isDefault: true,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bagel-7b-mot',
      name: 'BAGEL-7B-MoT',
      type: 'cloud',
      source: 'https://bytedance-seed-bagel.hf.space',
      description: 'ByteDance BAGEL - 統合マルチモーダルモデル（画像生成・編集・理解、CUDA対応）',
      backends: ['cuda', 'cloud'],
      isDefault: false,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'z-image-turbo',
      name: 'Z-Image-Turbo',
      type: 'cloud',
      source: 'https://tongyi-mai-z-image-turbo.hf.space',
      description: 'Tongyi 高速・高品質テキストから画像生成（16GB VRAM、CUDA対応）',
      backends: ['cuda', 'cloud'],
      isDefault: false,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'flux2-dev',
      name: 'FLUX.2 [dev]',
      type: 'cloud',
      source: 'https://black-forest-labs-flux-2-dev.hf.space',
      description: 'Black Forest Labs FLUX.2 - 32B最先端画像生成・編集モデル（CUDA対応）',
      backends: ['cuda', 'cloud'],
      isDefault: false,
      enabled: true,
      createdAt: new Date().toISOString(),
    },
  ],
  settings: {
    activeModelId: 'huggingface-cloud',
    fallbackToCloud: true,
  },
}

// 設定を読み込み
export async function loadModelsConfig(kv: KVNamespace): Promise<ModelsData> {
  try {
    const data = await kv.get(MODELS_KEY, 'json')
    if (data) {
      return data as ModelsData
    }
    // 初回はデフォルト設定を保存
    await saveModelsConfig(kv, defaultConfig)
    return defaultConfig
  } catch {
    return defaultConfig
  }
}

// 設定を保存
export async function saveModelsConfig(kv: KVNamespace, config: ModelsData): Promise<void> {
  await kv.put(MODELS_KEY, JSON.stringify(config))
}

// 全モデルを取得
export async function getAllModels(kv: KVNamespace): Promise<ModelConfig[]> {
  const config = await loadModelsConfig(kv)
  return config.models
}

// モデルを取得
export async function getModel(kv: KVNamespace, id: string): Promise<ModelConfig | undefined> {
  const config = await loadModelsConfig(kv)
  return config.models.find((m) => m.id === id)
}

// モデルを追加
export async function addModel(
  kv: KVNamespace,
  model: Omit<ModelConfig, 'id' | 'createdAt'>
): Promise<ModelConfig> {
  const config = await loadModelsConfig(kv)

  const id = generateModelId(model.name)

  if (config.models.some((m) => m.id === id)) {
    throw new Error('同じ名前のモデルが既に存在します')
  }

  const newModel: ModelConfig = {
    ...model,
    id,
    createdAt: new Date().toISOString(),
  }

  if (newModel.isDefault) {
    config.models.forEach((m) => (m.isDefault = false))
  }

  config.models.push(newModel)
  await saveModelsConfig(kv, config)

  return newModel
}

// モデルを更新
export async function updateModel(
  kv: KVNamespace,
  id: string,
  updates: Partial<Omit<ModelConfig, 'id' | 'createdAt'>>
): Promise<ModelConfig> {
  const config = await loadModelsConfig(kv)
  const index = config.models.findIndex((m) => m.id === id)

  if (index === -1) {
    throw new Error('モデルが見つかりません')
  }

  if (updates.isDefault) {
    config.models.forEach((m) => (m.isDefault = false))
  }

  config.models[index] = {
    ...config.models[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await saveModelsConfig(kv, config)
  return config.models[index]
}

// モデルを削除
export async function deleteModel(kv: KVNamespace, id: string): Promise<void> {
  const config = await loadModelsConfig(kv)
  const index = config.models.findIndex((m) => m.id === id)

  if (index === -1) {
    throw new Error('モデルが見つかりません')
  }

  if (config.settings.activeModelId === id) {
    throw new Error('アクティブなモデルは削除できません')
  }

  config.models.splice(index, 1)
  await saveModelsConfig(kv, config)
}

// 設定を取得
export async function getSettings(kv: KVNamespace): Promise<ModelSettings> {
  const config = await loadModelsConfig(kv)
  return config.settings
}

// 設定を更新
export async function updateSettings(
  kv: KVNamespace,
  updates: Partial<ModelSettings>
): Promise<ModelSettings> {
  const config = await loadModelsConfig(kv)

  if (updates.activeModelId) {
    const model = config.models.find((m) => m.id === updates.activeModelId)
    if (!model) {
      throw new Error('指定されたモデルが存在しません')
    }
    if (!model.enabled) {
      throw new Error('無効化されているモデルは選択できません')
    }
  }

  config.settings = {
    ...config.settings,
    ...updates,
  }

  await saveModelsConfig(kv, config)
  return config.settings
}

function generateModelId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
