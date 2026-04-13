#!/usr/bin/env python3
"""
Interactive cataloging script for the Broken Software Exhibition.
Walks through each asset, shows it, extracts creation date from EXIF/filesystem,
and prompts for title, where, and description. Outputs exhibits.json.
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ASSETS_DIR = Path(__file__).parent / "assets"
OUTPUT_FILE = Path(__file__).parent / "exhibits.json"

VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def get_creation_date(filepath):
    """Try to extract creation date from EXIF (images) or filesystem."""
    # Try EXIF via mdls (macOS) - gets the content creation date
    try:
        result = subprocess.run(
            ["mdls", "-name", "kMDItemContentCreationDate", str(filepath)],
            capture_output=True, text=True
        )
        line = result.stdout.strip()
        if "null" not in line and "=" in line:
            date_str = line.split("= ")[1].strip()
            dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S %z")
            return dt.strftime("%B %Y")
    except Exception:
        pass

    # Fallback: file modification time
    try:
        mtime = os.path.getmtime(filepath)
        dt = datetime.fromtimestamp(mtime)
        return dt.strftime("%B %Y")
    except Exception:
        return ""


def open_file(filepath):
    """Open file with the default macOS viewer."""
    subprocess.Popen(["open", str(filepath)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def load_existing():
    """Load existing exhibits.json if present, keyed by filename."""
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            data = json.load(f)
        return {item["file"]: item for item in data}
    return {}


def main():
    files = sorted([
        f for f in ASSETS_DIR.iterdir()
        if f.suffix.lower() in IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
        and not f.name.startswith(".")
    ])

    existing = load_existing()
    exhibits = []

    print(f"\n  The Broken Software Exhibition — Cataloging Tool")
    print(f"  {len(files)} pieces found in assets/\n")
    print(f"  Commands:  [Enter] skip  |  'q' quit & save  |  's' skip without saving\n")

    uncataloged = [f for f in files if f.name not in existing or not existing[f.name].get("title")]
    remaining = len(uncataloged)

    print(f"  {len(files) - remaining} already cataloged, {remaining} remaining\n")
    print(f"  {'─' * 50}\n")

    for i, filepath in enumerate(files):
        filename = filepath.name
        ext = filepath.suffix.lower()
        is_video = ext in VIDEO_EXTENSIONS

        # If already cataloged, keep it and move on
        if filename in existing and existing[filename].get("title"):
            exhibits.append(existing[filename])
            continue

        remaining -= 1
        date = get_creation_date(filepath)

        print(f"  [{i+1}/{len(files)}] {filename}  ({remaining} left after this)")
        print(f"  Type: {'video' if is_video else 'image'}  |  Date found: {date or '(none)'}")
        print()

        # Open the file so the user can see it
        open_file(filepath)

        title = input("  Title: ").strip()
        if title == "q":
            break
        if title == "s" or title == "":
            print()
            continue

        where = input("  Where: ").strip()
        description = input("  Description: ").strip()
        date_input = input(f"  Date [{date}]: ").strip()
        if date_input:
            date = date_input
        starred_input = input("  Starred? [y/N]: ").strip().lower()
        starred = starred_input in ("y", "yes")
        to_edit_input = input("  To edit? [y/N]: ").strip().lower()
        to_edit = to_edit_input in ("y", "yes")

        entry = {
            "file": filename,
            "title": title,
            "date": date,
            "author": where,
            "description": description,
            "starred": starred,
            "to_edit": to_edit,
        }
        if is_video:
            entry["type"] = "video"

        exhibits.append(entry)
        print(f"  ✓ Saved\n")

    # Also keep any previously cataloged items not in current file list
    for item in existing.values():
        if item["file"] not in {e["file"] for e in exhibits}:
            exhibits.append(item)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(exhibits, f, indent=2, ensure_ascii=False)

    print(f"\n  Done — {len(exhibits)} exhibits written to exhibits.json\n")


if __name__ == "__main__":
    main()
