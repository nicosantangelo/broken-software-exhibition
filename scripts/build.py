#!/usr/bin/env python3
"""
Build script that inlines CSS, JS, and exhibit data into index.html
to eliminate render-blocking requests and the exhibits.json fetch.
Overwrites index.html in place for GitHub Pages deployment.
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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
    exhibits_json = json.dumps(json.loads(read("exhibits.json")), separators=(",", ":"))

    html = html.replace(
        '<link rel="stylesheet" href="style.css" />',
        f"<style>\n{minify_css(css)}</style>",
    )

    # Inline exhibit data so the browser doesn't need to fetch exhibits.json.
    constants_script = (
        f"<script>\n"
        f"const ALL_EXHIBITS = {exhibits_json};\n"
        f'const BASE_PATH = ".";\n'
        f"</script>"
    )
    html = html.replace('<script src="constants.js"></script>', constants_script)

    html = html.replace(
        '<script src="script.js"></script>',
        f"<script>\n{minify_js(js)}</script>",
    )

    out = os.path.join(ROOT, "index.html")
    with open(out, "w") as f:
        f.write(html)

    print(f"Built {out}")


if __name__ == "__main__":
    build()
