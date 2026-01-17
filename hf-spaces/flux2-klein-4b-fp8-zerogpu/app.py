import gradio as gr
import torch
from diffusers import FluxPipeline
import spaces
from PIL import Image
import numpy as np
import traceback

# モデル設定
MODEL_ID = "black-forest-labs/FLUX.2-klein-4b-fp8"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# グローバルパイプライン（初回ロード時のみ）
pipe = None

def load_pipeline():
    """パイプラインを初期化"""
    global pipe
    if pipe is None:
        try:
            print(f"Loading {MODEL_ID}...")
            print(f"Device: {DEVICE}")
            print(f"CUDA available: {torch.cuda.is_available()}")
            
            pipe = FluxPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=torch.bfloat16
            )
            pipe.to(DEVICE)
            print("Model loaded successfully!")
        except Exception as e:
            print(f"ERROR loading model: {str(e)}")
            print(traceback.format_exc())
            raise gr.Error(f"モデルのロードに失敗しました: {str(e)}")
    return pipe

@spaces.GPU(duration=120)
def generate_image(
    prompt: str,
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    num_inference_steps: int = 20,
    guidance_scale: float = 3.5,
    seed: int = -1,
    progress=gr.Progress(track_tqdm=True)
) -> Image.Image:
    """
    FLUX.2 Klein 4B (FP8)で画像を生成
    
    Args:
        prompt: 生成する画像の説明
        negative_prompt: 避けたい要素の説明
        width: 画像の幅（8の倍数）
        height: 画像の高さ（8の倍数）
        num_inference_steps: 推論ステップ数
        guidance_scale: ガイダンススケール
        seed: ランダムシード（-1で自動）
    
    Returns:
        生成された画像
    """
    try:
        if not prompt:
            raise gr.Error("プロンプトを入力してください")
        
        print(f"\n=== Generation Request ===")
        print(f"Prompt: {prompt}")
        print(f"Size: {width}x{height}")
        print(f"Steps: {num_inference_steps}")
        print(f"Guidance: {guidance_scale}")
        
        # パイプラインロード
        pipeline = load_pipeline()
        
        # シード設定
        if seed == -1:
            seed = np.random.randint(0, 2**32 - 1)
        generator = torch.Generator(device=DEVICE).manual_seed(seed)
        
        # 画像生成
        progress(0, desc="画像生成中...")
        
        result = pipeline(
            prompt=prompt,
            negative_prompt=negative_prompt if negative_prompt else None,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            generator=generator
        )
        
        image = result.images[0]
        
        print(f"Generated image with seed: {seed}")
        return image
        
    except Exception as e:
        error_msg = f"画像生成エラー: {str(e)}"
        print(f"\n=== ERROR ===")
        print(error_msg)
        print(traceback.format_exc())
        raise gr.Error(error_msg)

# Gradio UI
with gr.Blocks(theme=gr.themes.Soft(), title="FLUX.2 Klein 4B (FP8) - ZeroGPU") as demo:
    gr.Markdown(
        """
        # 🎨 FLUX.2 Klein 4B (FP8) - Image Generator
        
        Black Forest Labsの軽量画像生成モデル **FLUX.2 Klein 4B (FP8)**  
        ZeroGPU環境で高速・高品質な画像生成を実現
        """
    )
    
    with gr.Row():
        with gr.Column(scale=1):
            prompt = gr.Textbox(
                label="プロンプト",
                placeholder="A beautiful sunset over the ocean...",
                lines=3
            )
            negative_prompt = gr.Textbox(
                label="ネガティブプロンプト（オプション）",
                placeholder="blurry, low quality, distorted...",
                lines=2
            )
            
            with gr.Row():
                width = gr.Slider(
                    label="幅",
                    minimum=512,
                    maximum=1536,
                    step=64,
                    value=1024
                )
                height = gr.Slider(
                    label="高さ",
                    minimum=512,
                    maximum=1536,
                    step=64,
                    value=1024
                )
            
            with gr.Row():
                num_steps = gr.Slider(
                    label="推論ステップ数",
                    minimum=1,
                    maximum=50,
                    step=1,
                    value=20
                )
                guidance = gr.Slider(
                    label="ガイダンススケール",
                    minimum=1.0,
                    maximum=15.0,
                    step=0.1,
                    value=3.5
                )
            
            seed = gr.Number(
                label="シード（-1でランダム）",
                value=-1,
                precision=0
            )
            
            generate_btn = gr.Button("🎨 生成", variant="primary", size="lg")
        
        with gr.Column(scale=1):
            output_image = gr.Image(
                label="生成画像",
                type="pil",
                show_label=True
            )
    
    gr.Markdown(
        """
        ## 📝 使い方
        
        1. **プロンプト入力**: 生成したい画像の説明を英語で入力
        2. **パラメータ調整**: 画像サイズ、ステップ数、ガイダンスを調整（オプション）
        3. **生成**: ボタンをクリックして画像を生成
        
        ## ⚙️ モデル情報
        
        - **モデル**: black-forest-labs/FLUX.2-klein-4b-fp8
        - **パラメータ数**: 4B（軽量版）
        - **量子化**: FP8（8ビット浮動小数点）
        - **VRAM要件**: 8GB程度
        - **推奨ステップ数**: 15-25
        - **推奨ガイダンス**: 3.0-5.0
        
        ## 🚀 特徴
        
        - ⚡ **高速生成**: 軽量4Bモデルで素早く生成
        - 🎯 **高品質**: FLUX.2アーキテクチャによる優れた画質
        - 💾 **省メモリ**: FP8量子化で効率的なVRAM使用
        - 🆓 **無料**: ZeroGPU環境で誰でも利用可能
        
        ---
        
        Made with ❤️ using [FLUX.2 Klein](https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8) | Powered by ZeroGPU
        """
    )
    
    # イベントハンドラ
    generate_btn.click(
        fn=generate_image,
        inputs=[prompt, negative_prompt, width, height, num_steps, guidance, seed],
        outputs=output_image
    )

if __name__ == "__main__":
    demo.queue(max_size=20)
    demo.launch()
