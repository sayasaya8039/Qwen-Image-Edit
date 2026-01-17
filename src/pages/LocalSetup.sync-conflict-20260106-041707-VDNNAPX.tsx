import { Link } from 'react-router-dom'

export function LocalSetup() {
  return (
    <div className="min-h-screen bg-[var(--ps-bg-dark)] text-[var(--ps-text)]">
      {/* ヘッダー */}
      <header className="panel border-b border-[var(--ps-border)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg className="w-6 h-6 text-[var(--ps-accent)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            <span className="font-semibold">Qwen Image Edit</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-[var(--ps-accent)] hover:underline"
          >
            ← アプリに戻る
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">ローカル環境で動作させたい方へ</h1>
        <p className="text-[var(--ps-text-muted)] mb-8">
          お使いのGPUでAIモデルを実行することで、より高速で安定した画像生成が可能になります。
        </p>

        {/* メリット */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-400">✓</span>
            ローカル環境のメリット
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="panel p-4 rounded-lg border border-[var(--ps-border)]">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-medium mb-1">高速処理</h3>
              <p className="text-sm text-[var(--ps-text-muted)]">
                ネットワーク遅延なし。GPUの性能をフル活用。
              </p>
            </div>
            <div className="panel p-4 rounded-lg border border-[var(--ps-border)]">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-medium mb-1">プライバシー</h3>
              <p className="text-sm text-[var(--ps-text-muted)]">
                画像データが外部サーバーに送信されません。
              </p>
            </div>
            <div className="panel p-4 rounded-lg border border-[var(--ps-border)]">
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-medium mb-1">常時利用可能</h3>
              <p className="text-sm text-[var(--ps-text-muted)]">
                クラウドサービスの混雑や障害の影響を受けません。
              </p>
            </div>
          </div>
        </section>

        {/* ダウンロードセクション */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">ダウンロード</h2>

          {/* ランチャースクリプト */}
          <div className="panel p-6 rounded-lg border border-[var(--ps-border)] mb-4">
            <h3 className="font-medium mb-4">ランチャースクリプト</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href="/downloads/start_local.bat"
                download="start_local.bat"
                className="flex items-center gap-3 p-4 bg-[var(--ps-bg-light)] rounded-lg hover:bg-[var(--ps-accent)] hover:bg-opacity-20 transition-colors group"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium group-hover:text-[var(--ps-accent)]">
                    start_local.bat
                  </div>
                  <div className="text-sm text-[var(--ps-text-muted)]">Windows用</div>
                </div>
                <svg className="w-5 h-5 ml-auto text-[var(--ps-text-muted)] group-hover:text-[var(--ps-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>

              <a
                href="/downloads/start_local.sh"
                download="start_local.sh"
                className="flex items-center gap-3 p-4 bg-[var(--ps-bg-light)] rounded-lg hover:bg-[var(--ps-accent)] hover:bg-opacity-20 transition-colors group"
              >
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium group-hover:text-[var(--ps-accent)]">
                    start_local.sh
                  </div>
                  <div className="text-sm text-[var(--ps-text-muted)]">Linux / Mac用</div>
                </div>
                <svg className="w-5 h-5 ml-auto text-[var(--ps-text-muted)] group-hover:text-[var(--ps-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          </div>

          {/* セットアップガイド */}
          <div className="panel p-6 rounded-lg border border-[var(--ps-border)]">
            <h3 className="font-medium mb-4">セットアップガイド</h3>
            <a
              href="/downloads/LOCAL_SETUP.md"
              download="LOCAL_SETUP.md"
              className="flex items-center gap-3 p-4 bg-[var(--ps-bg-light)] rounded-lg hover:bg-[var(--ps-accent)] hover:bg-opacity-20 transition-colors group"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium group-hover:text-[var(--ps-accent)]">
                  LOCAL_SETUP.md
                </div>
                <div className="text-sm text-[var(--ps-text-muted)]">
                  詳細なセットアップ手順・トラブルシューティングガイド
                </div>
              </div>
              <svg className="w-5 h-5 text-[var(--ps-text-muted)] group-hover:text-[var(--ps-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </section>

        {/* VRAM要件 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">VRAM要件</h2>
          <div className="panel rounded-lg border border-[var(--ps-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--ps-bg-light)]">
                <tr>
                  <th className="text-left p-3 font-medium">モデル</th>
                  <th className="text-center p-3 font-medium">最小VRAM</th>
                  <th className="text-center p-3 font-medium">推奨VRAM</th>
                  <th className="text-left p-3 font-medium">機能</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--ps-border)]">
                  <td className="p-3 font-medium">Qwen-Image-Edit</td>
                  <td className="p-3 text-center text-yellow-400">8GB</td>
                  <td className="p-3 text-center text-green-400">12GB</td>
                  <td className="p-3 text-[var(--ps-text-muted)]">画像生成・編集・合成</td>
                </tr>
                <tr className="border-t border-[var(--ps-border)]">
                  <td className="p-3 font-medium">BAGEL-7B-MoT</td>
                  <td className="p-3 text-center text-yellow-400">12GB</td>
                  <td className="p-3 text-center text-green-400">24GB</td>
                  <td className="p-3 text-[var(--ps-text-muted)]">マルチモーダル生成・編集</td>
                </tr>
                <tr className="border-t border-[var(--ps-border)]">
                  <td className="p-3 font-medium">Z-Image-Turbo</td>
                  <td className="p-3 text-center text-yellow-400">16GB</td>
                  <td className="p-3 text-center text-green-400">24GB</td>
                  <td className="p-3 text-[var(--ps-text-muted)]">高速テキストから画像</td>
                </tr>
                <tr className="border-t border-[var(--ps-border)]">
                  <td className="p-3 font-medium">FLUX.2 [dev]</td>
                  <td className="p-3 text-center text-orange-400">16GB</td>
                  <td className="p-3 text-center text-green-400">48GB</td>
                  <td className="p-3 text-[var(--ps-text-muted)]">32B最先端画像生成</td>
                </tr>
                <tr className="border-t border-[var(--ps-border)]">
                  <td className="p-3 font-medium">Real-ESRGAN</td>
                  <td className="p-3 text-center text-green-400">4GB</td>
                  <td className="p-3 text-center text-green-400">8GB</td>
                  <td className="p-3 text-[var(--ps-text-muted)]">超解像度4倍</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* クイックスタート */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">クイックスタート</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Windows */}
            <div className="panel p-6 rounded-lg border border-[var(--ps-border)]">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-blue-400">🪟</span>
                Windows
              </h3>
              <ol className="text-sm space-y-2 text-[var(--ps-text-muted)]">
                <li>1. <code className="bg-[var(--ps-bg-light)] px-1 rounded">start_local.bat</code> をダウンロード</li>
                <li>2. プロジェクトフォルダに配置</li>
                <li>3. ダブルクリックで実行</li>
                <li>4. メニューから起動するサーバーを選択</li>
              </ol>
            </div>

            {/* Linux / Mac */}
            <div className="panel p-6 rounded-lg border border-[var(--ps-border)]">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-orange-400">🐧</span>
                Linux / Mac
              </h3>
              <ol className="text-sm space-y-2 text-[var(--ps-text-muted)]">
                <li>1. <code className="bg-[var(--ps-bg-light)] px-1 rounded">start_local.sh</code> をダウンロード</li>
                <li>2. プロジェクトフォルダに配置</li>
                <li>3. <code className="bg-[var(--ps-bg-light)] px-1 rounded">chmod +x start_local.sh</code></li>
                <li>4. <code className="bg-[var(--ps-bg-light)] px-1 rounded">./start_local.sh</code> で実行</li>
              </ol>
            </div>
          </div>
        </section>

        {/* 推奨ハードウェア */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">推奨ハードウェア</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="panel p-4 rounded-lg border border-[var(--ps-border)]">
              <div className="text-sm text-[var(--ps-text-muted)] mb-1">エントリー</div>
              <div className="font-medium mb-2">8-12GB VRAM</div>
              <div className="text-sm text-[var(--ps-text-muted)]">
                RTX 3060 12GB<br />
                RTX 4060 Ti 16GB
              </div>
              <div className="mt-2 text-xs text-green-400">
                Qwen, Real-ESRGAN
              </div>
            </div>
            <div className="panel p-4 rounded-lg border border-[var(--ps-accent)] border-opacity-50">
              <div className="text-sm text-[var(--ps-accent)] mb-1">ミドル（推奨）</div>
              <div className="font-medium mb-2">16-24GB VRAM</div>
              <div className="text-sm text-[var(--ps-text-muted)]">
                RTX 3090 24GB<br />
                RTX 4080 / 4090
              </div>
              <div className="mt-2 text-xs text-green-400">
                全モデル（量子化）
              </div>
            </div>
            <div className="panel p-4 rounded-lg border border-[var(--ps-border)]">
              <div className="text-sm text-[var(--ps-text-muted)] mb-1">ハイエンド</div>
              <div className="font-medium mb-2">48GB+ VRAM</div>
              <div className="text-sm text-[var(--ps-text-muted)]">
                RTX A6000<br />
                H100
              </div>
              <div className="mt-2 text-xs text-green-400">
                全モデル（フル精度）
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">よくある質問</h2>
          <div className="space-y-4">
            <details className="panel p-4 rounded-lg border border-[var(--ps-border)] cursor-pointer group">
              <summary className="font-medium list-none flex items-center justify-between">
                クラウドとローカルを切り替えられますか？
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-[var(--ps-text-muted)]">
                はい。ローカルサーバーが起動していれば自動的にローカルを使用し、起動していなければクラウドにフォールバックします。
              </p>
            </details>

            <details className="panel p-4 rounded-lg border border-[var(--ps-border)] cursor-pointer group">
              <summary className="font-medium list-none flex items-center justify-between">
                複数のモデルを同時に使えますか？
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-[var(--ps-text-muted)]">
                VRAMに余裕があれば可能です。ただし、各モデルは別々のポートで起動する必要があります。
              </p>
            </details>

            <details className="panel p-4 rounded-lg border border-[var(--ps-border)] cursor-pointer group">
              <summary className="font-medium list-none flex items-center justify-between">
                AMD GPUでも動きますか？
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-3 text-sm text-[var(--ps-text-muted)]">
                DirectML対応モデル（Stable Diffusion 1.5）のみ動作します。他のモデルはNVIDIA GPU（CUDA）が必要です。
              </p>
            </details>
          </div>
        </section>

        {/* フッター */}
        <footer className="text-center text-sm text-[var(--ps-text-muted)] pt-8 border-t border-[var(--ps-border)]">
          <p>問題が発生した場合は、<a href="https://github.com/your-repo/Qwen-Image-Edit-2511/issues" className="text-[var(--ps-accent)] hover:underline">GitHub Issues</a> でお知らせください。</p>
        </footer>
      </main>
    </div>
  )
}
