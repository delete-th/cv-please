"""Assemble the portfolio page from src/.

Writes two files:
  index.html           a complete page you can open with any static server
  build/artifact.html  the same page without the document wrapper, for publishing as a Claude artifact
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
FONTS = "https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Courier+Prime:wght@400;700&family=IBM+Plex+Mono:wght@400;500&family=Jersey+10&family=Tiny5&display=swap"


def read(name):
    text = (SRC / name).read_text(encoding="utf-8")
    if name.endswith(".js"):
        assert "</script" not in text.lower(), name + " must not contain a closing script tag"
    return text


def body():
    data = json.loads(read("data.json"))
    blob = json.dumps(data, indent=1, ensure_ascii=False).replace("<", "\\u003c")
    scripts = "".join('<script id="%s">%s</script>\n' % (sid, read(f)) for sid, f in
                      [("sprites", "sprites.js"), ("fx", "fx.js"), ("demos", "demos.js"), ("main", "app.js")])
    return ('<title>CV Please</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            '<link rel="stylesheet" href="%s" id="fonts">\n<style id="page-style">%s</style>\n'
            '<div id="app"></div>\n<div id="intro-root"></div>\n<div id="fixed-root"></div>\n'
            '<script type="application/json" id="cv-data">%s</script>\n%s') % (FONTS, read("styles.css"), blob, scripts)


def main():
    page = body()
    (ROOT / "build").mkdir(exist_ok=True)
    (ROOT / "build" / "artifact.html").write_text(page, encoding="utf-8")
    head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n')
    (ROOT / "index.html").write_text(head + page + "</body></html>\n", encoding="utf-8")
    print("built index.html and build/artifact.html")


if __name__ == "__main__":
    main()
