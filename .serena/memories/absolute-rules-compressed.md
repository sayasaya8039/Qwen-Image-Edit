# 絶対遵守ルール（コンテキスト圧縮後も維持）

## 🔴 Tier 0 - 最重要
| ルール | 内容 |
|--------|------|
| **Gemini協力** | 複雑な実装・エラー・API調査は必ずGeminiに相談 |
| **ファイル書込** | Write/Edit禁止→JSスクリプト経由（temp-write.js） |
| **Antigravity連携** | ハイブリッド開発、MCP共有 |
| **日本語回答** | 例外なし |
| **Git自動コミット** | 変更後即座にcommit/push |

## 🟠 Tier 1 - 必須
| ルール | 内容 |
|--------|------|
| **bnmp優先** | npm/npx→bnmp自動リダイレクト |
| **確認なし実行** | Yes/No確認せずタスク完了まで |
| **バージョン更新** | アプリ更新時は必ずバージョンアップ |
| **最新モデル確認** | AI API実装前にWebSearchで確認 |

## Gemini CLI
```
"C:\Users\Owner\AppData\Roaming\npm\gemini.cmd" "質問"
```

## JSスクリプト書き込み
```
1. Write → C:/Users/Owner/.local/bin/temp-write.js
2. Bash → node temp-write.js
3. Bash → rm temp-write.js
```

## 三位一体
- 人間：意思決定者
- Claude Code：実装・実行者
- Gemini CLI：API調査・Web検索・壁打ち
