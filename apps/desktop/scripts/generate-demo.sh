#!/bin/sh
set -eu
desktop_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$desktop_dir/public/demo"
"${WORKBENCH_PYTHON:-python3}" "$desktop_dir/scripts/generate-frames.py"
ffmpeg -hide_banner -loglevel warning -y -loop 1 -t 4 -i "$desktop_dir/public/demo/frames/phase-0.png" \
  -loop 1 -t 4 -i "$desktop_dir/public/demo/frames/phase-1.png" -loop 1 -t 4 -i "$desktop_dir/public/demo/frames/phase-2.png" \
  -filter_complex '[0:v][1:v][2:v]concat=n=3:v=1:a=0,fps=24' -t 12 \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "$desktop_dir/public/demo/three-scenes.mp4"
