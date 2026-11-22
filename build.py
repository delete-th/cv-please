"""Assemble the portfolio page from src/.

Writes two files:
  build/standalone.html  the whole site in one file (CSS, scripts, images and sounds inline), to open without a server
  build/artifact.html    the same page without the document wrapper, for publishing as a Claude artifact
  build/artifact-drawn.html  the artifact with the hand-drawn passport
The website itself is built by Vite (npm run build), which keeps the scripts, styles, images and sounds as separate files.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
FONTS = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Courier+Prime:wght@400;700&family=IBM+Plex+Mono:wght@400;500&family=Jacquard+24&family=Jersey+10&family=Kalam:wght@400;700&family=Libre+Caslon+Text:ital@0;1&family=Tiny5&display=swap"


def bundle_app():
    """The page's modules (src/app/) bundled into one plain script, so it can sit inline in a single file."""
    import subprocess
    esbuild = ROOT / "node_modules" / ".bin" / "esbuild"
    if not esbuild.exists():
        raise SystemExit("esbuild not found: run npm install first")
    out = subprocess.run([str(esbuild), str(SRC / "app" / "start.js"), "--bundle", "--format=iife", "--log-level=warning"],
                         check=True, capture_output=True, text=True).stdout
    assert "</script" not in out.lower(), "the bundled app must not contain a closing script tag"
    return out


def read(name):
    text = (SRC / name).read_text(encoding="utf-8")
    if name.endswith(".js"):
        assert "</script" not in text.lower(), name + " must not contain a closing script tag"
    return text


def body(drawn=False):
    data = json.loads(read("data.json"))
    if drawn:
        data["profile"]["passportStyle"] = "drawn"
    blob = json.dumps(data, indent=1, ensure_ascii=False).replace("<", "\\u003c")
    scripts = "".join('<script id="%s">%s</script>\n' % (sid, read(f)) for sid, f in
                      [("art", "art.js"), ("sprites", "sprites.js"), ("sounds", "sounds.js"), ("fx", "fx.js"), ("demos", "demos.js")]) + \
        '<script id="main">%s</script>\n' % bundle_app()
    return ('<title>CV Please%s</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            '<link rel="stylesheet" href="%s" id="fonts">\n<style id="page-style">%s</style>\n'
            '<div id="app"></div>\n<div id="intro-root"></div>\n<div id="fixed-root"></div>\n'
            '<script type="application/json" id="cv-data">%s</script>\n%s') % (", drawn passport" if drawn else "", FONTS, read("styles.css"), blob, scripts)


def main():
    page = body()
    (ROOT / "build").mkdir(exist_ok=True)
    (ROOT / "build" / "artifact.html").write_text(page, encoding="utf-8")
    # the same page with the hand-drawn passport, published as its own artifact
    (ROOT / "build" / "artifact-drawn.html").write_text(body(drawn=True), encoding="utf-8")
    head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n')
    (ROOT / "build" / "standalone.html").write_text(head + page + "</body></html>\n", encoding="utf-8")
    print("built build/standalone.html, build/artifact.html and build/artifact-drawn.html")


if __name__ == "__main__":
    main()
