"""
Z-Image-Turbo FastAPI Server
High-quality text-to-image generation with sub-second latency
Requirements: Python 3.10+, CUDA, 16GB+ VRAM
"""

import os
import io
import base64
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

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


def load_zimage_model():
    """Load Z-Image-Turbo model"""
    global pipe, device_info

    gpu_info = get_gpu_info()
    if not gpu_info["available"]:
        raise RuntimeError("CUDA is not available. Z-Image-Turbo requires a CUDA-capable GPU.")

    vram_gb = gpu_info["vram_gb"]
    if vram_gb < 16:
        print(f"Warning: Z-Image-Turbo recommends 16GB+ VRAM, you have {vram_gb}GB")

    print(f"Loading Z-Image-Turbo model...")
    print(f"GPU: {gpu_info['name']}")
    print(f"VRAM: {vram_gb}GB")

    device_info = {
        "device": "cuda",
        "gpu_name": gpu_info["name"],
        "vram_gb": vram_gb,
    }

    try:
        from diffusers import ZImagePipeline

        pipe = ZImagePipeline.from_pretrained(
            "Tongyi-MAI/Z-Image-Turbo",
            torch_dtype=torch.bfloat16,
            low_cpu_mem_usage=False,
        )
        pipe.to("cuda")

        # Enable CPU offload for lower VRAM
        if vram_gb < 20:
            print("Enabling CPU offload for memory optimization...")
            pipe.enable_model_cpu_offload()

        print("Z-Image-Turbo model loaded successfully!")
        return True

    except Exception as e:
        print(f"Failed to load Z-Image-Turbo model: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for model loading"""
    try:
        load_zimage_model()
    except Exception as e:
        print(f"Warning: Could not load Z-Image-Turbo model: {e}")
        print("Server will start but generation will fail until model is loaded.")
    yield
    # Cleanup
    global pipe
    if pipe is not None:
        del pipe
        torch.cuda.empty_cache()


app = FastAPI(
    title="Z-Image-Turbo Server",
    description="High-quality text-to-image generation with sub-second latency",
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
        "model": "Z-Image-Turbo",
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
    num_inference_steps: int = Form(default=9),
    seed: int = Form(default=-1)
):
    """Generate image using Z-Image-Turbo"""
    global pipe

    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Set seed
        if seed == -1:
            seed = torch.randint(0, 2**32, (1,)).item()

        generator = torch.Generator("cuda").manual_seed(seed)

        print(f"Generating image: {prompt[:50]}...")
        print(f"Size: {width}x{height}, Steps: {num_inference_steps}")

        # Generate image
        result = pipe(
            prompt=prompt,
            height=height,
            width=width,
            num_inference_steps=num_inference_steps,
            guidance_scale=0.0,  # Must be 0 for Turbo models
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
            "backend": "zimage-cuda",
            "width": width,
            "height": height
        })

    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 解像度プリセット
RESOLUTION_PRESETS = {
    "1:1": (1024, 1024),
    "16:9": (1280, 720),
    "9:16": (720, 1280),
    "4:3": (1024, 768),
    "3:4": (768, 1024),
    "2:1": (1024, 512),
    "1:2": (512, 1024),
}


@app.post("/generate_preset")
async def generate_with_preset(
    prompt: str = Form(...),
    aspect_ratio: str = Form(default="1:1"),
    num_inference_steps: int = Form(default=9),
    seed: int = Form(default=-1)
):
    """Generate image with aspect ratio preset"""
    if aspect_ratio not in RESOLUTION_PRESETS:
        aspect_ratio = "1:1"

    width, height = RESOLUTION_PRESETS[aspect_ratio]

    # Forward to main generate function
    return await generate(
        prompt=prompt,
        negative_prompt="",
        width=width,
        height=height,
        num_inference_steps=num_inference_steps,
        seed=seed
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Z-Image-Turbo Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host address")
    parser.add_argument("--port", type=int, default=3003, help="Port number")

    args = parser.parse_args()

    print(f"Starting Z-Image-Turbo server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
