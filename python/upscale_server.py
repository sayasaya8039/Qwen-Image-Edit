"""
Image Upscale/Super-Resolution FastAPI Server
Uses Real-ESRGAN for high-quality image upscaling
Requirements: Python 3.8+, CUDA (optional, CPU fallback available)
"""

import os
import io
import base64
from contextlib import asynccontextmanager
from typing import Optional

import torch
from PIL import Image
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Global model instance
upscaler = None
device_info = {
    "device": "unknown",
    "model": "none",
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


def load_upscale_model():
    """Load Real-ESRGAN upscaler"""
    global upscaler, device_info

    gpu_info = get_gpu_info()
    device = "cuda" if gpu_info["available"] else "cpu"

    print(f"Loading Real-ESRGAN upscaler on {device}...")
    if gpu_info["available"]:
        print(f"GPU: {gpu_info['name']}")

    try:
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer

        # RealESRGAN x4 model
        model = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=23,
            num_grow_ch=32,
            scale=4
        )

        model_path = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"

        upscaler = RealESRGANer(
            scale=4,
            model_path=model_path,
            dni_weight=None,
            model=model,
            tile=0,  # 0 for no tiling, increase if OOM
            tile_pad=10,
            pre_pad=0,
            half=True if device == "cuda" else False,
            device=device
        )

        device_info = {
            "device": device,
            "model": "RealESRGAN_x4plus",
            "scale": 4,
            "gpu_name": gpu_info.get("name", "CPU"),
        }

        print("Real-ESRGAN upscaler loaded successfully!")
        return True

    except ImportError:
        print("Real-ESRGAN not installed, trying alternative...")
        return load_alternative_upscaler(device, gpu_info)
    except Exception as e:
        print(f"Failed to load Real-ESRGAN: {e}")
        return load_alternative_upscaler(device, gpu_info)


def load_alternative_upscaler(device: str, gpu_info: dict):
    """Load alternative upscaler using diffusers"""
    global upscaler, device_info

    try:
        from diffusers import StableDiffusionUpscalePipeline

        upscaler = StableDiffusionUpscalePipeline.from_pretrained(
            "stabilityai/stable-diffusion-x4-upscaler",
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        )
        upscaler.to(device)

        if device == "cuda" and gpu_info.get("vram_gb", 0) < 8:
            upscaler.enable_model_cpu_offload()

        device_info = {
            "device": device,
            "model": "sd-x4-upscaler",
            "scale": 4,
            "gpu_name": gpu_info.get("name", "CPU"),
        }

        print("SD x4 Upscaler loaded successfully!")
        return True

    except Exception as e:
        print(f"Failed to load alternative upscaler: {e}")
        raise RuntimeError("No upscaler available")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for model loading"""
    try:
        load_upscale_model()
    except Exception as e:
        print(f"Warning: Could not load upscaler: {e}")
        print("Server will start but upscaling will fail until model is loaded.")
    yield
    # Cleanup
    global upscaler
    if upscaler is not None:
        del upscaler
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


app = FastAPI(
    title="Image Upscale Server",
    description="High-quality image super-resolution using Real-ESRGAN or SD Upscaler",
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
        "status": "ok" if upscaler is not None else "model_not_loaded",
        "model": device_info.get("model", "none"),
        "backend": device_info.get("device", "unavailable"),
        "scale": device_info.get("scale", 4),
        "device_info": device_info,
        "gpu": gpu_info
    }


@app.post("/upscale")
async def upscale_image(
    image: UploadFile = File(...),
    scale: int = Form(default=4),
    prompt: str = Form(default="high quality, detailed"),
):
    """Upscale an image"""
    global upscaler

    if upscaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Load input image
        image_data = await image.read()
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")

        original_size = input_image.size
        print(f"Upscaling image from {original_size[0]}x{original_size[1]}...")

        # Check model type and upscale
        if device_info.get("model") == "RealESRGAN_x4plus":
            # Real-ESRGAN
            img_np = np.array(input_image)
            output_np, _ = upscaler.enhance(img_np, outscale=scale)
            output_image = Image.fromarray(output_np)
        else:
            # SD Upscaler
            output_image = upscaler(
                prompt=prompt,
                image=input_image,
            ).images[0]

        new_size = output_image.size
        print(f"Upscaled to {new_size[0]}x{new_size[1]}")

        # Convert to base64
        buffered = io.BytesIO()
        output_image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return JSONResponse({
            "success": True,
            "image": f"data:image/png;base64,{img_base64}",
            "original_size": list(original_size),
            "upscaled_size": list(new_size),
            "scale": scale,
            "backend": device_info.get("model", "unknown"),
        })

    except Exception as e:
        print(f"Upscale error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Image Upscale Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host address")
    parser.add_argument("--port", type=int, default=3004, help="Port number")

    args = parser.parse_args()

    print(f"Starting Upscale server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
