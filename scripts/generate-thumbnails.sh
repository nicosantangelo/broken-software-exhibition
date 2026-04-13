#!/bin/bash
#
# Generate thumbnails for gallery cards and poster images for videos.
# Run from the repo root: ./generate-thumbnails.sh
#
# Requirements: ffmpeg, sips (macOS built-in)
#
set -euo pipefail

ASSETS_DIR="assets"
THUMBS_DIR="$ASSETS_DIR/thumbs"
POSTERS_DIR="$ASSETS_DIR/posters"

mkdir -p "$THUMBS_DIR"
mkdir -p "$POSTERS_DIR"

# ---------- Video poster images (first frame) ----------

echo ""
echo "=== Generating video poster images ==="
echo ""

for f in "$ASSETS_DIR"/*.mp4; do
  [ -f "$f" ] || continue
  base=$(basename "$f" .mp4)
  poster="$POSTERS_DIR/${base}.jpg"

  if [ -f "$poster" ]; then
    echo "  ${base}.jpg already exists, skipping"
    continue
  fi

  echo -n "  ${base}.jpg -> "
  ffmpeg -y -i "$f" -vframes 1 -q:v 5 -loglevel error "$poster"
  size=$(stat -f%z "$poster" 2>/dev/null || echo 0)
  echo "${size} bytes"
done

# ---------- Gallery thumbnails (800px wide, JPEG) ----------

echo ""
echo "=== Generating gallery thumbnails (800px wide, JPEG) ==="
echo ""

for f in "$ASSETS_DIR"/*.jpg "$ASSETS_DIR"/*.jpeg "$ASSETS_DIR"/*.JPG "$ASSETS_DIR"/*.png; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  name="${base%.*}"
  thumb="$THUMBS_DIR/${name}.jpg"

  if [ -f "$thumb" ]; then
    echo "  ${name}.jpg already exists, skipping"
    continue
  fi

  width=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
  target_width=$(( width > 800 ? 800 : width ))

  echo -n "  $base -> ${name}.jpg (${target_width}px) -> "

  if (( width > 800 )); then
    sips --resampleWidth 800 -s format jpeg -s formatOptions 85 "$f" --out "$thumb" >/dev/null 2>&1
  else
    sips -s format jpeg -s formatOptions 85 "$f" --out "$thumb" >/dev/null 2>&1
  fi

  size=$(stat -f%z "$thumb" 2>/dev/null || echo 0)
  echo "${size} bytes"
done

echo ""
echo "Done."
echo ""
