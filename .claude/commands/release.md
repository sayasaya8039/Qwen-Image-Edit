---
description: GitHub Releasesにリリース作成
allowed-tools: Bash(git:*), Bash(gh:*), Read, Glob
argument-hint: [バージョン]
---

GitHub Releasesにリリースを作成します。

## 配布ファイル

**exe、zip、crxファイルはGitHub Releasesで配布:**

| ファイル形式 | 用途 | 配布方法 |
|-------------|------|----------|
| .exe | Windowsアプリ | GitHub Releases |
| .zip | Chrome拡張機能 | GitHub Releases |
| .crx | Chrome拡張パッケージ | GitHub Releases |

## 実行内容

### 1. 事前チェック
- 未コミットの変更がないか確認
- バージョン番号の確認
- ビルド済みか確認

### 2. タグ作成
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 3. リリース作成
```bash
# Windowsアプリ
gh release create vX.Y.Z ./AppName/*.exe --title "vX.Y.Z"

# Chrome拡張機能
gh release create vX.Y.Z ./AppName/*.zip ./AppName/*.crx --title "vX.Y.Z"
```

## リリースノート自動生成

- 🆕 新機能
- 🐛 バグ修正
- ⚡ パフォーマンス改善
- 📝 ドキュメント

## オプション

- `--draft`: ドラフトとして作成
- `--prerelease`: プレリリース

$ARGUMENTS でバージョンを指定（例: v1.2.0）
