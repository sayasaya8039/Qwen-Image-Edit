import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Model {
  id: string
  name: string
  type: 'diffusers' | 'onnx' | 'cloud'
  source: string
  description: string
  backends: string[]
  isDefault: boolean
  enabled: boolean
  createdAt: string
  updatedAt?: string
}

interface Settings {
  activeModelId: string
  fallbackToCloud: boolean
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [models, setModels] = useState<Model[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)

  // 認証チェックとデータ取得
  useEffect(() => {
    checkAuthAndFetchData()
  }, [])

  const checkAuthAndFetchData = async () => {
    try {
      const authRes = await fetch('/api/auth/check')
      if (!authRes.ok) {
        navigate('/admin/login')
        return
      }

      await fetchData()
    } catch {
      navigate('/admin/login')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [modelsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/models'),
        fetch('/api/admin/settings'),
      ])

      if (!modelsRes.ok || !settingsRes.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const modelsData = await modelsRes.json()
      const settingsData = await settingsRes.json()

      setModels(modelsData.models)
      setSettings(settingsData.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    navigate('/admin/login')
  }

  const handleDeleteModel = async (id: string) => {
    if (!confirm('このモデルを削除しますか？')) return

    try {
      const res = await fetch(`/api/admin/models/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchData()
      } else {
        const data = await res.json()
        alert(data.message || '削除に失敗しました')
      }
    } catch {
      alert('削除に失敗しました')
    }
  }

  const handleToggleEnabled = async (model: Model) => {
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !model.enabled }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      alert('更新に失敗しました')
    }
  }

  const handleSetActive = async (modelId: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeModelId: modelId }),
      })
      if (res.ok) {
        await fetchData()
      } else {
        const data = await res.json()
        alert(data.message || '設定の更新に失敗しました')
      }
    } catch {
      alert('設定の更新に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ps-bg-dark)] flex items-center justify-center">
        <div className="text-[var(--ps-text-muted)]">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ps-bg-dark)]">
      {/* ヘッダー */}
      <header className="panel border-b border-[var(--ps-border)] px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-bold text-[var(--ps-text)]">
            モデル管理
          </h1>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-[var(--ps-text-muted)] hover:text-[var(--ps-accent)]"
            >
              アプリに戻る
            </a>
            <button onClick={handleLogout} className="btn-secondary text-sm">
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-400">
            {error}
          </div>
        )}

        {/* アクションバー */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-[var(--ps-text-muted)]">
            {models.length} 個のモデル
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            + モデルを追加
          </button>
        </div>

        {/* モデル一覧 */}
        <div className="space-y-4">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isActive={settings?.activeModelId === model.id}
              onEdit={() => setEditingModel(model)}
              onDelete={() => handleDeleteModel(model.id)}
              onToggleEnabled={() => handleToggleEnabled(model)}
              onSetActive={() => handleSetActive(model.id)}
            />
          ))}

          {models.length === 0 && (
            <div className="panel p-8 text-center text-[var(--ps-text-muted)]">
              モデルがありません。「モデルを追加」ボタンから追加してください。
            </div>
          )}
        </div>

        {/* 設定セクション */}
        {settings && (
          <div className="mt-8 panel p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-[var(--ps-text)] mb-4">
              グローバル設定
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.fallbackToCloud}
                onChange={async (e) => {
                  const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fallbackToCloud: e.target.checked }),
                  })
                  if (res.ok) await fetchData()
                }}
                className="w-4 h-4"
              />
              <span className="text-[var(--ps-text)]">
                ローカルモデルが利用できない場合、クラウドにフォールバック
              </span>
            </label>
          </div>
        )}
      </main>

      {/* 追加/編集モーダル */}
      {(showAddModal || editingModel) && (
        <ModelFormModal
          model={editingModel}
          onClose={() => {
            setShowAddModal(false)
            setEditingModel(null)
          }}
          onSave={async () => {
            await fetchData()
            setShowAddModal(false)
            setEditingModel(null)
          }}
        />
      )}
    </div>
  )
}

// モデルカードコンポーネント
function ModelCard({
  model,
  isActive,
  onEdit,
  onDelete,
  onToggleEnabled,
  onSetActive,
}: {
  model: Model
  isActive: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: () => void
  onSetActive: () => void
}) {
  const typeLabels = {
    diffusers: 'Diffusers',
    onnx: 'ONNX',
    cloud: 'Cloud',
  }

  const typeColors = {
    diffusers: 'bg-green-500/20 text-green-400',
    onnx: 'bg-blue-500/20 text-blue-400',
    cloud: 'bg-purple-500/20 text-purple-400',
  }

  return (
    <div
      className={`panel p-4 rounded-lg ${
        isActive ? 'ring-2 ring-[var(--ps-accent)]' : ''
      } ${!model.enabled ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-[var(--ps-text)]">{model.name}</h3>
            <span
              className={`px-2 py-0.5 rounded text-xs ${typeColors[model.type]}`}
            >
              {typeLabels[model.type]}
            </span>
            {isActive && (
              <span className="px-2 py-0.5 rounded text-xs bg-[var(--ps-accent)]/20 text-[var(--ps-accent)]">
                アクティブ
              </span>
            )}
            {model.isDefault && (
              <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                デフォルト
              </span>
            )}
          </div>

          <p className="text-sm text-[var(--ps-text-muted)] mb-2">
            {model.description || 'No description'}
          </p>

          <div className="flex items-center gap-4 text-xs text-[var(--ps-text-muted)]">
            <span>ソース: {model.source}</span>
            <span>バックエンド: {model.backends.join(', ')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isActive && model.enabled && (
            <button
              onClick={onSetActive}
              className="px-3 py-1.5 text-sm rounded bg-[var(--ps-accent)]/20 text-[var(--ps-accent)] hover:bg-[var(--ps-accent)]/30"
            >
              アクティブにする
            </button>
          )}
          <button
            onClick={onToggleEnabled}
            className={`px-3 py-1.5 text-sm rounded ${
              model.enabled
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {model.enabled ? '無効化' : '有効化'}
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm rounded bg-[var(--ps-bg-medium)] text-[var(--ps-text)] hover:bg-[var(--ps-border)]"
          >
            編集
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}

// モデルフォームモーダル
function ModelFormModal({
  model,
  onClose,
  onSave,
}: {
  model: Model | null
  onClose: () => void
  onSave: () => void
}) {
  const isEdit = !!model
  const [formData, setFormData] = useState({
    name: model?.name || '',
    type: model?.type || 'diffusers',
    source: model?.source || '',
    description: model?.description || '',
    backends: model?.backends || ['cpu'],
    isDefault: model?.isDefault || false,
    enabled: model?.enabled ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = isEdit ? `/api/admin/models/${model.id}` : '/api/admin/models'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        onSave()
      } else {
        const data = await res.json()
        setError(data.message || '保存に失敗しました')
      }
    } catch {
      setError('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const toggleBackend = (backend: string) => {
    setFormData((prev) => ({
      ...prev,
      backends: prev.backends.includes(backend)
        ? prev.backends.filter((b) => b !== backend)
        : [...prev.backends, backend],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="panel w-full max-w-lg rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[var(--ps-border)]">
          <h2 className="text-lg font-semibold text-[var(--ps-text)]">
            {isEdit ? 'モデルを編集' : 'モデルを追加'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--ps-text-muted)] mb-1">
              モデル名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="input-field w-full"
              placeholder="例: Stable Diffusion XL"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ps-text-muted)] mb-1">
              タイプ *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as Model['type'],
                }))
              }
              className="input-field w-full"
            >
              <option value="diffusers">Diffusers (PyTorch)</option>
              <option value="onnx">ONNX (DirectML対応)</option>
              <option value="cloud">Cloud (API)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ps-text-muted)] mb-1">
              ソース *
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, source: e.target.value }))
              }
              className="input-field w-full"
              placeholder="例: stabilityai/stable-diffusion-xl-base-1.0"
              required
            />
            <p className="text-xs text-[var(--ps-text-muted)] mt-1">
              HuggingFaceのモデルID または URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ps-text-muted)] mb-1">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="input-field w-full h-20 resize-none"
              placeholder="モデルの説明..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ps-text-muted)] mb-2">
              対応バックエンド
            </label>
            <div className="flex flex-wrap gap-2">
              {['cuda', 'directml', 'cpu', 'cloud'].map((backend) => (
                <button
                  key={backend}
                  type="button"
                  onClick={() => toggleBackend(backend)}
                  className={`px-3 py-1.5 text-sm rounded ${
                    formData.backends.includes(backend)
                      ? 'bg-[var(--ps-accent)] text-white'
                      : 'bg-[var(--ps-bg-medium)] text-[var(--ps-text-muted)]'
                  }`}
                >
                  {backend.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--ps-text)]">デフォルトモデル</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--ps-text)]">有効</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--ps-border)]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
