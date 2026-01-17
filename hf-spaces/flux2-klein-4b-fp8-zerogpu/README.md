---
title: FLUX.2 Klein 4B (FP8) - ZeroGPU
emoji: 🎨
colorFrom: purple
colorTo: pink
sdk: gradio
sdk_version: 5.10.0
app_file: app.py
pinned: false
license: other
short_description: Lightweight FLUX.2 Klein 4B image generation on ZeroGPU
---

# 🎨 FLUX.2 Klein 4B (FP8) - Image Generator

Black Forest Labsの軽量画像生成モデル **FLUX.2 Klein 4B (FP8)** を使用した画像生成Space

## ⚡ 特徴

- **軽量モデル**: 4Bパラメータで高速生成
- **FP8量子化**: 8GB VRAMで動作可能
- **高品質**: FLUX.2アーキテクチャによる優れた画質
- **ZeroGPU**: HuggingFaceの無料GPU環境で動作

## 🚀 使い方

1. **プロンプト入力**: 生成したい画像の説明を英語で入力
2. **パラメータ調整**: 画像サイズ、ステップ数、ガイダンスを調整（オプション）
3. **生成**: ボタンをクリックして画像を生成

## ⚙️ モデル情報

| 項目 | 内容 |
|------|------|
| モデル | black-forest-labs/FLUX.2-klein-4b-fp8 |
| パラメータ数 | 4B（軽量版） |
| 量子化 | FP8（8ビット浮動小数点） |
| VRAM要件 | 約8GB |
| 推奨ステップ数 | 15-25 |
| 推奨ガイダンス | 3.0-5.0 |

## 📝 推奨パラメータ

### 高速生成（15秒程度）
- ステップ数: 15
- ガイダンス: 3.5
- 解像度: 1024×1024

### 高品質生成（30秒程度）
- ステップ数: 25
- ガイダンス: 4.0
- 解像度: 1024×1024 または 1536×1024

## 🎯 プロンプト例







## 🛠️ 技術スタック

- **Diffusers**: 画像生成パイプライン
- **Gradio**: WebUI
- **ZeroGPU**: HuggingFace無料GPU環境
- **PyTorch**: ディープラーニングフレームワーク

## 📄 ライセンス

このSpaceは[FLUX.2 Klein 4B (FP8)](https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8)モデルを使用しています。  
モデルのライセンスについては、モデルページをご確認ください。

## 🔗 リンク

- [FLUX.2 Klein モデル](https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8)
- [Black Forest Labs](https://blackforestlabs.ai/)
- [Diffusers ライブラリ](https://github.com/huggingface/diffusers)

---

Made with ❤️ by sayasaya8039
