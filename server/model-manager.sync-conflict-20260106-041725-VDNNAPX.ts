import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// モデル設定の型定義
export type ModelCapability = 'text-to-image' | 'image-edit' | 'image-understanding' | 'image-compose'

export interface ModelConfig {
  id: string
  name: string
  type: 'diffusers' | 'onnx' | 'cloud'
  source: string
  description: string
  backends: ('cuda' | 'directml' | 'cpu' | 'cloud')[]
  capabilities?: ModelCapability[]
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

// 設定ファイルのパス
const CONFIG_PATH = join(import.meta.dir, 'models.json')

// 設定を読み込み
export function loadModelsConfig(): ModelsData {
  try {
    if (!existsSync(CONFIG_PATH)) {
      // デフォルト設定を作成
      const defaultConfig: ModelsData = {
        models: [],
        settings: {
          activeModelId: '',
          fallbackToCloud: true,
        },
      }
      saveModelsConfig(defaultConfig)
      return defaultConfig
    }

    const data = readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('モデル設定の読み込みに失敗:', error)
    return {
      models: [],
      settings: {
        activeModelId: '',
        fallbackToCloud: true,
      },
    }
  }
}

// 設定を保存
export function saveModelsConfig(config: ModelsData): void {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('モデル設定の保存に失敗:', error)
    throw new Error('設定の保存に失敗しました')
  }
}

// 全モデルを取得
export function getAllModels(): ModelConfig[] {
  const config = loadModelsConfig()
  return config.models
}

// モデルを取得
export function getModel(id: string): ModelConfig | undefined {
  const config = loadModelsConfig()
  return config.models.find((m) => m.id === id)
}

// モデルを追加
export function addModel(model: Omit<ModelConfig, 'id' | 'createdAt'>): ModelConfig {
  const config = loadModelsConfig()

  // IDを生成
  const id = generateModelId(model.name)

  // 既存のIDと重複チェック
  if (config.models.some((m) => m.id === id)) {
    throw new Error('同じ名前のモデルが既に存在します')
  }

  const newModel: ModelConfig = {
    ...model,
    id,
    createdAt: new Date().toISOString(),
  }

  // isDefaultがtrueの場合、他のモデルのisDefaultをfalseに
  if (newModel.isDefault) {
    config.models.forEach((m) => (m.isDefault = false))
  }

  config.models.push(newModel)
  saveModelsConfig(config)

  return newModel
}

// モデルを更新
export function updateModel(id: string, updates: Partial<Omit<ModelConfig, 'id' | 'createdAt'>>): ModelConfig {
  const config = loadModelsConfig()
  const index = config.models.findIndex((m) => m.id === id)

  if (index === -1) {
    throw new Error('モデルが見つかりません')
  }

  // isDefaultがtrueの場合、他のモデルのisDefaultをfalseに
  if (updates.isDefault) {
    config.models.forEach((m) => (m.isDefault = false))
  }

  config.models[index] = {
    ...config.models[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  saveModelsConfig(config)

  return config.models[index]
}

// モデルを削除
export function deleteModel(id: string): void {
  const config = loadModelsConfig()
  const index = config.models.findIndex((m) => m.id === id)

  if (index === -1) {
    throw new Error('モデルが見つかりません')
  }

  // アクティブなモデルは削除不可
  if (config.settings.activeModelId === id) {
    throw new Error('アクティブなモデルは削除できません')
  }

  config.models.splice(index, 1)
  saveModelsConfig(config)
}

// 設定を取得
export function getSettings(): ModelSettings {
  const config = loadModelsConfig()
  return config.settings
}

// 設定を更新
export function updateSettings(updates: Partial<ModelSettings>): ModelSettings {
  const config = loadModelsConfig()

  // activeModelIdの検証
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

  saveModelsConfig(config)

  return config.settings
}

// アクティブなモデルを取得
export function getActiveModel(): ModelConfig | undefined {
  const config = loadModelsConfig()
  return config.models.find((m) => m.id === config.settings.activeModelId)
}

// モデルIDを生成
function generateModelId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
