#!/usr/bin/env python3
"""
Build script that inlines CSS, JS, and exhibit data into index.html
to eliminate render-blocking requests and the exhibits.json fetch.
Outputs to dist/index.html.
"""

import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")


def read(filename):
    with open(os.path.join(ROOT, filename)) as f:
        return f.read()


def minify_js(code):
    # Remove multi-line comments (safe — no nesting in this codebase)
    code = re.sub(r'/\*.*?\*/', "", code, flags=re.DOTALL)
    # Remove single-line comments only on lines that start with //
    # (after optional whitespace). Avoids clobbering // inside strings.
    code = re.sub(r'^\s*//[^\n]*$', "", code, flags=re.MULTILINE)
    # Collapse runs of whitespace into a single space
    code = re.sub(r'\s+', " ", code)
    # Trim whitespace around braces, parens, semicolons, and commas.
    # Intentionally excludes operators like = + - < > that can appear
    # adjacent to identifiers or keywords.
    code = re.sub(r'\s*([{}();,])\s*', r"\1", code)

    return code.strip()


def minify_css(code):
    # Remove comments
    code = re.sub(r'/\*.*?\*/', "", code, flags=re.DOTALL)
    # Collapse whitespace into single spaces
    code = re.sub(r'\s+', " ", code)
    # Trim whitespace around punctuation
    code = re.sub(r'\s*([{}:;,>~+])\s*', r"\1", code)
    # Remove trailing semicolons before closing braces
    code = re.sub(r';}', "}", code)

    return code.strip()


def build():
    html = read("index.html")
    css = read("style.css")
    js = read("script.js")
    exhibits_json = read("exhibits.json")

    html = re.sub(
        r'<link rel="stylesheet" href="style\.css"\s*/?>',
        f"<style>\n{minify_css(css)}</style>",
        html,
    )

    # Replace constants.js with inlined values: embed the JSON and
    # point BASE_PATH up one level since dist/ is a subfolder.
    constants_script = (
        f"<script>\n"
        f"const ALL_EXHIBITS = {exhibits_json.strip()};\n"
        f'const BASE_PATH = "..";\n'
        f"</script>"
    )
    html = re.sub(
        r'<script src="constants\.js"></script>',
        constants_script,
        html,
    )

    html = re.sub(
        r'<script src="script\.js"></script>',
        f"<script>\n{minify_js(js)}</script>",
        html,
    )

    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, "index.html")
    with open(out, "w") as f:
        f.write(html)

    shutil.copy2(os.path.join(ROOT, "favicon.svg"), DIST)

    print(f"Built {out}")


if __name__ == "__main__":
    build()
