"""Build FENIQ pages from src.html.

- index.html   : standalone page for hosting (doctype + head).
- the artifact body (no document skeleton) is written to argv[1] when given.
Icons are Lucide (ISC) inlined as an SVG sprite from assets/icons-sprite.svg.
"""
import sys, pathlib
here = pathlib.Path(__file__).parent
src = (here / "src.html").read_text(encoding="utf-8")
body = src.replace("<!--SPRITE-->", (here / "assets/icons-sprite.svg").read_text(encoding="utf-8"))
head_end = body.index("</style>") + len("</style>")
standalone = ('<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
              '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
              + body[:head_end] + '\n<link rel="icon" href="assets/mark-silver.webp">\n</head>\n<body>\n'
              + body[head_end:] + '\n</body>\n</html>\n')
(here / "index.html").write_text(standalone, encoding="utf-8")
if len(sys.argv) > 1:
    pathlib.Path(sys.argv[1]).write_text(body, encoding="utf-8")
print("built", len(standalone), "bytes")
