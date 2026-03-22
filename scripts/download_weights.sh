#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# download_weights.sh  —  Download SadTalker model weights on first setup
#
# Run once after cloning the repo:
#     bash scripts/download_weights.sh
#
# Requires: wget (Linux/macOS) or PowerShell (Windows — see download_weights.ps1)
# ─────────────────────────────────────────────────────────────────────────────
set -e

SADTALKER_DIR="$(dirname "$0")/../backend/SadTalker"
CHECKPOINTS="$SADTALKER_DIR/checkpoints"
GFPGAN_WEIGHTS="$SADTALKER_DIR/gfpgan/weights"

mkdir -p "$CHECKPOINTS"
mkdir -p "$GFPGAN_WEIGHTS"

echo "⬇️  Downloading SadTalker checkpoints (~1.6 GB)..."
wget -nc -P "$CHECKPOINTS" \
  "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors"

wget -nc -P "$CHECKPOINTS" \
  "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_512.safetensors"

wget -nc -P "$CHECKPOINTS" \
  "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar"

echo "⬇️  Downloading GFPGAN weights (~737 MB)..."
wget -nc -P "$GFPGAN_WEIGHTS" \
  "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth"

wget -nc -P "$GFPGAN_WEIGHTS" \
  "https://download.openmmlab.com/mmdetection/v2.0/faster_rcnn/faster_rcnn_r50_fpn_1x_coco/faster_rcnn_r50_fpn_1x_coco_20200130-047c8118.pth" 

wget -nc -P "$GFPGAN_WEIGHTS" \
  "https://drive.usercontent.google.com/download?id=1sNezGQ4GNHuNqUPNTtpRRQ3oGaF40sFw&export=download" -O "$GFPGAN_WEIGHTS/alignment_WFLW_4HG.pth"

wget -nc -P "$GFPGAN_WEIGHTS" \
  "https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/parsing_parsenet.pth"

echo "✅  All weights downloaded successfully."
