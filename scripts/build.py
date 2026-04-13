#!/usr/bin/env python3
"""
Build script that inlines CSS and JS into index.html to eliminate
render-blocking requests. Outputs to dist/index.html.
"""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")


def read(filename):
    with open(os.path.join(ROOT, filename)) as f:
        return f.read()


def build():
    html = read("index.html")
    css = read("style.css")
    js = read("script.js")

    html = re.sub(
        r'<link rel="stylesheet" href="style\.css"\s*/?>',
        f"<style>\n{css}</style>",
        html,
    )

    html = re.sub(
        r'<script src="script\.js"></script>',
        f"<script>\n{js}</script>",
        html,
    )

    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, "index.html")
    with open(out, "w") as f:
        f.write(html)

    print(f"Built {out}")


if __name__ == "__main__":
    build()
