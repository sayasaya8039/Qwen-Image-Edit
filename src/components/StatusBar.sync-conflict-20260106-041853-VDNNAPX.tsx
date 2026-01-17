import { useState, useEffect, useCallback } from 'react'
import type { EditMode, GenerationStatus, BackendStatus } from '../types'

interface StatusBarProps {
  status: GenerationStatus
  imageCount: number
  enabledImageCount: number
  editMode: EditMode
}

const modeLabels: Record<EditMode, string> = {
  generate: '生成モード',
  edit: '編集モード',
  combine: '合成モード',
}

export function StatusBar({ status, imageCount, enabledImageCount, editMode }: StatusBarProps) {
  const [backend, setBackend] = useState<BackendStatus | null>(null)
  const [showLocalModal, setShowLocalModal] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok) {
          const data = await res.json()
          setBackend(data.backend)
        }
      } catch {
        setBackend(null)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <footer className="panel flex items-center justify-between px-4 h-7 text-xs border-t border-[var(--ps-border)]">
        {/* 左側 - ステータスメッセージ */}
        <div className="flex items-center gap-2">
          <StatusIndicator isProcessing={status.isProcessing} />
          <span className="text-[var(--ps-text-muted)]">{status.message}</span>
        </div>

        {/* 中央 - プログレスバー（処理中のみ） */}
        {status.isProcessing && (
          <div className="w-48 mx-4">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 右側 - 情報表示 */}
        <div className="flex items-center gap-4 text-[var(--ps-text-muted)]">
          <BackendIndicator backend={backend} onLocalClick={() => setShowLocalModal(true)} />
          <span>{modeLabels[editMode]}</span>
          <span>画像: {enabledImageCount}/{imageCount}</span>
        </div>
      </footer>

      {showLocalModal && (
        <LocalLaunchModal onClose={() => setShowLocalModal(false)} />
      )}
    </>
  )
}

function StatusIndicator({ isProcessing }: { isProcessing: boolean }) {
  return (
    <div
      className={`w-2 h-2 rounded-full ${
        isProcessing ? 'bg-[var(--ps-warning)] animate-pulse' : 'bg-[var(--ps-success)]'
      }`}
    />
  )
}

interface BackendIndicatorProps {
  backend: BackendStatus | null
  onLocalClick: () => void
}

function BackendIndicator({ backend, onLocalClick }: BackendIndicatorProps) {
  if (!backend) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-700/50">
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        <span>接続中...</span>
      </div>
    )
  }

  if (backend.mode === 'unavailable') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-900/30 border border-red-700/50">
        <div className="w-2 h-2 rounded-full bg-[var(--ps-error)]" />
        <span className="text-red-400">未接続</span>
      </div>
    )
  }

  const isLocal = backend.mode === 'local'
  const vendor = backend.gpuVendor

  // ベンダーごとの色設定
  const vendorColors: Record<string, string> = {
    nvidia: 'text-green-400',
    amd: 'text-red-400',
    intel: 'text-blue-400',
    unknown: 'text-yellow-400',
  }

  // ベンダーごとのラベル
  const vendorLabels: Record<string, string> = {
    nvidia: 'CUDA',
    amd: 'DirectML',
    intel: 'DirectML',
    unknown: 'CPU',
  }

  // バッジの背景色
  const badgeBg = isLocal
    ? backend.cudaAvailable
      ? 'bg-green-900/30 border-green-700/50'
      : backend.directmlAvailable
        ? 'bg-red-900/30 border-red-700/50'
        : 'bg-yellow-900/30 border-yellow-700/50'
    : 'bg-blue-900/30 border-blue-700/50'

  // インジケーターの色
  const indicatorColor = isLocal
    ? backend.cudaAvailable
      ? 'bg-green-400'
      : backend.directmlAvailable
        ? 'bg-red-400'
        : 'bg-yellow-400'
    : 'bg-blue-400'

  // ツールチップ用の詳細情報
  const tooltipText = isLocal
    ? (backend.gpuInfo || backend.gpuName || 'ローカル環境で実行中')
    : 'クリックしてローカル起動方法を表示'

  const handleClick = () => {
    if (!isLocal) {
      onLocalClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${badgeBg} ${!isLocal ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
      title={tooltipText}
    >
      <div className={`w-2 h-2 rounded-full ${indicatorColor}`} />
      <span>
        {isLocal ? (
          <>
            <span className="text-[var(--ps-text-muted)]">ローカル</span>
            <span className="mx-1 text-[var(--ps-text-muted)]">|</span>
            <span className={vendorColors[vendor] || vendorColors.unknown}>
              {vendorLabels[vendor] || 'CPU'}
            </span>
            {backend.gpuName && (
              <>
                <span className="mx-1 text-[var(--ps-text-muted)]">|</span>
                <span className="truncate max-w-[100px]" title={backend.gpuName}>
                  {shortenGpuName(backend.gpuName)}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="text-blue-400">クラウド</span>
            <span className="mx-1 text-[var(--ps-text-muted)]">|</span>
            <span className="text-[var(--ps-text-muted)]">HuggingFace</span>
          </>
        )}
      </span>
    </button>
  )
}

// GPU名を短縮
function shortenGpuName(name: string): string {
  return name
    .replace('NVIDIA GeForce ', '')
    .replace('AMD Radeon ', '')
    .replace('Intel ', '')
    .replace('(TM)', '')
    .replace('(R)', '')
    .replace('Graphics', '')
    .trim()
    .slice(0, 20)
}

// ローカル起動モーダル
function LocalLaunchModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [os, setOs] = useState<'windows' | 'mac' | 'linux'>('windows')

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('mac')) {
      setOs('mac')
    } else if (userAgent.includes('linux')) {
      setOs('linux')
    } else {
      setOs('windows')
    }
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    }
  }, [])

  const commands = {
    clone: 'git clone https://github.com/your-repo/Qwen-Image-Edit-2511.git',
    install: 'cd Qwen-Image-Edit-2511 && npm install && pip install -r python/requirements.txt',
    run: os === 'windows' ? 'start_local.bat' : './start_local.sh',
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--ps-bg-medium)] border border-[var(--ps-border)] rounded-lg shadow-2xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--ps-border)]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--ps-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            ローカル環境で実行
          </h2>
          <button onClick={onClose} className="text-[var(--ps-text-muted)] hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
            <h3 className="font-medium text-green-400 mb-2">ローカル実行のメリット</h3>
            <ul className="text-sm text-[var(--ps-text-muted)] space-y-1">
              <li>• 安全フィルターなし - 自由な画像生成</li>
              <li>• 高速処理 - ネットワーク遅延なし</li>
              <li>• プライバシー - データがローカルで完結</li>
              <li>• 無制限 - API制限なし</li>
            </ul>
          </div>

          <div className="flex gap-2">
            {(['windows', 'mac', 'linux'] as const).map(osType => (
              <button
                key={osType}
                onClick={() => setOs(osType)}
                className={`px-3 py-1.5 rounded text-sm ${os === osType ? 'bg-[var(--ps-accent)] text-white' : 'bg-[var(--ps-bg-light)] text-[var(--ps-text-muted)]'}`}
              >
                {osType === 'windows' ? 'Windows' : osType === 'mac' ? 'macOS' : 'Linux'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">1. セットアップスクリプトをダウンロード</h3>
            {os === 'windows' && (
              <a
                href="/downloads/setup_local.bat"
                download
                className="flex items-center justify-center gap-2 px-4 py-3 rounded text-sm bg-green-600 text-white hover:bg-green-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                setup_local.bat (自動インストール)
              </a>
            )}
            <p className="text-xs text-center text-[var(--ps-text-muted)]">
              {os === 'windows' 
                ? 'ダウンロード後、ダブルクリックで実行。インストール先を選択できます。'
                : 'リポジトリをクローン後、start_local.shを実行してください。'}
            </p>
            <div className="flex gap-2 mt-2">
              <a
                href="/downloads/start_local.bat"
                download
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs ${os === 'windows' ? 'bg-[var(--ps-bg-light)] text-[var(--ps-text-muted)]' : 'bg-[var(--ps-bg-light)] text-[var(--ps-text-muted)]'}`}
              >
                start_local.bat
              </a>
              <a
                href="/downloads/start_local.sh"
                download
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs ${os !== 'windows' ? 'bg-[var(--ps-accent)] text-white' : 'bg-[var(--ps-bg-light)] text-[var(--ps-text-muted)]'}`}
              >
                start_local.sh
              </a>
            </div>
            <a
              href="/downloads/LOCAL_SETUP.md"
              download
              className="block text-center text-xs text-[var(--ps-accent)] hover:underline mt-1"
            >
              詳細なセットアップガイド (LOCAL_SETUP.md)
            </a>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">2. クイックスタート</h3>
            <div className="space-y-2">
              <div className="bg-[var(--ps-bg-dark)] rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--ps-text-muted)]">リポジトリをクローン</span>
                  <button
                    onClick={() => copyToClipboard(commands.clone, 'clone')}
                    className="text-xs text-[var(--ps-accent)] hover:underline"
                  >
                    {copied === 'clone' ? 'コピーしました!' : 'コピー'}
                  </button>
                </div>
                <code className="text-xs text-green-400 break-all">{commands.clone}</code>
              </div>

              <div className="bg-[var(--ps-bg-dark)] rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--ps-text-muted)]">依存関係をインストール</span>
                  <button
                    onClick={() => copyToClipboard(commands.install, 'install')}
                    className="text-xs text-[var(--ps-accent)] hover:underline"
                  >
                    {copied === 'install' ? 'コピーしました!' : 'コピー'}
                  </button>
                </div>
                <code className="text-xs text-green-400 break-all">{commands.install}</code>
              </div>

              <div className="bg-[var(--ps-bg-dark)] rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--ps-text-muted)]">サーバーを起動</span>
                  <button
                    onClick={() => copyToClipboard(commands.run, 'run')}
                    className="text-xs text-[var(--ps-accent)] hover:underline"
                  >
                    {copied === 'run' ? 'コピーしました!' : 'コピー'}
                  </button>
                </div>
                <code className="text-xs text-green-400 break-all">{commands.run}</code>
              </div>
            </div>
          </div>

          <div className="bg-[var(--ps-bg-light)] rounded p-3">
            <h3 className="font-medium mb-2">必要スペック</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-[var(--ps-text-muted)]">
              <div><span className="text-[var(--ps-text)]">GPU:</span> NVIDIA 8GB+ VRAM</div>
              <div><span className="text-[var(--ps-text)]">RAM:</span> 16GB+</div>
              <div><span className="text-[var(--ps-text)]">Python:</span> 3.10+</div>
              <div><span className="text-[var(--ps-text)]">CUDA:</span> 11.8+</div>
            </div>
          </div>

          <a
            href="/local-setup"
            className="block w-full text-center py-2 bg-[var(--ps-accent)] text-white rounded hover:opacity-90"
          >
            詳細なセットアップページを開く
          </a>
        </div>
      </div>
    </div>
  )
}
