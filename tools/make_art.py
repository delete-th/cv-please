"""Build src/art.js from the sprite PNGs in assets/sprites/: npm run art (needs Python 3 and Pillow).

Embed Thea's desk sprites as data URIs, and derive an empty file box from filebox.png
(the drawn folders are cleared so live folders can sit in it and leave it when taken out)."""
import base64
import io
import json
import pathlib

from PIL import Image

# run from anywhere: the sprites are read from assets/sprites/ and src/art.js is written, relative to the repo
ROOT = pathlib.Path(__file__).resolve().parent.parent
SPRITES = ROOT / 'assets' / 'sprites'

SRC = SPRITES / 'desk'
OUT = ROOT / 'build' / 'art'
OUT.mkdir(parents=True, exist_ok=True)

box = Image.open(SRC / 'filebox.png').convert('RGBA')
px = box.load()
INK, FLOOR, SHADE, WALL = (0x1d, 0x1e, 0x0f, 255), (0x4e, 0x3d, 0x24, 255), (0x3a, 0x2d, 0x1a, 255), (0x8c, 0x6d, 0x41, 255)
# the inside of the tray, between the side walls and above the front lip
for y in range(1, 35):
    for x in range(5, 48):
        px[x, y] = FLOOR
for x in range(5, 48):
    px[x, 1] = INK
    px[x, 2] = SHADE
for y in range(1, 35):
    px[5, y] = SHADE
    px[48, y] = WALL
# a few floor slats so the empty tray reads as wood
for y in (9, 17, 25):
    for x in range(6, 48):
        px[x, y] = SHADE
# the back folder's tab stuck up above the rim: remove it and close the rim line
for x in range(box.width):
    px[x, 0] = (0, 0, 0, 0)
for x in range(3, 51):
    px[x, 1] = INK
box.save(OUT / 'filebox-empty.png')


# A larger tray made from the same box art at the same pixel size: keep the rim corners, walls and front lip,
# repeat the plain middle columns and floor rows, and give the front a wider label plate.
def stretch(img, W, H):
    src = img.load(); w, h = img.size
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); o = out.load()
    left, right = 8, 8                       # columns kept from each side
    top, lip = 12, 12                        # rows kept from the top, and the front lip at the bottom
    def sx(x):
        if x < left: return x
        if x >= W - right: return w - (W - x)
        return left + (x - left) % (w - left - right - 26) + 3 if False else min(w - right - 1, max(left, 10 + (x - left) % 4))
    def sy(y):
        if y < top: return y
        if y >= H - lip: return h - (H - y)
        return 12 + (y - top) % 8
    for y in range(H):
        for x in range(W):
            wall = x < left or x >= W - right
            yy = sy(y) if (not wall or y < top or y >= H - lip) else 20   # straight walls: one plain wall row repeated
            o[x, y] = src[sx(x), yy]
    return out
big = stretch(box, 100, 70)
bp = big.load()
# the front lip: plain wood all the way across, then a wider plate centred on it
lipTop = 70 - 12
for y in range(lipTop + 1, 70 - 1):
    for x in range(2, 98):
        if bp[x, y][3] and bp[x, y][:3] != INK[:3]:
            bp[x, y] = (0x4e, 0x3d, 0x24, 255) if y > lipTop + 2 else bp[x, y]
PL = (0x1d, 0x1e, 0x0f, 255); PW = (0x8c, 0x6d, 0x41, 255); PD = (0x4e, 0x3d, 0x24, 255); PM = (0xbb, 0xa1, 0x67, 255)
px0, px1, py0 = 28, 72, 63
for x in range(px0, px1):
    bp[x, py0] = PL; bp[x, py0 + 5] = PL
for y in range(py0, py0 + 6):
    bp[px0, y] = PL; bp[px1 - 1, y] = PL
for x in range(px0 + 1, px1 - 1):
    bp[x, py0 + 1] = PW; bp[x, py0 + 4] = PW
    for y in (py0 + 2, py0 + 3): bp[x, y] = PM
big.save(OUT / 'filebox-big.png')
box = big

names = ['lamp', 'mug', 'plant', 'paperclip', 'pen', 'envelope', 'computer', 'phone']
art = {}
def add(key, path):
    im = Image.open(path)
    art[key] = {'w': im.width, 'h': im.height, 'src': 'data:image/png;base64,' + base64.b64encode(pathlib.Path(path).read_bytes()).decode()}
for n in names:
    add(n, SRC / (n + '.png'))
# Thea's file box set: the empty box, its front edge (drawn over the folders), three folder shapes and the put-back icon
for n in ['filebox-empty', 'filebox-front', 'folder-left-top', 'folder-right-top',
          'stamp-approved', 'stamp-approved-pressed', 'stamp-denied', 'stamp-denied-pressed']:
    add(n, SPRITES / 'part11' / (n + '.png'))
# one folder strip per project: the tab recoloured (ink outline kept), its top row a step lighter
TABS = ['#8fa7b8', '#b9a2c4', '#8fb39a', '#d9b26a', '#c98b7a', '#a7b78a', '#9a9a8c']
def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
for i, col in enumerate(TABS):
    side = 'left' if i % 2 == 0 else 'right'
    im = Image.open(SPRITES / 'part11' / ('folder-' + side + '-top.png')).convert('RGBA'); pxs = im.load()
    x0, x1, y0, y1 = (2, 28, 0, 2) if side == 'left' else (18, 44, 1, 3)
    base = hexrgb(col); hi = tuple(min(255, round(c + (255 - c) * 0.3)) for c in base)
    for y in range(y0, y1 + 1):
        row = [x for x in range(x0, x1 + 1) if pxs[x, y][3] and sum(pxs[x, y][:3]) > 200]
        for x in row:
            pxs[x, y] = (hi if y == y0 or (y == y0 + 1 and pxs[x, y - 1][3] == 0) else base) + (255,)
    buf = io.BytesIO(); im.save(buf, 'PNG')
    art['fstrip-%d' % i] = {'w': im.width, 'h': im.height, 'src': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()}
art['filebox'] = art.pop('filebox-empty')
# part 9: drawers, personal things, pins, booth details
for f in sorted((SPRITES / 'part9').glob('*.png')):
    add(f.stem, f)
# the deeper drawer (floor y 14 to 136) and the four new things in the Personal drawer
add('drawer', SPRITES / 'part13' / 'drawer.png')
for n in ['gum', 'mints-3', 'mints-2', 'mints-1', 'mints-0', 'keycap-up', 'keycap-down', 'usb', 'usb-on']:
    add(n, SPRITES / 'part13' / (n + '.png'))
# part 13: the portable speaker (sound toggle) and the alarm clock in the Records room
for n in ['speaker-off', 'speaker-on', 'alarm-clock', 'alarm-clock-snooze']:
    add(n, SPRITES / 'part14' / (n + '.png'))
# part 14: the walk-in at the booth window, and the whiteboard wall
for n in ['booth-scene', 'window-0', 'window-1', 'window-2', 'tray-open', 'tray-closed', 'whiteboard', 'wall-strip',
          'magnet-green', 'magnet-red', 'marker-black', 'marker-blue', 'marker-red', 'eraser', 'eraser-wipe-l', 'eraser-wipe-r']:
    add(n, SPRITES / 'part15' / (n + '.png'))
for k in range(4):
    add('walk-%d' % k, SPRITES / 'part15' / ('walk-%d-small.png' % k))
add('thea-turn', SPRITES / 'part15' / 'thea-turn-small.png')
# the whiteboard hangs on the room's own wall: clear the sprite's wall patch and its border (flood fill from the edge)
_wb = Image.open(SPRITES / 'part15' / 'whiteboard.png').convert('RGBA'); _p = _wb.load(); _W, _H = _wb.size
_wallc = {(100, 97, 78), (66, 64, 54), (40, 40, 37)}
_todo = [(x, y) for x in range(_W) for y in (0, _H - 1)] + [(x, y) for y in range(_H) for x in (0, _W - 1)]
_seen = set()
while _todo:
    x, y = _todo.pop()
    if (x, y) in _seen or not (0 <= x < _W and 0 <= y < _H):
        continue
    _seen.add((x, y))
    if _p[x, y][:3] in _wallc:
        _p[x, y] = (0, 0, 0, 0)
        _todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
_buf = io.BytesIO(); _wb.save(_buf, 'PNG')
art['whiteboard'] = {'w': _W, 'h': _H, 'src': 'data:image/png;base64,' + base64.b64encode(_buf.getvalue()).decode()}
_ac = Image.open(SPRITES / 'part14' / 'alarm-clock.png').convert('RGBA'); _px = _ac.load()
# the lighter glare pixels on the glass, redrawn over the digits so the reflection stays on top
art['alarm-clock']['glare'] = [[x, y, '#%02x%02x%02x' % _px[x, y][:3]] for y in range(12, 24) for x in range(6, 47) if _px[x, y][:3] != (37, 46, 35)]
add('passport-seq-sheet', SPRITES / 'passport' / 'passport-seq-sheet.png')
# part 12: the large pinboard and the printer with its front lip, light off and on
for n in ['pinboard-large', 'printer-off', 'printer-on', 'printer-front-off', 'printer-front-on']:
    add(n, SPRITES / 'part12' / (n + '.png'))

# part 15: the close-up walk-in frames (one shared, aligned 57x79 canvas) replace the small figure
for n in ['thea-walk-0', 'thea-walk-1', 'thea-turn', 'thea-hold', 'thea-push']:
    add(n, SPRITES / 'part16' / (n + '.png'))
# the booth scene's sky is cut out, so the page can paint the visitor's time of day behind the glass
_bs = Image.open(SPRITES / 'part16' / 'booth-scene.png').convert('RGBA'); _bp = _bs.load()
for y in range(4, 57):
    for x in range(10, 102):
        if _bp[x, y][:3] == (156, 180, 187):
            _bp[x, y] = (0, 0, 0, 0)
_buf = io.BytesIO(); _bs.save(_buf, 'PNG')
art['booth-scene'] = {'w': _bs.width, 'h': _bs.height, 'src': 'data:image/png;base64,' + base64.b64encode(_buf.getvalue()).decode()}
# part 16: the booth in layers, so Thea stands behind the glass: the reflections on their own, and the frame and
# counter in front with the glass cut out
_GL = (201, 209, 197)
_fr = Image.open(SPRITES / 'part16' / 'booth-scene.png').convert('RGBA'); _fp = _fr.load()
_gl = Image.new('RGBA', _fr.size, (0, 0, 0, 0)); _gp = _gl.load()
for y in range(5, 56):
    for x in range(10, 101):
        if _fp[x, y][:3] == _GL:
            _gp[x, y] = _fp[x, y]
        _fp[x, y] = (0, 0, 0, 0)
for name, im in (('booth-front', _fr), ('booth-glare', _gl)):
    _buf = io.BytesIO(); im.save(_buf, 'PNG')
    art[name] = {'w': im.width, 'h': im.height, 'src': 'data:image/png;base64,' + base64.b64encode(_buf.getvalue()).decode()}
# the open tray with Thea's passport lying in it (a stand-in drawn from tray-open until the real sprite arrives)
_tp_path = SPRITES / 'part16' / 'tray-passport.png'
if _tp_path.exists():
    add('tray-passport', _tp_path)
else:
    _tp = Image.open(SPRITES / 'part16' / 'tray-open.png').convert('RGBA'); _tq = _tp.load()
    INKP, GREEN, GOLD = (34, 32, 27, 255), (46, 73, 57, 255), (201, 172, 133, 255)
    for y in range(8, 13):
        for x in range(7, 20):
            _tq[x, y] = INKP if y in (8, 12) or x in (7, 19) else GREEN
    _tq[13, 10] = GOLD; _tq[12, 10] = GOLD; _tq[14, 10] = GOLD
    _buf = io.BytesIO(); _tp.save(_buf, 'PNG')
    art['tray-passport'] = {'w': _tp.width, 'h': _tp.height, 'src': 'data:image/png;base64,' + base64.b64encode(_buf.getvalue()).decode()}
def _taller(im, extra=8, row=69):
    W, H = im.size
    out = Image.new('RGBA', (W, H + extra), (0, 0, 0, 0))
    out.paste(im.crop((0, 0, W, row + 1)), (0, 0))
    for k in range(extra):
        out.paste(im.crop((0, row, W, row + 1)), (0, row + 1 + k))
    out.paste(im.crop((0, row + 1, W, H)), (0, row + 1 + extra))
    return out
for _n in ('booth-scene', 'booth-front', 'booth-glare'):
    _src = art[_n]['src']
    _im = _taller(Image.open(io.BytesIO(base64.b64decode(_src.split(',')[1]))).convert('RGBA'))
    _buf = io.BytesIO(); _im.save(_buf, 'PNG')
    art[_n] = {'w': _im.width, 'h': _im.height, 'src': 'data:image/png;base64,' + base64.b64encode(_buf.getvalue()).decode()}
# the desk edge under the whiteboard: one plain column of the strip, repeated, so it runs without seams
_ws = Image.open(SPRITES / 'part16' / 'wall-strip.png').convert('RGBA').crop((7, 0, 8, 42))
_buf = io.BytesIO(); _ws.save(_buf, 'PNG')
art['wall-strip-fill'] = {'w': 1, 'h': 42, 'src': 'data:image/png;base64,' + base64.b64encode(_buf.getvalue()).decode()}

# part 18: the bottom of the whiteboard seen over the desk's back edge, and the blue marker that rolled off it
for n in ['board-peek', 'marker-desk']:
    add(n, SPRITES / 'part18' / (n + '.png'))

# where live content goes inside each sprite, in art pixels
art['computer']['screen'] = {'x': 10, 'y': 10, 'w': 44, 'h': 30}
art['computer']['keys'] = {'x': 4, 'y': 49, 'w': 54, 'h': 11}
art['computer']['close'] = {'x': 55, 'y': 3}
art['computer']['power'] = {'x': 54, 'y': 43}
art['phone']['screen'] = {'x': 7, 'y': 27, 'w': 21, 'h': 17}
art['envelope']['label'] = {'x': 23, 'y': 38, 'w': 22, 'h': 8}
art['lamp']['switch'] = {'x': 38, 'y': 35, 'w': 5, 'h': 7}
art['filebox']['plate'] = {'x': 20, 'y': 63, 'w': 24, 'h': 12}

js = ("// Thea's desk sprites (transparent PNGs on a clean pixel grid). Swap any object by replacing its data URI.\n"
      '// The file box has its drawn folders cleared, so live folders can sit in it and leave it empty when taken out.\n'
      'window.ART = ' + json.dumps(art, indent=0) + ';\n')
(ROOT / 'src' / 'art.js').write_text(js)
print('art.js', len(js), 'bytes')
