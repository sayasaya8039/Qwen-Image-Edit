import type { EditMode } from '../types'

interface ToolbarProps {
  editMode: EditMode
  onModeChange: (mode: EditMode) => void
}

const tools = [
  {
    id: 'generate' as EditMode,
    label: '生成',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    description: 'プロンプトから新規画像を生成',
  },
  {
    id: 'edit' as EditMode,
    label: '編集',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
    description: '1枚の画像をプロンプトに従って編集',
  },
  {
    id: 'combine' as EditMode,
    label: '合成',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    description: '2枚の画像を組み合わせて編集',
  },
]

export function Toolbar({ editMode, onModeChange }: ToolbarProps) {
  return (
    <aside className="panel w-12 flex flex-col items-center py-2 gap-1 border-r border-[var(--ps-border)]">
      <div className="text-[8px] text-[var(--ps-text-muted)] mb-2 rotate-0 writing-mode-vertical">
        モード
      </div>

      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`relative w-9 h-9 flex items-center justify-center rounded transition-colors tooltip ${
            editMode === tool.id
              ? 'bg-[var(--ps-accent)] text-white'
              : 'hover:bg-[var(--ps-bg-light)] text-[var(--ps-text)]'
          }`}
          onClick={() => onModeChange(tool.id)}
          data-tooltip={`${tool.label}: ${tool.description}`}
        >
          {tool.icon}
        </button>
      ))}

      <div className="flex-1" />

      {/* 区切り線 */}
      <div className="w-6 border-t border-[var(--ps-border)] my-2" />

      {/* その他ツール */}
      <button
        className="w-9 h-9 flex items-center justify-center rounded hover:bg-[var(--ps-bg-light)] text-[var(--ps-text)] tooltip"
        data-tooltip="ヘルプ"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </aside>
  )
}
