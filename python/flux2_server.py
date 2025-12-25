"""
FLUX.2 [dev] FastAPI Server
32B parameter flow matching transformer for image generation/editing
Requirements: Python 3.10+, CUDA, 24GB+ VRAM (or 16GB with 4-bit quantization)
"""

import os
import io
import base64
from contextlib import asynccontextmanager
from typing import Optional, List

import torch
from PIL import Image
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Global model instance
pipe = None
device_info = {
    "device": "unknown",
    "vram_gb": 0,
    "quantization": "none"
}


def get_gpu_info():
    """Get GPU information"""
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_bytes = torch.cuda.get_device_properties(0).total_memory
        vram_gb = vram_bytes / (1024 ** 3)
        return {
            "available": True,
            "name": gpu_name,
            "vram_gb": round(vram_gb, 2)
        }
    return {"available": False, "name": None, "vram_gb": 0}


def load_flux2_model():
    """Load FLUX.2 model with appropriate settings based on VRAM"""
    global pipe, device_info

    gpu_info = get_gpu_info()
    if not gpu_info["available"]:
        raise RuntimeError("CUDA is not available. FLUX.2 requires a CUDA-capable GPU.")

    vram_gb = gpu_info["vram_gb"]
    print(f"Loading FLUX.2 model...")
    print(f"GPU: {gpu_info['name']}")
    print(f"VRAM: {vram_gb}GB")

    try:
        from diffusers import Flux2Pipeline

        # Select model variant based on VRAM
        if vram_gb >= 48:
            # Full precision for high-end GPUs
            print("Loading full precision model...")
            pipe = Flux2Pipeline.from_pretrained(
                "black-forest-labs/FLUX.2-dev",
                torch_dtype=torch.bfloat16,
            )
            device_info["quantization"] = "bf16"
        elif vram_gb >= 24:
            # 8-bit quantization
            print("Loading 8-bit quantized model...")
            from transformers import BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(load_in_8bit=True)
            pipe = Flux2Pipeline.from_pretrained(
                "black-forest-labs/FLUX.2-dev",
                quantization_config=quantization_config,
                torch_dtype=torch.bfloat16,
            )
            device_info["quantization"] = "int8"
        else:
            # 4-bit quantization for consumer GPUs (RTX 4090, etc.)
            print("Loading 4-bit quantized model (diffusers/FLUX.2-dev-bnb-4bit)...")
            pipe = Flux2Pipeline.from_pretrained(
                "diffusers/FLUX.2-dev-bnb-4bit",
                text_encoder=None,  # Use remote text encoder
                torch_dtype=torch.bfloat16,
            )
            device_info["quantization"] = "nf4"
            device_info["remote_text_encoder"] = True

        pipe.to("cuda")

        # Enable memory optimization for lower VRAM
        if vram_gb < 32:
            print("Enabling CPU offload for memory optimization...")
            pipe.enable_model_cpu_offload()

        device_info.update({
            "device": "cuda",
            "gpu_name": gpu_info["name"],
            "vram_gb": vram_gb,
        })

        print("FLUX.2 model loaded successfully!")
        return True

    except Exception as e:
        print(f"Failed to load FLUX.2 model: {e}")
        raise


# Remote text encoder for 4-bit model
async def remote_text_encode(prompt: str) -> torch.Tensor:
    """Use remote text encoder API for 4-bit model"""
    import aiohttp

    url = "https://remote-text-encoder-flux-2.huggingface.co/predict"

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json={"prompt": prompt}) as resp:
            if resp.status != 200:
                raise RuntimeError(f"Remote text encoder failed: {resp.status}")
            data = await resp.json()
            # Convert to tensor
            import numpy as np
            embeddings = torch.from_numpy(np.array(data["embeddings"])).to("cuda")
            return embeddings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for model loading"""
    try:
        load_flux2_model()
    except Exception as e:
        print(f"Warning: Could not load FLUX.2 model: {e}")
        print("Server will start but generation will fail until model is loaded.")
    yield
    # Cleanup
    global pipe
    if pipe is not None:
        del pipe
        torch.cuda.empty_cache()


app = FastAPI(
    title="FLUX.2 Server",
    description="32B parameter flow matching transformer for image generation/editing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    gpu_info = get_gpu_info()
    return {
        "status": "ok" if pipe is not None else "model_not_loaded",
        "model": "FLUX.2-dev",
        "backend": "cuda" if gpu_info["available"] else "unavailable",
        "device_info": device_info,
        "gpu": gpu_info
    }


@app.post("/generate")
async def generate(
    prompt: str = Form(...),
    negative_prompt: str = Form(default=""),
    width: int = Form(default=1024),
    height: int = Form(default=1024),
    num_inference_steps: int = Form(default=30),
    guidance_scale: float = Form(default=4.0),
    seed: int = Form(default=-1),
    image1: Optional[UploadFile] = File(default=None),
):
    """Generate or edit image using FLUX.2"""
    global pipe

    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Set seed
        if seed == -1:
            seed = torch.randint(0, 2**32, (1,)).item()

        generator = torch.Generator("cuda").manual_seed(seed)

        print(f"Generating with FLUX.2: {prompt[:50]}...")
        print(f"Size: {width}x{height}, Steps: {num_inference_steps}")

        # Prepare input images if provided
        input_images = []
        if image1:
            image_data = await image1.read()
            input_images.append(Image.open(io.BytesIO(image_data)).convert("RGB"))

        # Generate based on quantization mode
        if device_info.get("remote_text_encoder"):
            # Use remote text encoder for 4-bit model
            prompt_embeds = await remote_text_encode(prompt)
            result = pipe(
                prompt_embeds=prompt_embeds,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                generator=generator,
            )
        else:
            # Standard generation
            if input_images:
                result = pipe(
                    prompt=prompt,
                    image=input_images,
                    height=height,
                    width=width,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                )
            else:
                result = pipe(
                    prompt=prompt,
                    height=height,
                    width=width,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                )

        output_image = result.images[0]

        # Convert to base64
        buffered = io.BytesIO()
        output_image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return JSONResponse({
            "success": True,
            "image": f"data:image/png;base64,{img_base64}",
            "seed": seed,
            "backend": "flux2-cuda",
            "quantization": device_info.get("quantization", "unknown"),
            "width": width,
            "height": height
        })

    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="FLUX.2 Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host address")
    parser.add_argument("--port", type=int, default=3005, help="Port number")

    args = parser.parse_args()

    print(f"Starting FLUX.2 server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
