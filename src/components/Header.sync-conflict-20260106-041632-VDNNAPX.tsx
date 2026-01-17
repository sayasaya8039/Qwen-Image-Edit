interface HeaderProps {
  onSave: (format: 'png' | 'jpeg') => void
  hasOutput: boolean
}

export function Header({ onSave, hasOutput }: HeaderProps) {
  return (
    <header className="panel flex items-center justify-between px-4 h-10 border-b border-[var(--ps-border)]">
      {/* ロゴ・タイトル */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-[var(--ps-accent)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <span className="font-semibold text-sm">Qwen Image Edit</span>
        </div>
        <span className="text-xs text-[var(--ps-text-muted)]">v1.0.0</span>
      </div>

      {/* メニュー */}
      <nav className="flex items-center gap-1">
        <MenuButton label="ファイル">
          <MenuItem
            label="PNG形式で保存"
            shortcut="Ctrl+Shift+S"
            disabled={!hasOutput}
            onClick={() => onSave('png')}
          />
          <MenuItem
            label="JPEG形式で保存"
            shortcut="Ctrl+Alt+S"
            disabled={!hasOutput}
            onClick={() => onSave('jpeg')}
          />
          <MenuDivider />
          <MenuItem label="設定" shortcut="Ctrl+," />
        </MenuButton>
        <MenuButton label="編集">
          <MenuItem label="元に戻す" shortcut="Ctrl+Z" disabled />
          <MenuItem label="やり直し" shortcut="Ctrl+Y" disabled />
        </MenuButton>
        <MenuButton label="表示">
          <MenuItem label="ズームイン" shortcut="Ctrl++" />
          <MenuItem label="ズームアウト" shortcut="Ctrl+-" />
          <MenuItem label="フィット" shortcut="Ctrl+0" />
        </MenuButton>
        <MenuButton label="ヘルプ">
          <MenuItem label="使い方" />
          <MenuItem label="バージョン情報" />
        </MenuButton>
      </nav>

            {/* ボタン */}
      <div className="flex items-center gap-3">
        <a
          href="/local-setup"
          className="text-xs text-[var(--ps-accent)] hover:underline transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          ローカル環境
        </a>
        <a
          href="/admin"
          className="text-xs text-[var(--ps-text-muted)] hover:text-[var(--ps-accent)] transition-colors"
        >
          管理者
        </a>
        <button
          className="btn-primary flex items-center gap-1.5"
          disabled={!hasOutput}
          onClick={() => onSave('png')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          保存
        </button>
      </div>
    </header>
  )
}

// サブコンポーネント
function MenuButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <button className="px-3 py-1 text-xs hover:bg-[var(--ps-bg-light)] rounded transition-colors">
        {label}
      </button>
      <div className="absolute top-full left-0 mt-1 min-w-48 bg-[var(--ps-bg-medium)] border border-[var(--ps-border)] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {children}
      </div>
    </div>
  )
}

function MenuItem({
  label,
  shortcut,
  disabled,
  onClick,
}: {
  label: string
  shortcut?: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-[var(--ps-bg-light)] ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[var(--ps-text-muted)]">{shortcut}</span>}
    </button>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-[var(--ps-border)]" />
}
