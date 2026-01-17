import spaces
import gradio as gr
import torch
import random
import time
from diffusers import AutoPipelineForText2Image

# ランダムシードを時間ベースで初期化
random.seed(time.time())

# グローバル変数でパイプラインをキャッシュ
pipe = None

def load_pipeline():
    global pipe
    if pipe is None:
        pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        pipe.to("cuda")
    return pipe

@spaces.GPU
def generate(
    prompt: str,
    seed: int = 0,
    randomize_seed: bool = True,
    steps: int = 1,
):
    """SDXL Turbo画像生成"""
    if randomize_seed:
        # Python randomを使用（torchのランダム状態はZeroGPUで固定されることがある）
        seed = random.randint(0, 2**32 - 1)

    generator = torch.Generator("cuda").manual_seed(int(seed))

    pipeline = load_pipeline()

    # SDXL Turboは guidance_scale=0.0 が必須
    image = pipeline(
        prompt=prompt,
        num_inference_steps=steps,
        guidance_scale=0.0,
        generator=generator,
        width=512,
        height=512,
    ).images[0]

    return image, int(seed)

# Gradio UI
with gr.Blocks() as demo:
    gr.Markdown("# SDXL Turbo - Ultra Fast Image Generation")
    gr.Markdown("1-4ステップで高品質画像を生成（512x512）")

    with gr.Row():
        with gr.Column():
            prompt = gr.Textbox(
                label="Prompt",
                placeholder="A cinematic shot of a baby raccoon...",
                lines=2
            )
            with gr.Row():
                seed = gr.Number(label="Seed", value=0, precision=0)
                randomize_seed = gr.Checkbox(label="Randomize Seed", value=True)
            steps = gr.Slider(
                label="Steps",
                minimum=1,
                maximum=4,
                step=1,
                value=1
            )
            generate_btn = gr.Button("Generate", variant="primary")

        with gr.Column():
            output_image = gr.Image(label="Generated Image", type="pil")
            output_seed = gr.Number(label="Used Seed", precision=0)

    generate_btn.click(
        fn=generate,
        inputs=[prompt, seed, randomize_seed, steps],
        outputs=[output_image, output_seed]
    )

demo.queue().launch()
