"""
Qwen-Image-Edit-2511 Local GPU Server
NVIDIA CUDA / AMD DirectML / Intel対応の画像生成・編集サーバー
AMD Amuseの技術を参考にDirectMLをサポート
"""

import os
import io
import base64
import logging
from typing import Optional
from contextlib import asynccontextmanager

import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from gpu_detector import detect_gpu, GPUBackend, GPUVendor, get_gpu_info_string

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# グローバル変数
pipeline = None
gpu_info = None
backend_mode = None


def load_model():
    """GPUを検出し、最適なバックエンドでモデルをロード"""
    global pipeline, gpu_info, backend_mode

    # GPU検出
    gpu_info = detect_gpu()
    logger.info(f"検出されたGPU: {get_gpu_info_string(gpu_info)}")

    if gpu_info.backend == GPUBackend.CUDA:
        _load_cuda_model()
    elif gpu_info.backend == GPUBackend.DIRECTML:
        _load_directml_model()
    else:
        _load_cpu_model()


def _load_cuda_model():
    """NVIDIA CUDA用モデルをロード"""
    global pipeline, backend_mode

    logger.info("CUDA モードでモデルをロード中...")
    backend_mode = "cuda"

    try:
        from diffusers import QwenImageEditPlusPipeline

        pipeline = QwenImageEditPlusPipeline.from_pretrained(
            "Qwen/Qwen-Image-Edit-2511",
            torch_dtype=torch.bfloat16,
        )
        pipeline.to("cuda")
        pipeline.set_progress_bar_config(disable=None)

        logger.info("CUDA モデルのロードが完了しました")
    except Exception as e:
        logger.error(f"CUDAモデルのロードに失敗: {e}")
        raise


def _load_directml_model():
    """DirectML用モデルをロード（AMD/Intel GPU）"""
    global pipeline, backend_mode

    logger.info("DirectML モードでモデルをロード中...")
    backend_mode = "directml"

    try:
        # まずONNX Runtimeのインポートを試行
        import onnxruntime as ort

        # DirectMLプロバイダーが利用可能か確認
        providers = ort.get_available_providers()
        logger.info(f"利用可能なONNX Runtimeプロバイダー: {providers}")

        if 'DmlExecutionProvider' not in providers:
            logger.warning("DirectMLプロバイダーが利用できません。CPUにフォールバック")
            _load_cpu_model()
            return

        # Optimumを使用してONNX対応パイプラインをロード
        from optimum.onnxruntime import ORTStableDiffusionPipeline

        # 注意: Qwen-Image-Edit-2511はONNX未対応の可能性が高い
        # その場合、Stable Diffusion系の代替モデルを使用
        try:
            # まずQwenモデルのONNXエクスポートを試行
            pipeline = _try_load_qwen_onnx()
        except Exception as e:
            logger.warning(f"Qwen ONNXモデル利用不可: {e}")
            logger.info("代替モデル (Stable Diffusion) を使用")
            pipeline = _load_alternative_onnx_model()

        logger.info("DirectML モデルのロードが完了しました")

    except ImportError as e:
        logger.warning(f"ONNX Runtime未インストール: {e}")
        _load_cpu_model()
    except Exception as e:
        logger.error(f"DirectMLモデルのロードに失敗: {e}")
        _load_cpu_model()


def _try_load_qwen_onnx():
    """Qwen ONNXモデルのロードを試行（将来の対応用）"""
    # 現時点ではQwen-Image-Edit-2511のONNXバージョンは存在しない可能性が高い
    # 将来のアップデートで対応される可能性あり
    raise NotImplementedError("Qwen ONNX model not yet available")


def _load_alternative_onnx_model():
    """代替のONNX対応モデルをロード"""
    global backend_mode

    from optimum.onnxruntime import ORTStableDiffusionPipeline

    # Stable Diffusion 1.5 (ONNX最適化済み)
    model_id = "runwayml/stable-diffusion-v1-5"

    pipeline = ORTStableDiffusionPipeline.from_pretrained(
        model_id,
        export=True,  # ONNXにエクスポート
        provider="DmlExecutionProvider"
    )

    backend_mode = "directml-sd"  # SDモデルを使用中であることを示す
    logger.info("Stable Diffusion (ONNX/DirectML) をロードしました")

    return pipeline


def _load_cpu_model():
    """CPUモデルをロード（フォールバック）"""
    global pipeline, backend_mode

    logger.info("CPU モードでモデルをロード中（処理が遅くなります）...")
    backend_mode = "cpu"

    try:
        from diffusers import QwenImageEditPlusPipeline

        pipeline = QwenImageEditPlusPipeline.from_pretrained(
            "Qwen/Qwen-Image-Edit-2511",
            torch_dtype=torch.float32,
        )
        pipeline.to("cpu")
        pipeline.set_progress_bar_config(disable=None)

        logger.info("CPU モデルのロードが完了しました")
    except Exception as e:
        logger.error(f"CPUモデルのロードに失敗: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時
    load_model()
    yield
    # 終了時
    global pipeline
    if pipeline is not None:
        del pipeline
        if gpu_info and gpu_info.backend == GPUBackend.CUDA:
            torch.cuda.empty_cache()


app = FastAPI(
    title="Qwen Image Edit API",
    description="CUDA / DirectML / CPU対応のローカル画像編集API",
    lifespan=lifespan,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def decode_base64_image(data: str) -> Image.Image:
    """Base64画像をPIL Imageに変換"""
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    image_bytes = base64.b64decode(data)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def encode_image_to_base64(image: Image.Image, format: str = "PNG") -> str:
    """PIL ImageをBase64に変換"""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    buffer.seek(0)
    base64_data = base64.b64encode(buffer.read()).decode("utf-8")
    mime_type = f"image/{format.lower()}"
    return f"data:{mime_type};base64,{base64_data}"


@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {
        "status": "ok",
        "gpu_vendor": gpu_info.vendor.value if gpu_info else "unknown",
        "gpu_name": gpu_info.name if gpu_info else "unknown",
        "gpu_memory": gpu_info.memory_gb if gpu_info else 0,
        "backend": backend_mode,
        "is_integrated": gpu_info.is_integrated if gpu_info else False,
        "cuda_available": gpu_info.backend == GPUBackend.CUDA if gpu_info else False,
        "directml_available": gpu_info.backend == GPUBackend.DIRECTML if gpu_info else False,
        "model_loaded": pipeline is not None,
        "gpu_info": get_gpu_info_string(gpu_info) if gpu_info else "Unknown",
    }


@app.get("/status")
async def get_status():
    """詳細なステータス情報"""
    result = {
        "gpu": {
            "vendor": gpu_info.vendor.value if gpu_info else "unknown",
            "name": gpu_info.name if gpu_info else "unknown",
            "memory_gb": gpu_info.memory_gb if gpu_info else 0,
            "is_integrated": gpu_info.is_integrated if gpu_info else False,
            "info_string": get_gpu_info_string(gpu_info) if gpu_info else "Unknown",
        },
        "backend": backend_mode,
        "model_loaded": pipeline is not None,
    }

    # CUDA固有の情報
    if gpu_info and gpu_info.backend == GPUBackend.CUDA:
        result["cuda"] = {
            "memory_allocated": f"{torch.cuda.memory_allocated(0) / (1024**3):.2f}GB",
            "memory_cached": f"{torch.cuda.memory_reserved(0) / (1024**3):.2f}GB",
        }

    return result


@app.post("/generate")
async def generate_image(
    prompt: str = Form(...),
    negative_prompt: str = Form(" "),
    num_inference_steps: int = Form(40),
    true_cfg_scale: float = Form(4.0),
    guidance_scale: float = Form(1.0),
    seed: int = Form(-1),
    image1: Optional[UploadFile] = File(None),
    image2: Optional[UploadFile] = File(None),
):
    """画像生成/編集エンドポイント"""
    global pipeline

    if pipeline is None:
        raise HTTPException(status_code=503, detail="モデルがロードされていません")

    try:
        # 入力画像の処理
        input_images = []

        if image1 is not None:
            content = await image1.read()
            img = Image.open(io.BytesIO(content)).convert("RGB")
            input_images.append(img)
            logger.info(f"画像1を読み込みました: {img.size}")

        if image2 is not None:
            content = await image2.read()
            img = Image.open(io.BytesIO(content)).convert("RGB")
            input_images.append(img)
            logger.info(f"画像2を読み込みました: {img.size}")

        # シード設定
        generator = None
        if seed >= 0:
            generator = torch.manual_seed(seed)
        else:
            generator = torch.manual_seed(torch.randint(0, 2**32, (1,)).item())

        logger.info(f"生成開始: prompt='{prompt[:50]}...', images={len(input_images)}, backend={backend_mode}")

        # バックエンドに応じた処理
        if backend_mode in ["cuda", "cpu"]:
            output_image = _generate_qwen(
                prompt, negative_prompt, input_images,
                num_inference_steps, true_cfg_scale, guidance_scale, generator
            )
        elif backend_mode in ["directml", "directml-sd"]:
            output_image = _generate_directml(
                prompt, negative_prompt, input_images,
                num_inference_steps, guidance_scale, generator
            )
        else:
            raise HTTPException(status_code=500, detail="不明なバックエンドモード")

        # Base64エンコード
        result_base64 = encode_image_to_base64(output_image)

        logger.info("生成完了")

        return JSONResponse(
            content={
                "success": True,
                "image": result_base64,
                "backend": backend_mode,
                "gpu_vendor": gpu_info.vendor.value if gpu_info else "unknown",
            }
        )

    except Exception as e:
        logger.error(f"生成エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _generate_qwen(prompt, negative_prompt, input_images, steps, true_cfg, guidance, generator):
    """Qwenモデルで生成（CUDA/CPU）"""
    inputs = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "generator": generator,
        "true_cfg_scale": true_cfg,
        "guidance_scale": guidance,
        "num_inference_steps": steps,
        "num_images_per_prompt": 1,
    }

    if len(input_images) > 0:
        inputs["image"] = input_images if len(input_images) > 1 else input_images[0]

    with torch.inference_mode():
        output = pipeline(**inputs)
        return output.images[0]


def _generate_directml(prompt, negative_prompt, input_images, steps, guidance, generator):
    """DirectMLモデルで生成（AMD/Intel）"""
    # 注意: Stable Diffusionパイプラインは画像編集の引数が異なる
    inputs = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "num_inference_steps": steps,
        "guidance_scale": guidance,
    }

    # 画像入力がある場合はimg2imgとして処理
    if len(input_images) > 0:
        # ORTパイプラインのimg2img対応を確認
        logger.warning("DirectMLモードでは画像編集機能が制限される場合があります")

    output = pipeline(**inputs)
    return output.images[0]


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
