# Bölüm 2 web sahnesi: mahalle sokakları (ana cadde, ara sokak, arka sokak) ve vinç deposunun dışı.
# Çıktı: <klasör>/sokak.glb, sokak.json
import sys, os, math, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'render'))
sys.path.insert(0, HERE)
import lib
from lib import *
import weblib
from weblib import webmat, collider, to_three

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
reset(preview=True)
weblib.COLLIDERS.clear()
weblib.patch_lib_for_web()
import mahalle as M
weblib.web_simplify(M)
random.seed(23)

ASPH = webmat('asphalt_02', 0.15)
PAVE = webmat('concrete_pavers', 0.5)
CURB = simple((0.55, 0.55, 0.53), 0.8, name='curb')
CORR = webmat('rusty_corrugated_iron', 0.45)
BRICK = webmat('brick_wall_02', 0.5)
lamps, cover = [], []


def row(x0, x1, y_front, depth, face, near=True, seed0=0, skip=()):
    """Bitişik apartman sırası; aralarında boşluk yok (oyuncu sızamaz)."""
    x = x0
    k = 0
    while x < x1 - 4:
        w = min(random.uniform(10, 15), x1 - x)
        if any(a <= x + w / 2 <= b for a, b in skip):
            x += w
            continue
        cy = y_front - face * depth / 2  # face=-1: ön yüz -Y'ye bakar → bina +Y tarafında
        fl = random.choice([4, 5, 5, 6, 6, 7])
        b = M.block(x + w / 2, cy, w, depth, fl, random.choice(M.PLASTERS), face=face, lit=random.uniform(0.25, 0.5),
                    balconies=near, roof_props=True, seed=seed0 + k, detail=near)
        weblib.COLLIDERS.append({'c': to_three((x + w / 2, cy, fl * 1.5)), 'h': [w / 2, fl * 1.5, depth / 2]})
        x += w + 0.15
        k += 1


def lamp(x, y, side):
    sphere('lamp', 0.22, (x, y, 6.6), emission((1.0, 0.55, 0.22), 25, 'lampglow'), seg=8)
    box('pole', (0.12, 0.12, 6.6), (x, y + side * 0.3, 3.3), M.RAIL)
    box('arm', (0.08, 0.6, 0.08), (x, y + side * 0.05, 6.75), M.RAIL)
    lamps.append(to_three((x, y, 6.4)))


def car(x, y, rz=0.0):
    c = model('covered_car', (x, y, 0), (0, 0, rz), 1.0)
    collider(c, pad=-0.05)
    cover.append(to_three((x, y, 0)))
    return c


# ---------------- zemin ----------------
plane('main', (150, 10), (0, 0, 0.0), ASPH, uv_scale=4)
for y in (-6.25, 6.25):
    plane('walk', (150, 2.5), (0, y, 0.12), PAVE, uv_scale=1)
    box('curb', (150, 0.2, 0.14), (0, y - math.copysign(1.3, y), 0.07), CURB)
plane('alley', (6, 36), (10.5, 25, 0.02), PAVE, uv_scale=1)
plane('back', (110, 10), (20, 49, 0.0), ASPH, uv_scale=4)
plane('lot', (60, 30), (-55, -22, -0.02), webmat('dry_ground_01', 1.0))

# ---------------- bloklar ----------------
# ana caddenin güneyi (önleri caddeye, +Y'ye bakar); arsaya açılan boşluk x∈[-60,-48]
row(-75, -60, -7.5, 12, 1, seed0=0)
row(-48, 75, -7.5, 12, 1, seed0=20)
# kuzey: ana caddeye bakan sıra ve arka sokağa bakan sıra; ara sokak x∈[8,13]
row(-75, 8, 7.5, 12, -1, seed0=40)
row(13, 75, 7.5, 12, -1, seed0=60)
row(-30, 8, 44, 12, 1, seed0=80, near=False)
row(13, 75, 44, 12, 1, seed0=100, near=False)
# ara sokaktaki bahçe duvarları (iki sıra arası)
for x in (8.0, 13.0):
    w = box('gwall', (0.3, 12.5, 2.6), (x, 25.75, 1.3), BRICK)
    collider(w)
# arka sokağın kuzeyi: depo ve yanındaki binalar
row(-30, 14, 54, 12, -1, seed0=120, near=False)
row(47, 75, 54, 12, -1, seed0=140, near=False)
# uç duvarlar
for x, y0, y1 in [(-75, -14, 14), (75, -14, 60), (-30, 44, 56)]:
    w = box('endwall', (0.4, y1 - y0, 4), (x, (y0 + y1) / 2, 2), BRICK)
    collider(w)
# arsa ağzı: bariyer ve şerit (polis kordonu)
for x in (-58, -54, -50):
    b = model('concrete_road_barrier', (x, -9.5, 0), (0, 0, 0), 1.0)
tape = box('tape', (12, 0.02, 0.06), (-54, -9.3, 1.0), emission((0.9, 0.75, 0.1), 0.6, 'tapeglow'))
weblib.COLLIDERS.append({'c': to_three((-54, -10.5, 1)), 'h': [7, 1, 1.5], 'inv': 1})

# ---------------- vinç deposu (dış) ----------------
DX0, DX1, DY0, DY1, DH = 15, 46, 55, 75, 10
box('depo', (DX1 - DX0, DY1 - DY0, DH), ((DX0 + DX1) / 2, (DY0 + DY1) / 2, DH / 2), CORR, uv_scale=1)
box('depobase', (DX1 - DX0 + 0.1, DY1 - DY0 + 0.1, 2.0), ((DX0 + DX1) / 2, (DY0 + DY1) / 2, 1.0), BRICK)
weblib.COLLIDERS.append({'c': to_three(((DX0 + DX1) / 2, (DY0 + DY1) / 2, 5)), 'h': [(DX1 - DX0) / 2, 5, (DY1 - DY0) / 2]})
box('roofslope', (DX1 - DX0 + 0.6, DY1 - DY0 + 0.6, 0.3), ((DX0 + DX1) / 2, (DY0 + DY1) / 2, DH + 0.15), webmat('worn_corrugated_iron', 0.45))
shutter = model('rollershutter_door', (24, DY0 - 0.08, 0), (0, 0, 0), 1.6)
box('sign', (6, 0.1, 1.0), (30, DY0 - 0.1, 7.5), simple((0.75, 0.6, 0.15), 0.6, name='signyellow'))
sphere('depolamp', 0.12, (21.5, DY0 - 0.4, 4.2), emission((1.0, 0.75, 0.45), 18, 'bulbglow'), seg=8)

# ---------------- sokak eşyası (siper) ----------------
car(-47, -3.6)          # başlangıçta arkasına saklandığımız araba
car(-33, 3.6, math.pi)
car(-22, -3.6)
car(-12, 3.6, math.pi)
car(-4, -3.6)
car(18, -3.6)
car(30, 3.6, math.pi)
for x, y in [(-27, -5.4), (-8, 5.4), (6.8, 5.6), (13.6, 6.0), (10, 18), (11.6, 30), (9.6, 38), (4, 45.6), (35, 52.6)]:
    t = model('metal_trash_can', (x, y, 0.12 if abs(y) < 8 else 0), (0, 0, random.uniform(0, 6)), 1.0)
    collider(t, pad=-0.05)
for x, y in [(-17, -5.6), (24, 5.6), (40, 45.5)]:
    u = model('utility_box_01', (x, y, 0.12 if abs(y) < 8 else 0), (0, 0, 0), 1.0)
    collider(u)
# ara sokak: çamaşır ipleri, karton kutular
for i, y in enumerate((14, 21, 28, 35)):
    for k in range(5):
        box('cl', (0.4, 0.01, 0.55), (8.8 + k * 0.85, y, 4.0 + 0.1 * math.sin(k)), random.choice(M.CURTAINS))
    cyl('rope', 0.006, 5, (10.5, y, 4.35), M.RAIL, rot=(0, math.radians(90), 0), n=4)
for x, y in [(12.2, 16), (8.9, 24), (12.3, 33)]:
    c = model('cardboard_box_01', (x, y, 0), (0, 0, random.uniform(0, 3)), 1.2)
    collider(c)

# ---------------- polis arabası (kutulardan) ----------------
PCX, PCY = -40, 2.2
WHITE = simple((0.85, 0.87, 0.9), 0.35, 0.3, name='policewhite')
NAVY = simple((0.05, 0.12, 0.3), 0.35, 0.3, name='policenavy')
GLASSD = simple((0.03, 0.04, 0.05), 0.08, 0.0, name='carglass')
TIRE = simple((0.03, 0.03, 0.03), 0.9, name='tire')
box('pbody', (4.4, 1.8, 0.75), (PCX, PCY, 0.65), WHITE)
box('pstripe', (4.42, 1.82, 0.18), (PCX, PCY, 0.62), NAVY)
box('pcab', (2.3, 1.62, 0.6), (PCX - 0.2, PCY, 1.3), GLASSD)
box('proof', (2.0, 1.55, 0.06), (PCX - 0.25, PCY, 1.62), WHITE)
box('pbarbase', (0.25, 1.3, 0.08), (PCX - 0.2, PCY, 1.69), simple((0.1, 0.1, 0.1), 0.5, name='barbase'))
box('polisKirmizi', (0.22, 0.6, 0.12), (PCX - 0.2, PCY + 0.33, 1.78), emission((1.0, 0.05, 0.03), 20, 'polisKirmizi'))
box('polisMavi', (0.22, 0.6, 0.12), (PCX - 0.2, PCY - 0.33, 1.78), emission((0.05, 0.2, 1.0), 20, 'polisMavi'))
for dx in (-1.4, 1.4):
    for dy in (-0.85, 0.85):
        cyl('wheel', 0.34, 0.24, (PCX + dx, PCY + dy, 0.34), TIRE, rot=(math.radians(90), 0, 0), n=16)
box('hl', (0.05, 1.4, 0.12), (PCX + 2.2, PCY, 0.8), emission((1.0, 0.95, 0.85), 8, 'headlight'))
weblib.COLLIDERS.append({'c': to_three((PCX, PCY, 0.9)), 'h': [2.2, 0.9, 0.95]})

# ---------------- sokak lambaları ----------------
for x in range(-66, 72, 16):
    lamp(x, -5.3, -1)
    lamp(x + 8, 5.3, 1)
for x in range(-22, 70, 18):
    lamp(x, 45.2, -1)
sphere('alleybulb', 0.08, (12.6, 22, 3.4), emission((1.0, 0.8, 0.5), 12, 'bulbglow'), seg=8)

# uzak camiler (siluet)
DOME = simple((0.45, 0.48, 0.5), 0.4, 0.8, name='dome')
for mx, my, mh in [(-60, 160, 42), (90, 190, 38)]:
    cyl('minare', 1.3, mh, (mx, my, mh / 2), M.PLASTERS[4], n=12)
    cyl('kulah', 1.4, 7, (mx, my, mh + 3.5), DOME, n=12, r2=0.0)
    cyl('isik', 1.45, 0.12, (mx, my, mh * 0.78 + 0.6), emission((0.6, 1.0, 0.7), 6, 'serefeglow'), n=16)
    sphere('kubbe', 11, (mx + 16, my + 6, 6), DOME, seg=24, scale=(1, 1, 0.75))

weblib.merge_by_material()
weblib.export_glb(f'{OUT}/sokak.glb')
meta = {
    'spawn': to_three((-49.5, -5.8, 0)), 'spawnYaw': -80,
    'lamps': lamps, 'cover': cover,
    'policeCar': to_three((PCX, PCY, 1.8)),
    'depoDoor': to_three((24, DY0 - 1.2, 0)), 'depoLamp': to_three((21.5, DY0 - 0.5, 4.0)),
    'alleyIn': to_three((10.5, 5.5, 0)), 'alleyOut': to_three((10.5, 43.5, 0)),
    'checkpoints': [to_three((-49.5, -5.8, 0)), to_three((10.5, 3.5, 0)), to_three((10.5, 42.5, 0))],
    'kaan': {'p': to_three((-48.6, -6.4, 0)), 'yaw': 100},
    'mert': {'p': to_three((-50.5, -6.8, 0)), 'yaw': 60},
    'mertDoor': {'p': to_three((22.2, DY0 - 1.0, 0)), 'yaw': 180},
    'guards': {
        # polis 1: arabanın yanında; Kaan onu arsa ağzına götürür
        'p1': {'who': 'polis', 'path': [to_three((-41.5, -0.6, 0))], 'post': to_three((-55, -8.2, 0)), 'postYaw': 180},
        # polis 2: ana caddede devriye (güney kaldırım)
        'p2': {'who': 'polis', 'path': [to_three((-28, -6.3, 0.12)), to_three((4, -6.3, 0.12))], 'wait': 3.0},
        # bekçi: arka sokakta devriye
        'b1': {'who': 'bekci', 'path': [to_three((0, 48, 0)), to_three((44, 48, 0)), to_three((44, 51.5, 0)), to_three((0, 51.5, 0))], 'wait': 2.5},
    },
}
weblib.write_meta(f'{OUT}/sokak.json', meta)
