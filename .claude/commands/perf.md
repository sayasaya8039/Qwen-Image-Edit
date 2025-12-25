---
description: パフォーマンス計測
allowed-tools: Bash(bun:*), Bash(bunx:*), Bash(node:*), Read, Glob
argument-hint: [ファイル/URL]
---

パフォーマンスを計測・分析します。

## 実行内容

1. **計測**
   - バンドルサイズ分析
   - 実行時間計測
   - メモリ使用量

2. **ボトルネック特定**
   - 遅い処理の検出
   - 大きなファイルの特定
   - 不要な依存関係

3. **最適化提案**
   - 具体的な改善策
   - 優先度付け

## 計測項目

| 項目 | ツール |
|------|--------|
| バンドルサイズ | vite-bundle-visualizer |
| Lighthouse | lighthouse-ci |
| 実行時間 | console.time |
| メモリ | Chrome DevTools |

## コマンド



## オプション

- : バンドルサイズのみ
- : 実行時間のみ
- : メモリ使用量のみ

$ARGUMENTS で対象を指定。

## 目標値

| 項目 | 目標 |
|------|------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| バンドル | < 200KB (gzip) |