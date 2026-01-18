# HANDOFF.md - プロジェクト引き継ぎドキュメント

## プロジェクト概要

**プロジェクト名**: Qwen-Image-Edit  
**バージョン**: v2.0.0  
**最終更新**: 2026年1月18日

### 主な機能
- ローカルAI画像生成（Transformers.js）
- マルチバックエンド自動選択（CPU/WebGPU/Cloud）
- 自動フォールバック機能
- CUDAカーネル処理統合

---

## 現在の状態

### ✅ 完了済み（Phase 1-7）

#### Phase 1: バックエンドシステム設計 ✅
- `src/lib/backends/types.ts` - 型定義
- `src/lib/backends/selector.ts` - BackendSelector（スコアリング自動選択）
- `src/lib/backends/fallback.ts` - FallbackEngine（サーキットブレーカーパターン）
- `src/lib/backends/memory-manager.ts` - MemoryManager（LRU、OOM対策）

#### Phase 2: Transformers.js統合 ✅
- `src/lib/backends/transformers-wasm.ts` - CPU backend（Wasm）
- `src/lib/backends/transformers-webgpu.ts` - GPU backend（WebGPU）

#### Phase 3: クラウドフォールバック ✅
- `src/lib/backends/cloud.ts` - Hugging Face API統合

#### Phase 4: メモリ管理・フォールバック ✅
- MemoryManager完成（LRU、OOM検知）
- FallbackEngine完成（自動リトライ、サーキットブレーカー）

#### Phase 5: UI統合 ✅
- `src/hooks/useBackend.ts` - React hook作成
- `src/App.tsx` - useBackend統合、画像生成処理変更
- `src/components/StatusBar.tsx` - バックエンド状態表示追加

#### Phase 6: 統合テスト・デバッグ ✅
- TypeScriptビルド成功確認
- バージョン更新（1.5.0 → 2.0.0）

#### Phase 7: ビルド・デプロイ ✅
- 本番ビルド完了
- Cloudflare Workersへデプロイ完了
- デプロイURL確認: https://qwen-image-edit.sayasaya.workers.dev/

---

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| UI | Tailwind CSS |
| ローカルAI | Transformers.js (Wasm/WebGPU) |
| クラウドAI | Hugging Face API |
| デプロイ | Cloudflare Workers + KV |
| パッケージ管理 | Bun 1.3+ |
| ビルドツール | Vite + AssemblyScript |

---

## アーキテクチャ

### バックエンドシステム

```
useBackend Hook
    ↓
BackendSelector (自動選択)
    ↓
FallbackEngine (自動フォールバック)
    ↓
┌─────────────┬──────────────┬─────────┐
│Transformers │Transformers  │ Cloud   │
│Wasm (CPU)   │WebGPU (GPU)  │ API     │
└─────────────┴──────────────┴─────────┘
```

### 選択基準（BackendSelector）

| 基準 | 説明 |
|------|------|
| オフライン優先 | preferOffline=true時はローカル優先 |
| 速度優先 | prioritizeSpeed=true時は高速バックエンド優先 |
| モデルサイズ | メモリ制約を考慮 |
| 成功率 | 過去の成功率でスコアリング |

### フォールバック機能（FallbackEngine）

| 機能 | 詳細 |
|------|------|
| サーキットブレーカー | 50%失敗率で次のバックエンドへ |
| タイムアウト | 60秒でタイムアウト |
| OOM対策 | メモリ不足時にパラメータ75%縮小 |

---

## 次のステップ

### Phase 8: ブラウザテスト（優先度: 高）
- [ ] ブラウザでアプリを開く
- [ ] バックエンド初期化を確認
- [ ] 画像生成を実行（プロンプト入力）
- [ ] フォールバック動作を確認
- [ ] エラーハンドリングを確認

### Phase 9: パフォーマンス最適化（優先度: 中）
- [ ] 初回モデルロード時間を短縮
- [ ] メモリ使用量を監視
- [ ] WebGPU検出ロジックを改善

### Phase 10: ドキュメント整備（優先度: 低）
- [ ] README.md更新
- [ ] 使い方ガイド作成

---

## 重要な設定・環境変数

| 変数 | 説明 |
|------|------|
| `HUGGINGFACE_TOKEN` | Hugging Face APIトークン（オプション） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflareアカウント ID |

---

## トラブルシューティング

### ビルドエラー
```bash
cd D:/NEXTCLOUD/Web_app/Qwen-Image-Edit-2511
bun install
bun run build
```

### デプロイエラー
```bash
wrangler deploy
```

### ローカル開発
```bash
bun run dev
```

---

## 連絡先・参考資料

- プロジェクトディレクトリ: `D:/NEXTCLOUD/Web_app/Qwen-Image-Edit-2511`
- デプロイURL: https://qwen-image-edit.sayasaya.workers.dev/
- Transformers.js: https://huggingface.co/docs/transformers.js
