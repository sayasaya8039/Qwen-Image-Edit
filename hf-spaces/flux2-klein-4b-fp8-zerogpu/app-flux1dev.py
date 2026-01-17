import gradio as gr
import torch
from diffusers import FluxPipeline
import spaces
from PIL import Image
import numpy as np
import traceback

# テスト用: FLUX.1-dev（動作確認済み）
MODEL_ID = "black-forest-labs/FLUX.1-dev"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# グローバルパイプライン
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
            raise gr.Error(f"モデルのロードに失敗: {str(e)}")
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
    try:
        if not prompt:
            raise gr.Error("プロンプトを入力してください")
        
        print(f"Prompt: {prompt}, Size: {width}x{height}, Steps: {num_inference_steps}")
        
        pipeline = load_pipeline()
        
        if seed == -1:
            seed = np.random.randint(0, 2**32 - 1)
        generator = torch.Generator(device=DEVICE).manual_seed(seed)
        
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
        print(f"Generated with seed: {seed}")
        return image
        
    except Exception as e:
        error_msg = f"生成エラー: {str(e)}"
        print(f"ERROR: {error_msg}")
        print(traceback.format_exc())
        raise gr.Error(error_msg)

with gr.Blocks(theme=gr.themes.Soft(), title="FLUX.1-dev Test") as demo:
    gr.Markdown("# 🧪 FLUX.1-dev Test (動作確認用)")
    
    with gr.Row():
        with gr.Column():
            prompt = gr.Textbox(label="プロンプト", lines=3)
            negative_prompt = gr.Textbox(label="ネガティブプロンプト", lines=2)
            width = gr.Slider(512, 1536, 1024, 64, label="幅")
            height = gr.Slider(512, 1536, 1024, 64, label="高さ")
            num_steps = gr.Slider(1, 50, 20, 1, label="ステップ数")
            guidance = gr.Slider(1.0, 15.0, 3.5, 0.1, label="ガイダンス")
            seed = gr.Number(label="シード", value=-1, precision=0)
            generate_btn = gr.Button("生成", variant="primary")
        
        with gr.Column():
            output_image = gr.Image(label="生成画像", type="pil")
    
    generate_btn.click(
        fn=generate_image,
        inputs=[prompt, negative_prompt, width, height, num_steps, guidance, seed],
        outputs=output_image
    )

if __name__ == "__main__":
    demo.queue(max_size=20)
    demo.launch()
