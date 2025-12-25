---
description: 軽量化・最適化・高速化を意識した開発
allowed-tools: Read, Edit, Glob, Grep, Bash(bun:*), Bash(npm:*), Bash(cargo:*), Bash(python:*), mcp__context7__*
---

開発時は常に軽量化、最適化、高速化を意識します。

## 基本原則

| 原則 | 内容 |
|-----|------|
| 軽量化 | 不要な依存・コード・機能を排除 |
| 最適化 | アルゴリズム・データ構造を適切に選択 |
| 高速化 | ボトルネック特定・遅延削減 |

## コード作成時のチェックリスト

### 1. 依存関係
- [ ] 本当に必要なライブラリか
- [ ] 軽量な代替ライブラリはないか
- [ ] Tree-shakingは効くか

### 2. バンドルサイズ
- [ ] 不要なインポートはないか
- [ ] Dynamic importを使えるか
- [ ] Code splittingは適切か

### 3. 実行速度
- [ ] O(n²)以上のループはないか
- [ ] 不要な再計算はないか
- [ ] キャッシュ/メモ化を使えるか

### 4. メモリ効率
- [ ] 大きなオブジェクトのコピーを避けているか
- [ ] ストリーム処理を使えるか
- [ ] 不要な参照を保持していないか

## 言語別の最適化

### TypeScript/JavaScript
```typescript
// ❌ 避ける
import _ from 'lodash';

// ✅ 推奨
import { debounce } from 'lodash-es';
// または native実装を使う
```

### Python
```python
# ❌ 避ける
result = [x for x in large_list if condition(x)]

# ✅ 推奨（メモリ効率）
result = (x for x in large_list if condition(x))
```

### Rust
```rust
// ❌ 避ける
let v: Vec<_> = data.iter().cloned().collect();

// ✅ 推奨
let v: Vec<_> = data.iter().copied().collect();
```

## ビルド最適化

| ツール | 最適化コマンド |
|-------|---------------|
| Bun | `bun build --minify --splitting` |
| Vite | `vite build --minify` |
| Cargo | `cargo build --release` |
| Python | `python -O` / PyPy使用 |

## 常に問う質問

1. **これは本当に必要か？**
2. **もっとシンプルな方法はないか？**
3. **パフォーマンスへの影響は？**
4. **将来のメンテナンス性は？**

$ARGUMENTS で対象ファイル/ディレクトリを指定
