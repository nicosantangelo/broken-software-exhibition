#!/bin/bash
#
# Compress assets for GitHub Pages deployment.
# Run from the repo root: ./compress-assets.sh
#
# Requirements: ffmpeg, sips (macOS built-in), python3
#
set -euo pipefail

ASSETS_DIR="assets"
EXHIBITS_JSON="exhibits.json"

# Track savings
total_before=0
total_after=0

bytes() { stat -f%z "$1" 2>/dev/null || echo 0; }

human_size() {
  local bytes=$1
  if (( bytes >= 1048576 )); then
    echo "$(( bytes / 1048576 ))MB"
  elif (( bytes >= 1024 )); then
    echo "$(( bytes / 1024 ))KB"
  else
    echo "${bytes}B"
  fi
}

# ---------- MP4 compression ----------

echo ""
echo "=== Compressing MP4 files ==="
echo ""

for f in "$ASSETS_DIR"/*.mp4; do
  [ -f "$f" ] || continue
  before=$(bytes "$f")
  total_before=$(( total_before + before ))

  tmp="${f%.mp4}.tmp.mp4"
  echo -n "  $(basename "$f") ($(human_size $before)) -> "

  ffmpeg -y -i "$f" \
    -vcodec libx264 -crf 28 -preset slow \
    -an \
    -movflags +faststart \
    -loglevel error \
    "$tmp"

  after=$(bytes "$tmp")

  # Only replace if we actually saved space
  if (( after < before )); then
    mv "$tmp" "$f"
    total_after=$(( total_after + after ))
    saved=$(( before - after ))
    echo "$(human_size $after) (saved $(human_size $saved))"
  else
    rm "$tmp"
    total_after=$(( total_after + before ))
    echo "already optimal, skipped"
  fi
done

# ---------- Image resizing (JPG/JPEG/PNG > 200KB, max 1200px wide) ----------

echo ""
echo "=== Resizing large images (>200KB to max 1200px wide) ==="
echo ""

for f in "$ASSETS_DIR"/*.jpg "$ASSETS_DIR"/*.jpeg "$ASSETS_DIR"/*.JPG "$ASSETS_DIR"/*.png; do
  [ -f "$f" ] || continue
  before=$(bytes "$f")
  total_before=$(( total_before + before ))

  if (( before < 204800 )); then
    total_after=$(( total_after + before ))
    continue
  fi

  # Get current width
  width=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')

  if (( width > 1200 )); then
    echo -n "  $(basename "$f") ($(human_size $before), ${width}px) -> "
    sips --resampleWidth 1200 "$f" --out "$f" >/dev/null 2>&1
    after=$(bytes "$f")
    total_after=$(( total_after + after ))
    saved=$(( before - after ))
    echo "$(human_size $after) (saved $(human_size $saved))"
  else
    total_after=$(( total_after + before ))
  fi
done

# ---------- Convert large PNGs to JPEG ----------

echo ""
echo "=== Converting PNGs > 500KB to JPEG ==="
echo ""

png_renames=()

for f in "$ASSETS_DIR"/*.png; do
  [ -f "$f" ] || continue
  size=$(bytes "$f")

  if (( size < 512000 )); then
    continue
  fi

  base=$(basename "$f" .png)
  jpeg_path="$ASSETS_DIR/${base}.jpg"

  echo -n "  $(basename "$f") ($(human_size $size)) -> "

  sips -s format jpeg -s formatOptions 85 "$f" --out "$jpeg_path" >/dev/null 2>&1

  after=$(bytes "$jpeg_path")
  saved=$(( size - after ))

  # Subtract the PNG from totals (it was already counted in the resize pass)
  # and add the JPEG instead
  total_after=$(( total_after - size + after ))

  echo "${base}.jpg ($(human_size $after), saved $(human_size $saved))"

  rm "$f"
  png_renames+=("${base}.png:${base}.jpg")
done

# Update exhibits.json with renamed files
if [ ${#png_renames[@]} -gt 0 ] && [ -f "$EXHIBITS_JSON" ]; then
  echo ""
  echo "=== Updating exhibits.json ==="
  for rename in "${png_renames[@]}"; do
    old="${rename%%:*}"
    new="${rename##*:}"
    echo "  $old -> $new"
    python3 -c "
import json, sys
with open('$EXHIBITS_JSON') as f:
    data = json.load(f)
for item in data:
    if item['file'] == '$old':
        item['file'] = '$new'
with open('$EXHIBITS_JSON', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
"
  done
fi

# ---------- Summary ----------

echo ""
echo "========================================="
echo "  Total before:  $(human_size $total_before)"
echo "  Total after:   $(human_size $total_after)"
saved_total=$(( total_before - total_after ))
echo "  Saved:         $(human_size $saved_total)"
echo "========================================="
echo ""
