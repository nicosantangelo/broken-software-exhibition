#!/bin/bash
#
# Add a new exhibit to the Broken Software Exhibition.
# Copies the file to assets/, compresses it, generates thumbnails, and adds
# an entry to exhibits.json.
#
# Usage: ./scripts/add-exhibit.sh <image-or-video>
#
# Requirements: ffmpeg, sips (macOS built-in), python3
#
set -euo pipefail

ASSETS_DIR="assets"
THUMBS_DIR="$ASSETS_DIR/thumbs"
POSTERS_DIR="$ASSETS_DIR/posters"
EXHIBITS_JSON="exhibits.json"

# ----------------------------------------
# Helpers

bytes() { stat -f%z "$1" 2>/dev/null || echo 0; }

human_size() {
  local b=$1
  if (( b >= 1048576 )); then
    echo "$(( b / 1048576 ))MB"
  elif (( b >= 1024 )); then
    echo "$(( b / 1024 ))KB"
  else
    echo "${b}B"
  fi
}

get_creation_date() {
  local file="$1"
  local line
  line=$(mdls -name kMDItemContentCreationDate "$file" 2>/dev/null || true)
  if [[ "$line" != *"null"* && "$line" == *"="* ]]; then
    local date_str="${line##*= }"
    # Parse "2025-06-15 12:00:00 +0000" into "June 2025"
    python3 -c "
from datetime import datetime
try:
    dt = datetime.strptime('$date_str'.strip(), '%Y-%m-%d %H:%M:%S %z')
    print(dt.strftime('%B %Y'))
except:
    print('')
"
    return
  fi
  echo ""
}

# ----------------------------------------
# Validate input

if [ $# -lt 1 ]; then
  echo ""
  echo "  Usage: ./scripts/add-exhibit.sh <image-or-video>"
  echo ""
  exit 1
fi

source_file="$1"

if [ ! -f "$source_file" ]; then
  echo "  Error: File not found: $source_file"
  exit 1
fi

filename=$(basename "$source_file")
extension="${filename##*.}"
extension_lower=$(echo "$extension" | tr '[:upper:]' '[:lower:]')

case "$extension_lower" in
  png|jpg|jpeg) is_video=false ;;
  mp4|mov|webm) is_video=true ;;
  *)
    echo "  Error: Unsupported file type: .$extension"
    echo "  Supported: png, jpg, jpeg, mp4, mov, webm"
    exit 1
    ;;
esac

asset_path="$ASSETS_DIR/$filename"

if [ -f "$asset_path" ]; then
  echo "  Error: $filename already exists in $ASSETS_DIR/"
  exit 1
fi

# ----------------------------------------
# Step 1: Copy to assets/

echo ""
echo "  Copying $filename to $ASSETS_DIR/..."
cp "$source_file" "$asset_path"

# Track the current filename (may change if PNG→JPEG conversion happens)
current_filename="$filename"
current_path="$asset_path"
name="${filename%.*}"

# ----------------------------------------
# Step 2: Compress

if $is_video; then
  echo ""
  echo "  === Compressing video ==="

  if ! command -v ffmpeg &>/dev/null; then
    echo "  Warning: ffmpeg not found, skipping compression"
  else
    before=$(bytes "$current_path")
    tmp="${current_path%.mp4}.tmp.mp4"

    echo -n "  $(human_size $before) -> "

    ffmpeg -y -i "$current_path" \
      -vcodec libx264 -crf 28 -preset slow \
      -an \
      -movflags +faststart \
      -loglevel error \
      "$tmp"

    after=$(bytes "$tmp")

    if (( after < before )); then
      mv "$tmp" "$current_path"
      saved=$(( before - after ))
      echo "$(human_size $after) (saved $(human_size $saved))"
    else
      rm "$tmp"
      echo "already optimal, skipped"
    fi
  fi

else
  size=$(bytes "$current_path")
  width=$(sips -g pixelWidth "$current_path" 2>/dev/null | awk '/pixelWidth/{print $2}')

  # Resize if >200KB and >1200px wide
  if (( size > 204800 && width > 1200 )); then
    echo ""
    echo -n "  Resizing ${width}px -> 1200px... "
    sips --resampleWidth 1200 "$current_path" --out "$current_path" >/dev/null 2>&1
    new_size=$(bytes "$current_path")
    echo "$(human_size $size) -> $(human_size $new_size)"
  fi

  # Convert large PNGs to JPEG
  if [[ "$extension_lower" == "png" ]]; then
    size=$(bytes "$current_path")
    if (( size > 512000 )); then
      jpeg_path="$ASSETS_DIR/${name}.jpg"
      echo -n "  Converting PNG to JPEG... "
      sips -s format jpeg -s formatOptions 85 "$current_path" --out "$jpeg_path" >/dev/null 2>&1
      rm "$current_path"
      current_filename="${name}.jpg"
      current_path="$jpeg_path"
      new_size=$(bytes "$current_path")
      echo "$(human_size $size) -> $(human_size $new_size)"
    fi
  fi
fi

# ----------------------------------------
# Step 3: Generate thumbnails

mkdir -p "$THUMBS_DIR"
mkdir -p "$POSTERS_DIR"

if $is_video; then
  # Video poster (first frame)
  poster="$POSTERS_DIR/${name}.jpg"
  echo ""
  echo -n "  Generating poster... "
  ffmpeg -y -i "$current_path" -vframes 1 -q:v 5 -loglevel error "$poster"
  echo "$(human_size $(bytes "$poster"))"
else
  # Gallery thumbnail (800px wide JPEG)
  thumb="$THUMBS_DIR/${name}.jpg"
  width=$(sips -g pixelWidth "$current_path" 2>/dev/null | awk '/pixelWidth/{print $2}')

  echo ""
  echo -n "  Generating thumbnail... "

  if (( width > 800 )); then
    sips --resampleWidth 800 -s format jpeg -s formatOptions 85 "$current_path" --out "$thumb" >/dev/null 2>&1
  else
    sips -s format jpeg -s formatOptions 85 "$current_path" --out "$thumb" >/dev/null 2>&1
  fi

  echo "$(human_size $(bytes "$thumb"))"
fi

# ----------------------------------------
# Step 4: Preview & prompt for metadata

open "$current_path" 2>/dev/null || true

date_default=$(get_creation_date "$current_path")

echo ""
echo "  ─────────────────────────────────────"
echo "  $current_filename"
echo "  ─────────────────────────────────────"
echo ""

read -rp "  Title: " title
read -rp "  Author: " author

if [ -n "$date_default" ]; then
  read -rp "  Date [$date_default]: " date_input
  date="${date_input:-$date_default}"
else
  read -rp "  Date (e.g. June 2025): " date
fi

read -rp "  Description: " description
read -rp "  Starred? [y/N]: " starred_input

starred=false
case "$(echo "$starred_input" | tr '[:upper:]' '[:lower:]')" in
  y|yes) starred=true ;;
esac

# ----------------------------------------
# Step 5: Add to exhibits.json

EXHIBIT_FILE="$current_filename" \
EXHIBIT_TITLE="$title" \
EXHIBIT_DATE="$date" \
EXHIBIT_AUTHOR="$author" \
EXHIBIT_DESC="$description" \
EXHIBIT_STARRED="$starred" \
EXHIBIT_IS_VIDEO="$is_video" \
python3 -c "
import json, os

with open('$EXHIBITS_JSON') as f:
    data = json.load(f)

entry = {
    'file': os.environ['EXHIBIT_FILE'],
    'title': os.environ['EXHIBIT_TITLE'],
    'date': os.environ['EXHIBIT_DATE'],
    'author': os.environ['EXHIBIT_AUTHOR'],
    'description': os.environ['EXHIBIT_DESC'],
    'starred': os.environ['EXHIBIT_STARRED'] == 'true',
}

if os.environ['EXHIBIT_IS_VIDEO'] == 'true':
    entry['type'] = 'video'

data.append(entry)

with open('$EXHIBITS_JSON', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
"

# ----------------------------------------
# Step 6: Summary

echo ""
echo "  ========================================="
echo "  ✓ Added: $current_filename"
echo "  ✓ Asset: $current_path"
if $is_video; then
  echo "  ✓ Poster: $POSTERS_DIR/${name}.jpg"
else
  echo "  ✓ Thumbnail: $THUMBS_DIR/${name}.jpg"
fi
echo "  ✓ exhibits.json updated"
echo "  ========================================="
echo ""
