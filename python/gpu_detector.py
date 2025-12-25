"""
GPU Detection Module
NVIDIA CUDA / AMD DirectML / Intel の検出と適切なバックエンドの選択
"""

import subprocess
import platform
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class GPUVendor(Enum):
    NVIDIA = "nvidia"
    AMD = "amd"
    INTEL = "intel"
    UNKNOWN = "unknown"


class GPUBackend(Enum):
    CUDA = "cuda"
    DIRECTML = "directml"
    CPU = "cpu"


@dataclass
class GPUInfo:
    vendor: GPUVendor
    name: str
    memory_gb: float
    backend: GPUBackend
    is_integrated: bool


def detect_gpu() -> GPUInfo:
    """GPUを検出し、最適なバックエンドを決定"""

    # まずCUDA（NVIDIA）をチェック
    cuda_info = _check_cuda()
    if cuda_info:
        return cuda_info

    # DirectML対応GPU（AMD/Intel）をチェック
    directml_info = _check_directml_gpu()
    if directml_info:
        return directml_info

    # フォールバック: CPU
    return GPUInfo(
        vendor=GPUVendor.UNKNOWN,
        name="CPU",
        memory_gb=0,
        backend=GPUBackend.CPU,
        is_integrated=False
    )


def _check_cuda() -> Optional[GPUInfo]:
    """NVIDIA CUDA GPUをチェック"""
    try:
        import torch
        if torch.cuda.is_available():
            name = torch.cuda.get_device_name(0)
            memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            return GPUInfo(
                vendor=GPUVendor.NVIDIA,
                name=name,
                memory_gb=round(memory, 1),
                backend=GPUBackend.CUDA,
                is_integrated=False
            )
    except ImportError:
        pass
    return None


def _check_directml_gpu() -> Optional[GPUInfo]:
    """DirectML対応GPU（AMD/Intel）をチェック"""
    if platform.system() != "Windows":
        return None

    try:
        # wmic でGPU情報を取得
        result = subprocess.run(
            ["wmic", "path", "win32_VideoController", "get", "name,adapterram"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return None

        lines = result.stdout.strip().split('\n')[1:]  # ヘッダーをスキップ

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # AMD GPUを検出
            if any(keyword in line.upper() for keyword in ['AMD', 'RADEON', 'VEGA']):
                gpu_info = _parse_gpu_line(line, GPUVendor.AMD)
                if gpu_info:
                    return gpu_info

            # Intel GPUを検出
            if any(keyword in line.upper() for keyword in ['INTEL', 'IRIS', 'UHD', 'ARC']):
                gpu_info = _parse_gpu_line(line, GPUVendor.INTEL)
                if gpu_info:
                    return gpu_info

    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return None


def _parse_gpu_line(line: str, vendor: GPUVendor) -> Optional[GPUInfo]:
    """GPU情報行をパース"""
    parts = line.rsplit(None, 1)

    if len(parts) >= 1:
        name = parts[0].strip()
        memory_gb = 0.0

        # メモリ量を取得（バイト単位）
        if len(parts) == 2:
            try:
                memory_bytes = int(parts[1])
                memory_gb = round(memory_bytes / (1024**3), 1)
            except ValueError:
                pass

        # 内蔵GPUかどうかを判定
        is_integrated = any(keyword in name.upper() for keyword in [
            'INTEGRATED', 'UHD', 'IRIS', 'VEGA', 'APU', 'RADEON GRAPHICS'
        ])

        return GPUInfo(
            vendor=vendor,
            name=name,
            memory_gb=memory_gb,
            backend=GPUBackend.DIRECTML,
            is_integrated=is_integrated
        )

    return None


def get_gpu_info_string(gpu: GPUInfo) -> str:
    """GPU情報を人間可読な文字列に変換"""
    backend_str = {
        GPUBackend.CUDA: "CUDA",
        GPUBackend.DIRECTML: "DirectML",
        GPUBackend.CPU: "CPU"
    }[gpu.backend]

    integrated_str = " (内蔵)" if gpu.is_integrated else ""
    memory_str = f" ({gpu.memory_gb}GB)" if gpu.memory_gb > 0 else ""

    return f"{gpu.name}{memory_str}{integrated_str} - {backend_str}"


if __name__ == "__main__":
    gpu = detect_gpu()
    print(f"Vendor: {gpu.vendor.value}")
    print(f"Name: {gpu.name}")
    print(f"Memory: {gpu.memory_gb}GB")
    print(f"Backend: {gpu.backend.value}")
    print(f"Integrated: {gpu.is_integrated}")
    print(f"Info: {get_gpu_info_string(gpu)}")
