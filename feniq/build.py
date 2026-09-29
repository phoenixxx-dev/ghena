"""Build the FENIQ site from src/.

    python3 build.py                 # writes the standalone pages next to this file
    python3 build.py --artifact DIR  # also writes a claude.ai artifact copy to DIR

Pages live in src/pages/*.html. Each starts with a meta comment:
    <!--meta {"title": "...", "desc": "...", "nav": "wh", "scripts": ["assets/phoenix.js"]} -->
and may end with <script type="application/json" id="i18n-en">…</script> holding its English strings.
<!--NAME--> markers are replaced with src/partials/name.html.
Icons are Lucide (ISC licence), inlined as an SVG sprite from src/icons.
"""
import json, re, shutil, sys, pathlib

HERE = pathlib.Path(__file__).parent
SRC = HERE / "src"


def sprite():
    out = ['<svg width="0" height="0" style="position:absolute" aria-hidden="true">']
    for f in sorted((SRC / "icons").glob("*.svg")):
        inner = re.search(r">\s*(.*)</svg>", f.read_text(encoding="utf-8"), re.S).group(1)
        inner = re.sub(r"\s+", " ", inner).strip()
        out.append(f'<symbol id="i-{f.stem}" viewBox="0 0 24 24">{inner}</symbol>')
    return "".join(out) + "</svg>"


def render(page: pathlib.Path, layout: str, icons: str):
    raw = page.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", raw, re.S)
    meta = json.loads(m.group(1))
    body = raw[m.end():]
    en = ""
    em = re.search(r'<script type="application/json" id="i18n-en">.*?</script>', body, re.S)
    if em:
        en, body = em.group(0), body.replace(em.group(0), "")
    for name in re.findall(r"<!--([A-Z]+)-->", body):
        body = body.replace(f"<!--{name}-->", (SRC / "partials" / f"{name.lower()}.html").read_text(encoding="utf-8"))
    html = (layout.replace("{{TITLE}}", meta["title"]).replace("{{DESC}}", meta["desc"])
            .replace("{{SPRITE}}", icons).replace("{{BODY}}", body.strip()).replace("{{EN}}", en)
            .replace("{{SCRIPTS}}", "".join(f'<script src="{s}"></script>' for s in meta.get("scripts", []))))
    nav = f'data-nav="{meta["nav"]}"'
    html = html.replace(nav, f'{nav} aria-current="page"')
    head, rest = html.split("<!--HEAD-END-->")
    return head.strip(), rest.strip()


def standalone(head, rest):
    return ('<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<link rel="icon" href="assets/mark-navy.webp">\n'
            f"{head}\n</head>\n<body>\n{rest}\n</body>\n</html>\n")


def main():
    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    icons = sprite()
    art = pathlib.Path(sys.argv[sys.argv.index("--artifact") + 1]) if "--artifact" in sys.argv else None
    if art:
        if art.exists():
            shutil.rmtree(art)
        shutil.copytree(HERE / "assets", art / "assets")
    for page in sorted((SRC / "pages").glob("*.html")):
        head, rest = render(page, layout, icons)
        (HERE / page.name).write_text(standalone(head, rest), encoding="utf-8")
        if art:
            # the artifact's main page is wrapped by the host; every other page needs its own document
            out = f"{head}\n{rest}\n" if page.name == "index.html" else standalone(head, rest)
            (art / page.name).write_text(out, encoding="utf-8")
        print("built", page.name)


if __name__ == "__main__":
    main()
