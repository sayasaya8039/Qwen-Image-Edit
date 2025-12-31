# 【無料公開】複数のAIモデルに対応した画像生成・編集Webアプリを作った話

## はじめに

こんにちは！今回は、Qwen、BAGEL、FLUX.2など複数のAI画像生成モデルに対応したWebアプリケーション「**Qwen Image Edit**」を開発したので紹介します。

**デモサイト**: https://qwen-image-edit.sayasaya.workers.dev

インストール不要で、今すぐブラウザから使えます！

---

## 🎨 何ができるの？

このアプリでは、以下の機能が使えます：

### 1. 画像生成（Text-to-Image）
プロンプト（テキスト）から新しい画像を生成できます。

```
プロンプト例: A beautiful sunset over the ocean with vibrant orange and purple colors
```

### 2. 画像編集（Image Editing）
既存の画像をプロンプトに従って編集できます。

```
プロンプト例: Change the background to a forest, keep the person
```

### 3. 画像合成（Image Composition）
複数の画像を組み合わせて新しい画像を作れます。

```
プロンプト例: Combine the person from image 1 with the background from image 2
```

### 4. 超解像度（Upscaling）
画像を4倍に高画質化できます（Real-ESRGAN使用）。

---

## 🤖 対応しているAIモデル

### クラウドで使えるモデル（無料）

| モデル名 | 特徴 |
|---------|------|
| **Qwen-Image-Edit-2511** | Alibaba製。画像編集が得意 |
| **BAGEL-7B-MoT** | ByteDance製。生成・編集・理解すべて対応 |
| **Z-Image-Turbo** | Tongyi製。とにかく高速 |
| **FLUX.2 [dev]** | 最新の32Bモデル。高品質 |

### ローカルGPU専用モデル

自分のPCにGPUがある場合は、以下のモデルも使えます：

- **Real-ESRGAN** - 超解像度（NVIDIA GPU）
- **Real-ESRGAN ncnn** - 超解像度（AMD/Intel GPU対応！）
- **Stable Diffusion ONNX** - DirectML対応
- **FLUX.1 ONNX** - ONNX最適化版
- **BAGEL INT8** - 量子化版（VRAMが少なくても動く）

---

## 🛠️ 技術スタック

開発に使った技術を紹介します：

### フロントエンド
- **React 19** - 最新のReact
- **TypeScript** - 型安全
- **Tailwind CSS** - スタイリング
- **Vite** - 高速ビルド

### バックエンド
- **Hono** - 軽量Webフレームワーク
- **Bun** - 高速JavaScriptランタイム
- **Cloudflare Workers** - エッジデプロイ

### AI推論
- **HuggingFace Spaces** - クラウドGPU
- **Gradio API** - モデル呼び出し

---

## 💡 開発で工夫したポイント

### 1. PhotoShop風のUI

Adobe製品を意識したダークテーマのUIを採用しました。プロパティパネル、ツールバー、キャンバスという馴染みのあるレイアウトで、直感的に操作できます。

### 2. フォールバック機構

ローカルサーバーが起動していない場合は、自動的にクラウド（HuggingFace Spaces）にフォールバックします。これにより、環境を問わず利用できます。

### 3. 日本語プロンプトの自動翻訳

日本語のプロンプトを入力しても、自動的に英語に翻訳してからモデルに送信します。

```typescript
// 日本語を含むかチェック
function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}
```

### 4. ncnn/ONNX対応

NVIDIA以外のGPU（AMD、Intel）でも動作するように、ncnnやONNXに対応しました。これにより、より多くのユーザーがローカルGPUを活用できます。

---

## 🚀 使い方

### オンライン版（推奨）

1. https://qwen-image-edit.sayasaya.workers.dev にアクセス
2. モードを選択（生成/編集/合成）
3. プロンプトを入力
4. 「生成する」をクリック
5. 完成した画像をダウンロード

### ローカル版

```bash
# クローン
git clone https://github.com/sayasaya8039/Qwen-Image-Edit.git
cd Qwen-Image-Edit

# インストール
bun install

# 起動
bun run dev
```

http://localhost:5173 でアクセスできます。

---

## 📊 パフォーマンス比較

各モデルの生成時間を比較しました（512x512、クラウド実行）：

| モデル | 生成時間 | 品質 |
|--------|---------|------|
| Z-Image-Turbo | ~5秒 | ★★★☆☆ |
| BAGEL-7B-MoT | ~15秒 | ★★★★☆ |
| Qwen-Image-Edit | ~20秒 | ★★★★☆ |
| FLUX.2 [dev] | ~30秒 | ★★★★★ |

※ HuggingFace Spacesの混雑状況により変動します

---

## 🔮 今後の予定

- [ ] Stable Diffusion 3対応
- [ ] ControlNet統合
- [ ] バッチ処理機能
- [ ] 履歴・ギャラリー機能
- [ ] APIキー管理機能

---

## 🙏 使用したオープンソース

このプロジェクトは、多くのオープンソースプロジェクトの恩恵を受けています：

- [Qwen-Image-Edit-2511](https://huggingface.co/Qwen/Qwen-Image-Edit-2511) - Alibaba
- [BAGEL-7B-MoT](https://huggingface.co/ByteDance/BAGEL-7B-MoT) - ByteDance
- [FLUX.2](https://huggingface.co/black-forest-labs/FLUX.2-dev) - Black Forest Labs
- [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) - Xintao Wang
- [Hono](https://hono.dev/) - Yusuke Wada

---

## おわりに

AI画像生成の技術は日々進化しています。このアプリを通じて、最新のモデルを手軽に試せる環境を提供できればと思っています。

ソースコードはGitHubで公開しています：
👉 https://github.com/sayasaya8039/Qwen-Image-Edit

スター⭐をいただけると励みになります！

質問やフィードバックがあれば、コメント欄やGitHub Issuesでお気軽にどうぞ。

---

#AI画像生成 #React #TypeScript #Hono #CloudflareWorkers #HuggingFace #Qwen #FLUX #BAGEL #プログラミング #Web開発
