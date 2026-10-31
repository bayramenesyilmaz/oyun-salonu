# Bölüm 5 web sahnesi: Leylek'in kokpiti (ileri yön +Y). Çıktı: <klasör>/kokpit.glb, kokpit.json
import sys, os, math, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'render'))
sys.path.insert(0, HERE)
import lib
from lib import *
import weblib
from weblib import webmat, collider, to_three
from leylek import label

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
reset(preview=True)
weblib.COLLIDERS.clear()
weblib.patch_lib_for_web()
random.seed(5)
GROUP = {}


def tag(o, g):
    for x in [o] + list(o.children_recursive):
        GROUP[x.name] = g
    return o


PANEL = webmat('painted_metal_shutter', 1.5, (0.32, 0.34, 0.35), name='panel')
HULLIN = webmat('rusty_metal_02', 0.7, (0.6, 0.62, 0.62), name='hullin')
DARK = simple((0.035, 0.035, 0.04), 0.5, 0.6, name='cockdark')
TAPE = simple((0.75, 0.73, 0.68), 0.75, name='tape')
INK = simple((0.05, 0.05, 0.05), 0.6, name='ink')
SEAT = simple((0.13, 0.11, 0.1), 0.85, name='seat')
METAL = simple((0.75, 0.75, 0.75), 0.25, 1.0, name='switchmetal')

box('floor', (2.6, 3.6, 0.05), (0, -0.8, -0.03), DARK)
box('ceil', (2.6, 2.8, 0.05), (0, -1.1, 2.05), HULLIN)
for x in (-1.3, 1.3):
    box('side', (0.05, 3.6, 2.1), (x, -0.8, 1.0), HULLIN)
    box('sidewin', (0.06, 0.7, 0.45), (x * 0.99, 0.3, 1.45), simple((0.02, 0.03, 0.05), 0.05, name='sideglass'))
box('back', (2.6, 0.05, 2.1), (0, -2.6, 1.0), HULLIN)
# ön cam çerçevesi (cam yok: görüntü temiz kalsın)
WY, tilt = 1.15, math.radians(-30)
for x, w in ((-1.25, 0.1), (0, 0.06), (1.25, 0.1)):
    box('post', (w, 0.1, 1.15), (x, WY - 0.2, 1.45), DARK, rot=(tilt, 0, 0))
box('frameT', (2.6, 0.55, 0.08), (0, WY - 0.6, 2.0), DARK)
box('frameB', (2.6, 0.14, 0.1), (0, WY + 0.05, 0.95), DARK)
# gösterge paneli
box('dash', (2.5, 0.8, 0.06), (0, 0.7, 0.86), PANEL, rot=(math.radians(-62), 0, 0))
box('dashtop', (2.5, 0.42, 0.05), (0, 0.98, 0.93), DARK)
box('console', (0.45, 0.9, 0.55), (0, 0.05, 0.27), PANEL)
model('vintage_spacecraft_instrument', (-0.62, 0.66, 0.95), (math.radians(28), 0, math.radians(180)), 1.0)
model('vintage_radio_transceiver', (0.66, 0.78, 0.96), (0, 0, math.radians(180)), 0.85)
model('retro_multimeter', (0.0, 0.2, 0.56), (0, 0, math.radians(185)), 1.0)
model('circuit_board', (1.0, 0.6, 0.95), (math.radians(28), 0, math.radians(170)), 1.0)
model('classic_laptop', (0.05, 0.66, 0.96), (0, 0, math.radians(180)), 1.0)
for i in range(16):
    x = -1.1 + i * 0.145
    sphere('led', 0.009, (x, 0.5, 0.7), emission(random.choice([(1, 0.2, 0.1), (0.2, 1, 0.3), (1, 0.7, 0.2), (0.3, 0.6, 1)]), 8 if random.random() < 0.7 else 0, 'led'), seg=8)
# büyük anahtarlar: her biri ayrı grup (JS ışığını yakar)
switches = {}
for key, lbl, x in (('guc', 'ANA GÜÇ', -0.6), ('cati', 'DEPO ÇATISI', -0.2), ('kor', 'KOR', 0.2), ('atesle', 'ATEŞLE', 0.6)):
    y, z = 0.4, 0.66
    tag(box('swbase', (0.16, 0.05, 0.12), (x, y, z), DARK, rot=(math.radians(28), 0, 0)), '!sw_' + key)
    tag(cyl('swlever', 0.012, 0.11, (x, y - 0.05, z + 0.03), METAL, rot=(math.radians(28 - 70), 0, 0), n=8), '!sw_' + key)
    tag(sphere('swled', 0.016, (x, y - 0.02, z + 0.09), emission((1.0, 0.25, 0.1), 4, 'swled_' + key), seg=10), '!led_' + key)
    tag(box('tapebg', (0.22, 0.004, 0.045), (x, y - 0.03, z - 0.1), TAPE, rot=(math.radians(28), 0, 0)), '!sw_' + key)
    tag(label(lbl, (x, y - 0.034, z - 0.1), (math.radians(90 + 28), 0, math.pi), 0.026, INK), '!sw_' + key)
    switches[key] = to_three((x, y - 0.03, z + 0.03))
# koltuklar
seats = {}
for name, x, y in (('pilot', -0.62, -0.25), ('copilot', 0.62, -0.25)):
    box('seat', (0.58, 0.58, 0.1), (x, y, 0.45), SEAT)
    box('seatback', (0.6, 0.12, 0.95), (x, y - 0.37, 0.95), SEAT, rot=(math.radians(-10), 0, 0))
    box('headrest', (0.34, 0.12, 0.25), (x, y - 0.47, 1.55), SEAT, rot=(math.radians(-10), 0, 0))
    seats[name] = to_three((x, y - 0.05, 0.5))
box('bench', (2.3, 0.55, 0.1), (0, -2.0, 0.45), SEAT)
box('benchback', (2.3, 0.1, 0.8), (0, -2.3, 0.9), SEAT)
for i, x in enumerate((-0.75, 0.0, 0.75)):
    seats['back%d' % i] = to_three((x, -2.0, 0.5))
# borular, kablolar
for i in range(6):
    cyl('pipe', 0.03, 3.2, (random.choice((-1.24, 1.24)), -0.9, 1.6 + i * 0.05), random.choice([DARK, TAPE]), rot=(math.radians(90), 0, 0), n=8)
sphere('cabinlamp', 0.05, (0, -1.0, 2.0), emission((1.0, 0.25, 0.1), 6, 'cabinred'), seg=10)

weblib.merge_groups(lambda o: GROUP.get(o.name, 'static'))
weblib.export_glb(f'{OUT}/kokpit.glb')
meta = {
    'eye': to_three((-0.62, -0.32, 1.27)), 'switches': switches, 'seats': seats,
    'window': to_three((0, 1.2, 1.45)),
}
weblib.write_meta(f'{OUT}/kokpit.json', meta)
