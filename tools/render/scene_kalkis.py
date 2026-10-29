# Sahne 3 — "Kalkış": Leylek depodan yeni çıktı; kokpitten mahalleye bakış (≈160 m). Birinci şahıs.
import sys, os, math, random
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from leylek import label

PV = '--preview' in sys.argv
OUT = sys.argv[-1] if sys.argv[-1].endswith('.png') else '/tmp/kalkis.png'
random.seed(21)
rng = np.random.default_rng(21)
reset(samples=200, w=1920, h=1080, preview=PV)
world_hdri('kloppenheim_02_puresky', strength=0.3, rot=math.radians(200), bg_strength=0.16)
import mahalle as M

# ---------------- yakın mahalle (gerçek bloklar) ----------------
plane('ground', (420, 470), (0, 110, 0), pbr('asphalt_02', 0.1), uv_scale=4)
k = 0
y = -110
while y < 330:
    dd = random.uniform(11, 15)
    x = -200 + random.uniform(-6, 6)
    near = y < 60
    while x < 200:
        w = random.uniform(10, 16)
        fl = random.choice([4, 5, 6, 6, 7, 8])
        M.block(x + w / 2, y + dd / 2, w, dd, fl, random.choice(M.PLASTERS), lit=random.uniform(0.25, 0.5), balconies=near and abs(x) < 90, roof_props=True, seed=k, detail=near and abs(x) < 90)
        x += w + random.uniform(0.5, 3.0)
        k += 1
    # sokak: sodyum lambaları (ışıyan noktalar + seyrek gerçek ışık)
    sy = y - 2.5
    for lx in range(-250, 251, 18):
        sphere('lamp', 0.25, (lx + random.uniform(-2, 2), sy, 7), emission((1.0, 0.55, 0.22), 60), seg=8)
        if random.random() < 0.35:
            point((lx, sy, 6.5), 900, (1.0, 0.55, 0.22), 0.3)
    y += dd + random.uniform(8, 11)
# ara caddeler boyunca araba farları ve stop lambaları
for i in range(60):
    yy = random.choice(range(-100, 320, 25)) - 2.5
    xx = random.uniform(-250, 250)
    sphere('car', 0.18, (xx, yy + random.choice((-1.2, 1.2)), 0.7), emission(random.choice([(1, 0.95, 0.85), (1, 0.15, 0.08)]), 80), seg=8)
# uzakta camiler
DOME = simple((0.42, 0.45, 0.48), 0.4, 0.8)
for mx, my, mh in [(-120, 260, 42), (150, 420, 46), (30, 640, 40)]:
    cyl('minare', 1.4, mh, (mx, my, mh / 2), M.PLASTERS[4], n=16)
    cyl('serefe', 2.1, 0.5, (mx, my, mh * 0.78), M.PLASTERS[4], n=16)
    cyl('kulah', 1.5, 7, (mx, my, mh + 3.5), DOME, n=16, r2=0.0)
    cyl('isik', 1.6, 0.15, (mx, my, mh * 0.78 + 0.6), emission((0.6, 1.0, 0.7), 12), n=24)
    sphere('kubbe', 12, (mx + 18, my + 6, 7), DOME, seg=32, scale=(1, 1, 0.75))
    point((mx + 18, my - 10, 3), 4000, (1.0, 0.8, 0.5), 2)

# ---------------- uzak şehir: prosedürel ışık dokusu ----------------
N = 2048 if PV else 4096
yy, xx = np.mgrid[0:N, 0:N] / N
img = np.zeros((N, N, 3), np.float32)
dens = np.zeros((N, N), np.float32)
for _ in range(16):
    cx, cy, r = rng.uniform(0.05, 0.95), rng.uniform(0.05, 0.95), rng.uniform(0.05, 0.22)
    dens += np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r)))
dens = np.clip(dens, 0, 1.4)
for _ in range(10):
    cx, cy = rng.uniform(0, 1), rng.uniform(0, 1)
    ang = rng.uniform(0, math.pi)
    step = rng.uniform(0.004, 0.009)
    u = (xx - cx) * math.cos(ang) + (yy - cy) * math.sin(ang)
    v = -(xx - cx) * math.sin(ang) + (yy - cy) * math.cos(ang)
    mask = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / 0.05))
    lines = (np.abs((u / step) - np.round(u / step)) < 0.035) | (np.abs((v / step) - np.round(v / step)) < 0.035)
    sparkle = rng.uniform(0, 1, (N, N)) < 0.35
    img += (lines * mask * sparkle)[..., None] * np.array([1.0, 0.52, 0.18], np.float32) * 2.0
for _ in range(8):
    p0 = rng.uniform(0, 1, 2)
    d = rng.normal(size=2)
    d /= np.linalg.norm(d)
    dist = np.abs((xx - p0[0]) * d[1] - (yy - p0[1]) * d[0])
    img += np.exp(-(dist / 0.0008) ** 2)[..., None] * np.array([2.4, 1.4, 0.55], np.float32)
kk = int(N * N * 0.004)
px, py = rng.integers(0, N, kk), rng.integers(0, N, kk)
keep = rng.uniform(0, 1.4, kk) < dens[py, px]
px, py = px[keep], py[keep]
col = rng.choice(np.array([[1.0, 0.75, 0.45], [1.0, 0.85, 0.65], [0.85, 0.9, 1.0], [1.0, 0.6, 0.3]], np.float32), size=len(px))
img[py, px] += col * rng.uniform(0.6, 2.2, (len(px), 1)).astype(np.float32)
img *= np.clip((dens - 0.25) * 1.5, 0.0, 1.0)[..., None]
img = np.clip(img, 0, 6)
bimg = bpy.data.images.new('city', N, N, alpha=True, float_buffer=True)
bimg.pixels.foreach_set(np.concatenate([img, np.ones((N, N, 1), np.float32)], axis=2).ravel())
bimg.pack()
cm = bpy.data.materials.new('citytex')
cm.use_nodes = True
nt = cm.node_tree
nt.nodes.clear()
o = nt.nodes.new('ShaderNodeOutputMaterial')
e = nt.nodes.new('ShaderNodeEmission')
t = nt.nodes.new('ShaderNodeTexImage')
t.image = bimg
t.interpolation = 'Cubic'
e.inputs['Strength'].default_value = 0.3
nt.links.new(t.outputs['Color'], e.inputs['Color'])
nt.links.new(e.outputs[0], o.inputs['Surface'])
plane('farcity', (16000, 16000), (0, 7500, -0.3), cm, uv_scale=16000)
# UV'yi 0..1 aralığına kaydır
fc = bpy.data.objects['farcity']
for l in fc.data.uv_layers.active.data:
    l.uv = (l.uv[0] + 0.5, l.uv[1] + 0.5 - 7500 / 16000)
# ufuk pusu: dünya rengine hafif turuncu katkı (hacim yok; hızlı)
# ---------------- kokpit (kameraya bağlı) ----------------
CAMPOS = Vector((8, -150, 95))
LOOK = Vector((-10, 220, 12))
cam = camera(tuple(CAMPOS), tuple(LOOK), lens=19)
DARK = simple((0.03, 0.03, 0.035), 0.55, 0.6, name='cockdark')
PANEL = pbr('painted_metal_shutter', 1.6, tint=(0.3, 0.32, 0.33), name='panel')
TAPE = simple((0.75, 0.73, 0.68), 0.75, name='tape')
parts = []
# kamera uzayı: -Z ileri, +Y yukarı, +X sağ
def cb(name, size, loc, mat, rot=(0, 0, 0)):
    o = box(name, size, loc, mat, rot=rot)
    parts.append(o)
    return o
cb('dash', (3.0, 0.9, 0.06), (0, -0.78, -0.95), PANEL, rot=(math.radians(-40), 0, 0))
cb('dashtop', (3.0, 0.08, 0.4), (0, -0.48, -1.05), DARK)
cb('frameB', (3.2, 0.1, 0.08), (0, -0.44, -1.25), DARK)
cb('frameT', (3.2, 0.14, 0.4), (0, 0.78, -1.05), DARK)
for x, w in ((-1.55, 0.25), (1.55, 0.25), (0.0, 0.07)):
    cb('post', (w, 1.3, 0.08), (x, 0.17, -1.25), DARK, rot=(0, 0, math.radians(-6 if x < 0 else 6 if x > 0 else 0)))
for i in range(18):
    x = -1.2 + i * 0.14
    s_ = sphere('led', 0.01, (x, -0.62, -0.83), emission(random.choice([(1, 0.2, 0.1), (0.2, 1, 0.3), (1, 0.7, 0.2), (0.3, 0.6, 1)]), 40 if random.random() < 0.7 else 0), seg=8)
    parts.append(s_)
for txt, x in [('ATEŞLE', -0.75), ('KOR', 0.0), ('KUMRU', 0.75)]:
    parts.append(cb('tapebg', (0.24, 0.05, 0.004), (x, -0.7, -0.88), TAPE, rot=(math.radians(-40), 0, 0)))
    lb = label(txt, (x, -0.7, -0.877), (math.radians(-40), 0, 0), 0.035, simple((0.05, 0.05, 0.05), 0.6))
    parts.append(lb)
for o in parts:
    o.parent = cam
# kabin içi loş kırmızı ve gösterge yeşili
for (p, c, e) in [((0, 0.6, 0.3), (1.0, 0.22, 0.1), 6), ((0, -0.5, -0.6), (0.35, 0.9, 0.55), 3)]:
    L = point(p, e, c, 0.3)
    L.parent = cam
compositor_glare(threshold=2.0, size=0.75, strength=0.45)
bpy.context.scene.view_settings.exposure = 0.7
render(OUT)
