# ==========================================
# High-Performance Backend Dockerfile
# Optimized for GPU Acceleration (RTX 50/40/30 Series)
# ==========================================
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

# Install system dependencies and Python 3.11
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    python3.11-dev \
    build-essential \
    ffmpeg \
    git \
    libsndfile1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set python3.11 as default python
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    update-alternatives --set python3 /usr/bin/python3.11


WORKDIR /app

# Install Python dependencies
# We copy all requirements first to allow pip to resolve dependencies globally in one pass
COPY requirements.txt .
COPY SadTalker/requirements.txt ./SadTalker/requirements.txt

# Install all dependencies in one command with explicit pinning to match host environment.
# Using torch 2.10.0 (same as working host environment) - supports Blackwell better than 2.6
RUN pip install --no-cache-dir --default-timeout=1000 \
    "numpy==1.26.4" \
    torch \
    torchvision \
    torchaudio \
    -r requirements.txt \
    -r SadTalker/requirements.txt \
    scikit-image \
    --index-url https://download.pytorch.org/whl/nightly/cu128 \
    --extra-index-url https://pypi.org/simple

# Patch basicsr for torchvision compatibility (fix functional_tensor move)
RUN sed -i 's/from torchvision.transforms.functional_tensor import rgb_to_grayscale/from torchvision.transforms.functional import rgb_to_grayscale/g' \
    /usr/local/lib/python3.11/dist-packages/basicsr/data/degradations.py

# Create necessary directories
RUN mkdir -p uploads/videos uploads/logs models

# Environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Ensure the backend can find the models in the expected location
ENV MODELS_PATH /app/models
# Force CUDA kernel support for Blackwell (RTX 50 series)
ENV CUDA_LAUNCH_BLOCKING 1
# sm_90 = Hopper, sm_100/120 = Blackwell
ENV TORCH_CUDA_ARCH_LIST "7.0 7.5 8.0 8.6 8.9 9.0 10.0 12.0"
# Set CUDA_ARCH for sm_120 (Blackwell RTX 50)
ENV CUDA_ARCH=sm_120
ENV TORCH_CUDNN_V8_API_ENABLED=1

EXPOSE 8000

# Default command for development (hot-reload enabled)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
