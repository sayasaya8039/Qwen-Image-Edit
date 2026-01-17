---
paths: "**/*"
---

テストコードを自動生成します。

## 実行内容

1. **対象ファイル分析**
   - 関数・クラスの抽出
   - 入出力の型を特定
   - 依存関係を確認

2. **テストケース生成**
   - 正常系テスト
   - 異常系テスト
   - エッジケーステスト

3. **テストファイル作成**
   - 適切な場所にファイル作成
   - モック・スタブの設定

## 生成されるテスト

### 正常系
- 期待通りの入力で正しい出力
- 各分岐のカバー

### 異常系
- 不正な入力でエラー
- null/undefined処理
- 空配列・空文字列

### エッジケース
- 境界値
- 大きなデータ
- 同時実行

## プロジェクト別

| プロジェクト | テストフレームワーク |
|-------------|---------------------|
| TypeScript | Bun test / Vitest / Jest |
| Python | pytest |
| Rust | cargo test |

## オプション

- `--unit`: ユニットテストのみ
- `--integration`: 統合テストのみ
- `--coverage`: カバレッジ目標を指定

$ARGUMENTS で対象ファイルを指定。

## テストファイル配置

```
src/utils/formatDate.ts
→ src/utils/formatDate.test.ts

src/components/Button.tsx
→ src/components/Button.test.tsx
```

## テスト命名規則

```typescript
describe('formatDate', () => {
  it('should format date correctly', () => {});
  it('should throw error for invalid date', () => {});
  it('should handle null input', () => {});
});
```
