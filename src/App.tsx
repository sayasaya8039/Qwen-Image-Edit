import { useState, useCallback, useEffect } from 'react'
import { Header } from './components/Header'
import { Toolbar } from './components/Toolbar'
import { ImageCanvas } from './components/ImageCanvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { StatusBar } from './components/StatusBar'
import type { ImageFile, EditMode, GenerationStatus } from './types'

// バックエンド名を日本語表示に変換
function getBackendDisplayName(backend: string): string {
  const names: Record<string, string> = {
    'local': 'ローカル',
    'huggingface': 'HuggingFace',
    'replicate': 'Replicate',
    'bagel': 'BAGEL Space',
    'zimage': 'Z-Image Space',
    'flux2': 'FLUX.2 Space',
  }
  return names[backend] || backend || 'クラウド'
}

interface ModelInfo {
  id: string
  name: string
  description: string
  type: string
  isDefault: boolean
}

export default function App() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [outputImage, setOutputImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [editMode, setEditMode] = useState<EditMode>('generate')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [resolution, setResolution] = useState('1024')
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [backendType, setBackendType] = useState<string>('')
  const [status, setStatus] = useState<GenerationStatus>({
    isProcessing: false,
    progress: 0,
    message: '準備完了',
  })

  // モデル一覧とバックエンド情報を取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // モデル一覧を取得
        const modelsRes = await fetch('/api/models')
        if (modelsRes.ok) {
          const data = await modelsRes.json()
          setModels(data.models || [])
          const defaultModel = data.models?.find((m: ModelInfo) => m.isDefault)
          if (defaultModel) {
            setSelectedModelId(defaultModel.id)
          } else if (data.models?.length > 0) {
            setSelectedModelId(data.models[0].id)
          }
        }

        // バックエンド情報を取得
        const healthRes = await fetch('/api/health')
        if (healthRes.ok) {
          const data = await healthRes.json()
          setBackendType(data.backend?.backend || '')
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }
    fetchData()
  }, [])

  // 画像の追加（最大4枚）
  const handleAddImage = useCallback((files: File[]) => {
    const newImages = files.slice(0, 4 - images.length).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      enabled: true,  // デフォルトで有効
    }))
    setImages((prev) => [...prev, ...newImages].slice(0, 4))

    // モード自動判定
    const totalImages = images.length + newImages.length
    if (totalImages >= 1) {
      setEditMode('edit')
    }
    if (totalImages >= 2) {
      setEditMode('combine')
    }
  }, [images.length])

  // 画像の有効/無効切り替え
  const handleToggleImage = useCallback((id: string) => {
    setImages((prev) => prev.map((img) =>
      img.id === id ? { ...img, enabled: !img.enabled } : img
    ))
  }, [])

  // 画像の削除
  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id)
      // モード自動判定
      if (filtered.length === 0) {
        setEditMode('generate')
      } else if (filtered.length === 1) {
        setEditMode('edit')
      }
      return filtered
    })
  }, [])

  // 画像のクリア
  const handleClearImages = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview))
    setImages([])
    setOutputImage(null)
    setEditMode('generate')
  }, [images])

  // 画像生成/編集
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setStatus({ isProcessing: false, progress: 0, message: 'プロンプトを入力してください' })
      return
    }

    setStatus({ isProcessing: true, progress: 10, message: '処理を開始...' })
    setOutputImage(null)

    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('negative_prompt', negativePrompt)
      formData.append('mode', editMode)
      formData.append('aspect_ratio', aspectRatio)
      formData.append('resolution', resolution)
      if (selectedModelId) {
        formData.append('modelId', selectedModelId)
      }

      // 有効な画像のみ送信
      const enabledImages = images.filter(img => img.enabled)
      enabledImages.forEach((img, index) => {
        formData.append(`image${index + 1}`, img.file)
      })

      setStatus({ isProcessing: true, progress: 30, message: 'AI処理中...' })

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '生成に失敗しました')
      }

      setStatus({ isProcessing: true, progress: 80, message: '画像を受信中...' })

      const result = await response.json()
      setOutputImage(result.image)

      // 使用したモデル/バックエンドを表示
      const modelName = result.model?.name || result.modelId || '不明'
      const backendName = getBackendDisplayName(result.backend)
      const translatedInfo = result.translated ? ` (翻訳: ${result.prompt})` : ''

      setStatus({
        isProcessing: false,
        progress: 100,
        message: `✓ ${modelName} (${backendName}) で生成完了${translatedInfo}`
      })
    } catch (error) {
      console.error('Generation error:', error)
      setStatus({
        isProcessing: false,
        progress: 0,
        message: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      })
    }
  }, [prompt, negativePrompt, editMode, images, aspectRatio, resolution, selectedModelId])

  // 画像の保存
  const handleSave = useCallback((format: 'png' | 'jpeg') => {
    if (!outputImage) return

    const link = document.createElement('a')
    link.href = outputImage
    link.download = `qwen-image-edit-${Date.now()}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [outputImage])

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <Header onSave={handleSave} hasOutput={!!outputImage} />

      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー - ツールバー */}
        <Toolbar editMode={editMode} onModeChange={setEditMode} />

        {/* メインキャンバスエリア */}
        <div className="flex-1 flex flex-col">
          <ImageCanvas
            images={images}
            outputImage={outputImage}
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
          enabledImageCount={images.filter(img => img.enabled).length}
          aspectRatio={aspectRatio}
          resolution={resolution}
          models={models}
          selectedModelId={selectedModelId}
          backendType={backendType}
          onPromptChange={setPrompt}
          onNegativePromptChange={setNegativePrompt}
          onAspectRatioChange={setAspectRatio}
          onResolutionChange={setResolution}
          onModelChange={setSelectedModelId}
          onGenerate={handleGenerate}
          isProcessing={status.isProcessing}
        />
      </div>

      {/* ステータスバー */}
      <StatusBar status={status} imageCount={images.length} enabledImageCount={images.filter(img => img.enabled).length} editMode={editMode} />
    </div>
  )
}
