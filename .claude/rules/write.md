---
paths: "**/*"
---

ファイルの書き込み・編集をJavaScriptスクリプト経由で安全に行います。

## なぜスクリプト経由か

Write/Editツールを直接使用すると：
- バッククォートのエスケープエラー
- 特殊文字の解釈エラー
- ファイル変更検知エラー

が頻発し、トークンの無駄になる。

## 実行手順

### 1. 一時スクリプト作成

```javascript
// C:/Users/Owner/.local/bin/temp-write.js
const fs = require('fs');

const content = \`
ファイル内容をここに記述
\`;

fs.writeFileSync('対象ファイルパス', content, 'utf8');
console.log('完了');
```

### 2. 実行

```bash
node C:/Users/Owner/.local/bin/temp-write.js
```

### 3. クリーンアップ

```bash
rm C:/Users/Owner/.local/bin/temp-write.js
```

## 使用例

### 新規ファイル作成

```
/write D:/project/README.md プロジェクトのREADME
```

### 既存ファイル更新

```
/write D:/project/config.json 設定を更新
```

### 複数ファイル一括作成

```
/write D:/project/ 複数ファイルを作成
```

$ARGUMENTS でファイルパスと内容の説明を指定。
