import spaces
import gradio as gr
import torch
import random
import time
from diffusers import DiffusionPipeline

# ランダムシードを時間ベースで初期化
random.seed(time.time())

# グローバル変数でパイプラインをキャッシュ
pipe = None

def load_pipeline():
    global pipe
    if pipe is None:
        pipe = DiffusionPipeline.from_pretrained(
            "cagliostrolab/animagine-xl-3.1",
            torch_dtype=torch.float16,
            use_safetensors=True,
        )
        pipe.to("cuda")
    return pipe

@spaces.GPU(duration=120)
def generate(
    prompt: str,
    negative_prompt: str = "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
    seed: int = 0,
    randomize_seed: bool = True,
    width: int = 1024,
    height: int = 1024,
    guidance_scale: float = 7.0,
    num_inference_steps: int = 28,
):
    """Animagine XL 3.1 画像生成"""
    if randomize_seed:
        seed = random.randint(0, 2**32 - 1)

    generator = torch.Generator("cuda").manual_seed(int(seed))

    pipeline = load_pipeline()

    # 品質タグを自動追加
    quality_tags = "masterpiece, best quality, very aesthetic, absurdres"
    full_prompt = f"{quality_tags}, {prompt}"

    image = pipeline(
        prompt=full_prompt,
        negative_prompt=negative_prompt,
        width=width,
        height=height,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        generator=generator,
    ).images[0]

    return image, int(seed)

# Gradio UI
with gr.Blocks() as demo:
    gr.Markdown("# Animagine XL 3.1 - Anime Image Generation")
    gr.Markdown("高品質なアニメ画像を生成（Danbooru タグ推奨）")

    with gr.Row():
        with gr.Column():
            prompt = gr.Textbox(
                label="Prompt",
                placeholder="1girl, solo, blue hair, blue eyes, smile, looking at viewer",
                lines=3
            )
            negative_prompt = gr.Textbox(
                label="Negative Prompt",
                value="lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, blurry",
                lines=2
            )
            with gr.Row():
                seed = gr.Number(label="Seed", value=0, precision=0)
                randomize_seed = gr.Checkbox(label="Randomize Seed", value=True)
            with gr.Row():
                width = gr.Slider(label="Width", minimum=512, maximum=1536, step=64, value=1024)
                height = gr.Slider(label="Height", minimum=512, maximum=1536, step=64, value=1024)
            with gr.Row():
                guidance_scale = gr.Slider(label="Guidance Scale", minimum=1, maximum=12, step=0.5, value=7)
                num_steps = gr.Slider(label="Steps", minimum=20, maximum=50, step=1, value=28)
            generate_btn = gr.Button("Generate", variant="primary")

        with gr.Column():
            output_image = gr.Image(label="Generated Image", type="pil")
            output_seed = gr.Number(label="Used Seed", precision=0)

    generate_btn.click(
        fn=generate,
        inputs=[prompt, negative_prompt, seed, randomize_seed, width, height, guidance_scale, num_steps],
        outputs=[output_image, output_seed]
    )

demo.queue().launch()
