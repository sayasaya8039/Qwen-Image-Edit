"""
BAGEL-7B-MoT FastAPI Server for local CUDA inference
Requirements: Python 3.10, CUDA, 12GB+ VRAM
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
inferencer = None
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


def select_quantization(vram_gb: float) -> str:
    """Select appropriate quantization based on VRAM"""
    if vram_gb >= 32:
        return "bf16"  # Full precision
    elif vram_gb >= 22:
        return "int8"  # INT8 quantization
    elif vram_gb >= 12:
        return "nf4"   # NF4 quantization
    else:
        raise RuntimeError(f"Insufficient VRAM: {vram_gb}GB. BAGEL requires at least 12GB VRAM.")


def load_bagel_model():
    """Load BAGEL model with appropriate quantization"""
    global inferencer, device_info

    gpu_info = get_gpu_info()
    if not gpu_info["available"]:
        raise RuntimeError("CUDA is not available. BAGEL requires a CUDA-capable GPU.")

    vram_gb = gpu_info["vram_gb"]
    quantization = select_quantization(vram_gb)

    print(f"Loading BAGEL model...")
    print(f"GPU: {gpu_info['name']}")
    print(f"VRAM: {vram_gb}GB")
    print(f"Quantization: {quantization}")

    device_info = {
        "device": "cuda",
        "gpu_name": gpu_info["name"],
        "vram_gb": vram_gb,
        "quantization": quantization
    }

    try:
        from bagel.data.transforms import ImageTransform
        from bagel.inferencer import InterleaveInferencer

        # Model paths
        model_path = "ByteDance-Seed/BAGEL-7B-MoT"

        # Load with appropriate quantization
        if quantization == "bf16":
            inferencer = InterleaveInferencer(
                model_path=model_path,
                torch_dtype=torch.bfloat16,
                device_map="cuda"
            )
        elif quantization == "int8":
            from transformers import BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(
                load_in_8bit=True
            )
            inferencer = InterleaveInferencer(
                model_path=model_path,
                quantization_config=quantization_config,
                device_map="cuda"
            )
        else:  # nf4
            from transformers import BitsAndBytesConfig
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16
            )
            inferencer = InterleaveInferencer(
                model_path=model_path,
                quantization_config=quantization_config,
                device_map="cuda"
            )

        print("BAGEL model loaded successfully!")
        return True

    except Exception as e:
        print(f"Failed to load BAGEL model: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for model loading"""
    try:
        load_bagel_model()
    except Exception as e:
        print(f"Warning: Could not load BAGEL model: {e}")
        print("Server will start but generation will fail until model is loaded.")
    yield
    # Cleanup
    global inferencer
    if inferencer is not None:
        del inferencer
        torch.cuda.empty_cache()


app = FastAPI(
    title="BAGEL-7B-MoT Server",
    description="Local CUDA inference server for BAGEL multimodal model",
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
        "status": "ok" if inferencer is not None else "model_not_loaded",
        "model": "BAGEL-7B-MoT",
        "backend": "cuda" if gpu_info["available"] else "unavailable",
        "device_info": device_info,
        "gpu": gpu_info
    }


@app.post("/generate")
async def generate(
    prompt: str = Form(...),
    negative_prompt: str = Form(default=""),
    mode: str = Form(default="generate"),
    image1: Optional[UploadFile] = File(default=None),
    image2: Optional[UploadFile] = File(default=None),
    cfg_scale: float = Form(default=7.0),
    num_steps: int = Form(default=30),
    seed: int = Form(default=-1)
):
    """Generate or edit image using BAGEL"""
    global inferencer

    if inferencer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Set seed
        if seed == -1:
            seed = torch.randint(0, 2**32, (1,)).item()
        torch.manual_seed(seed)

        input_image = None

        # Load input image if provided
        if image1 is not None:
            image_data = await image1.read()
            input_image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Generate based on mode
        if mode == "generate" or input_image is None:
            # Text-to-image generation
            print(f"Generating image from prompt: {prompt[:50]}...")
            result = inferencer(
                text=prompt,
                understanding_output=False,
                cfg_text_scale=cfg_scale,
                num_timesteps=num_steps
            )
        else:
            # Image editing
            print(f"Editing image with prompt: {prompt[:50]}...")
            result = inferencer(
                image=input_image,
                text=prompt,
                understanding_output=False,
                cfg_text_scale=cfg_scale,
                cfg_image_scale=1.5,
                num_timesteps=num_steps
            )

        # Get output image
        if isinstance(result, dict) and "image" in result:
            output_image = result["image"]
        elif isinstance(result, Image.Image):
            output_image = result
        else:
            raise ValueError(f"Unexpected result type: {type(result)}")

        # Convert to base64
        buffered = io.BytesIO()
        output_image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return JSONResponse({
            "success": True,
            "image": f"data:image/png;base64,{img_base64}",
            "seed": seed,
            "backend": "bagel-cuda",
            "quantization": device_info["quantization"]
        })

    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/understand")
async def understand(
    prompt: str = Form(...),
    image: UploadFile = File(...)
):
    """Image understanding using BAGEL"""
    global inferencer

    if inferencer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Load image
        image_data = await image.read()
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Get understanding output
        result = inferencer(
            image=input_image,
            text=prompt,
            understanding_output=True
        )

        # Extract text response
        if isinstance(result, dict) and "text" in result:
            response_text = result["text"]
        elif isinstance(result, str):
            response_text = result
        else:
            response_text = str(result)

        return JSONResponse({
            "success": True,
            "response": response_text,
            "backend": "bagel-cuda"
        })

    except Exception as e:
        print(f"Understanding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="BAGEL-7B-MoT Server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host address")
    parser.add_argument("--port", type=int, default=3002, help="Port number")

    args = parser.parse_args()

    print(f"Starting BAGEL server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
