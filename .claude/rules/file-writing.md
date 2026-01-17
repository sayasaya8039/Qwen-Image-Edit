---
paths: "**/*"
alwaysApply: true
---

# ファイル書き込みルール（最重要）

> **Write/Editツールを直接使用せず、`sw` コマンドを使用すること**

## なぜswを使うのか

Write/Editツールを直接使用すると：
- バッククォートのエスケープエラー
- 特殊文字の解釈エラー
- ファイル変更検知エラー
- トークンの無駄遣い

が頻発するため、Zig製の専用CLIツール「sw」を使用する。

## sw コマンド（Safe Write CLI）

**バイナリ:** `C:\Users\Owner\.local\bin\sw.exe`（PATHに登録済み）

### 基本コマンド

| コマンド | 説明 |
|----------|------|
| `sw write <path> <content>` | ファイル書き込み（アトミック） |
| `sw b64 <path> <base64>` | Base64デコードして書き込み |
| `sw replace <path> <old> <new>` | 文字列置換 |
| `sw append <path> <content>` | ファイル追記 |
| `sw read <path>` | ファイル読み込み |
| `sw read64 <path>` | Base64でファイル読み込み |
| `sw backup <path>` | .bakバックアップ作成 |
| `sw version` | バージョン表示 |
| `sw help` | ヘルプ表示 |

### 使用例

```bash
# ファイル全体を書き込む
sw write "src/index.ts" "console.log('Hello World')"

# Base64エンコードした内容を書き込む（特殊文字が多い場合に推奨）
sw b64 "src/config.json" "eyJrZXkiOiAidmFsdWUifQ=="

# 文字列を置換する
sw replace "config.json" "localhost" "production.api.com"

# ファイルに追記する
sw append "log.txt" "New log entry"

# バックアップ作成
sw backup "important.txt"

# ファイル読み込み
sw read "src/index.ts"
```

## 禁止事項

- ❌ Write/Editツールを直接使用する
- ❌ heredocを使ったファイル書き込み
- ❌ echoリダイレクトでの複雑なファイル作成
- ❌ cat/sedでのファイル操作
- ❌ 旧ツール（sw-b64, fw, safe-write等）の使用

## 許可される代替手段

- ✅ **sw コマンド（最優先・推奨）**
- ✅ Pythonスクリプト経由（swが使えない場合のみ）
