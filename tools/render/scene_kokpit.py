# Sahne 3 — "Kalkış": Leylek'in kokpiti, mahallenin 3 km üstü. Birinci şahıs (sağ koltuk).
import sys, os, math, random
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from leylek import label

PV = '--preview' in sys.argv
OUT = sys.argv[-1] if sys.argv[-1].endswith('.png') else '/tmp/kokpit.png'
random.seed(5)
rng = np.random.default_rng(5)
reset(samples=200, w=1920, h=1080, preview=PV)
world_hdri('kloppenheim_02_puresky', strength=0.25, rot=math.radians(80), bg_strength=0.8)

ALT = 3000.0
# ---------------- şehir ışıkları (prosedürel doku) ----------------
N = 2048 if PV else 4096
img = np.zeros((N, N, 3), np.float32)
dens = np.zeros((N, N), np.float32)
# mahalle yoğunluğu: birkaç büyük leke
yy, xx = np.mgrid[0:N, 0:N] / N
for _ in range(14):
    cx, cy, r = rng.uniform(0.1, 0.9), rng.uniform(0.1, 0.9), rng.uniform(0.06, 0.25)
    dens += np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r)))
dens = np.clip(dens, 0, 1.4)
# sokak ızgarası (hafif açılı, mahalle mahalle döner)
for _ in range(9):
    cx, cy = rng.uniform(0, 1), rng.uniform(0, 1)
    ang = rng.uniform(0, math.pi)
    step = rng.uniform(0.004, 0.008)
    u = (xx - cx) * math.cos(ang) + (yy - cy) * math.sin(ang)
    v = -(xx - cx) * math.sin(ang) + (yy - cy) * math.cos(ang)
    mask = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / 0.04))
    lines = (np.abs((u / step) - np.round(u / step)) < 0.06) | (np.abs((v / step) - np.round(v / step)) < 0.06)
    img[..., 0] += lines * mask * 1.0
    img[..., 1] += lines * mask * 0.52
    img[..., 2] += lines * mask * 0.18
# ana yollar (daha parlak)
for _ in range(6):
    p0 = rng.uniform(0, 1, 2)
    d = rng.normal(size=2)
    d /= np.linalg.norm(d)
    dist = np.abs((xx - p0[0]) * d[1] - (yy - p0[1]) * d[0])
    road = np.exp(-(dist / 0.0012) ** 2)
    img[..., 0] += road * 2.5
    img[..., 1] += road * 1.5
    img[..., 2] += road * 0.6
# pencere ve bina ışıkları: rastgele noktalar
k = int(N * N * 0.012)
px, py = rng.integers(0, N, k), rng.integers(0, N, k)
keep = rng.uniform(0, 1.4, k) < dens[py, px]
px, py = px[keep], py[keep]
col = rng.choice([[1.0, 0.75, 0.45], [1.0, 0.85, 0.65], [0.85, 0.9, 1.0], [1.0, 0.6, 0.3]], size=len(px))
img[py, px] += col * rng.uniform(0.6, 2.2, (len(px), 1))
img *= np.clip(dens, 0.05, 1.0)[..., None]
img = np.clip(img, 0, 6)
bimg = bpy.data.images.new('city', N, N, alpha=True, float_buffer=True)
rgba = np.concatenate([img, np.ones((N, N, 1), np.float32)], axis=2)
bimg.pixels.foreach_set(rgba.ravel())
bimg.pack()
cm = bpy.data.materials.new('city')
cm.use_nodes = True
nt = cm.node_tree
nt.nodes.clear()
o = nt.nodes.new('ShaderNodeOutputMaterial')
e = nt.nodes.new('ShaderNodeEmission')
t = nt.nodes.new('ShaderNodeTexImage')
t.image = bimg
t.interpolation = 'Cubic'
e.inputs['Strength'].default_value = 3.0
nt.links.new(t.outputs['Color'], e.inputs['Color'])
nt.links.new(e.outputs[0], o.inputs['Surface'])
city = plane('city', (24000, 24000), (0, 9000, 0), cm)
# ufukta şehir parıltısı: alçak, saydam, ışıyan bir kubbe kuşağı
glow = bpy.data.materials.new('horizonglow')
glow.use_nodes = True
g = glow.node_tree
g.nodes.clear()
go = g.nodes.new('ShaderNodeOutputMaterial')
ge = g.nodes.new('ShaderNodeEmission')
gt = g.nodes.new('ShaderNodeBsdfTransparent')
gx = g.nodes.new('ShaderNodeAddShader')
gc = g.nodes.new('ShaderNodeTexCoord')
gs = g.nodes.new('ShaderNodeSeparateXYZ')
gr = g.nodes.new('ShaderNodeValToRGB')
gr.color_ramp.elements[0].position = 0.0
gr.color_ramp.elements[0].color = (1.0, 0.55, 0.25, 1)
gr.color_ramp.elements[1].position = 0.5
gr.color_ramp.elements[1].color = (0, 0, 0, 1)
g.links.new(gc.outputs['Generated'], gs.inputs['Vector'])
g.links.new(gs.outputs['Z'], gr.inputs['Fac'])
g.links.new(gr.outputs['Color'], ge.inputs['Color'])
ge.inputs['Strength'].default_value = 0.35
g.links.new(ge.outputs[0], gx.inputs[0])
g.links.new(gt.outputs[0], gx.inputs[1])
g.links.new(gx.outputs[0], go.inputs['Surface'])
band = cyl('glowband', 60000, 9000, (0, 0, 2500), glow, n=96)
# ince bulut tabakası (altımızda): gürültülü yarı saydam düzlem
cl = bpy.data.materials.new('clouds')
cl.use_nodes = True
c = cl.node_tree
c.nodes.clear()
co = c.nodes.new('ShaderNodeOutputMaterial')
cmx = c.nodes.new('ShaderNodeMixShader')
ct = c.nodes.new('ShaderNodeBsdfTransparent')
cd = c.nodes.new('ShaderNodeBsdfDiffuse')
cd.inputs['Color'].default_value = (0.55, 0.5, 0.48, 1)
cn = c.nodes.new('ShaderNodeTexNoise')
cn.inputs['Scale'].default_value = 3.0
cn.inputs['Detail'].default_value = 10
crr = c.nodes.new('ShaderNodeValToRGB')
crr.color_ramp.elements[0].position = 0.52
crr.color_ramp.elements[1].position = 0.72
c.links.new(cn.outputs['Fac'], crr.inputs['Fac'])
c.links.new(crr.outputs['Color'], cmx.inputs['Fac'])
c.links.new(ct.outputs[0], cmx.inputs[1])
c.links.new(cd.outputs[0], cmx.inputs[2])
c.links.new(cmx.outputs[0], co.inputs['Surface'])
plane('cloudlayer', (30000, 30000), (0, 9000, 1800), cl)

# ---------------- kokpit (yerel koordinat: z = ALT) ----------------
Z = ALT
PANEL = pbr('painted_metal_shutter', 1.5, tint=(0.32, 0.34, 0.35), name='panel')
DARK = simple((0.035, 0.035, 0.04), 0.5, 0.6, name='cockdark')
TAPE = simple((0.75, 0.73, 0.68), 0.75, name='tape')
SEAT = simple((0.13, 0.11, 0.1), 0.85, name='seat')
box('floor', (2.6, 3.4, 0.05), (0, -0.7, Z - 0.03), DARK)
box('ceil', (2.6, 2.6, 0.05), (0, -1.0, Z + 2.05), PANEL)
for x in (-1.3, 1.3):
    box('side', (0.05, 3.4, 2.1), (x, -0.7, Z + 1.0), PANEL)
    box('sidewin', (0.06, 0.7, 0.45), (x, 0.3, Z + 1.45), DARK)
# büyük ön cam: çerçeve ve orta direk (cam yok sayılır; yansıma görüntüyü kirletmesin)
WY, WZ0, WZ1 = 1.15, 0.95, 1.95
tilt = math.radians(-30)
for x in (-1.25, 0, 1.25):
    box('post', (0.08 if x else 0.06, 0.1, 1.15), (x, WY - 0.2, (WZ0 + WZ1) / 2 + Z), DARK, rot=(tilt, 0, 0))
box('frameT', (2.6, 0.5, 0.08), (0, WY - 0.55, Z + WZ1 + 0.05), DARK)
box('frameB', (2.6, 0.12, 0.1), (0, WY + 0.08, Z + WZ0), DARK)
# gösterge paneli
box('dash', (2.5, 0.8, 0.06), (0, 0.7, Z + 0.86), PANEL, rot=(math.radians(-62), 0, 0))
box('dashtop', (2.5, 0.42, 0.05), (0, 0.98, Z + 0.93), DARK)
box('console', (0.45, 0.9, 0.55), (0, 0.05, Z + 0.27), PANEL)
model('vintage_spacecraft_instrument', (-0.6, 0.62, Z + 0.95), (math.radians(28), 0, math.radians(180)), 1.0)
model('vintage_radio_transceiver', (0.62, 0.75, Z + 0.96), (0, 0, math.radians(180)), 0.9)
model('retro_multimeter', (0.0, 0.2, Z + 0.56), (0, 0, math.radians(185)), 1.0)
model('circuit_board', (1.0, 0.55, Z + 0.95), (math.radians(28), 0, math.radians(170)), 1.0)
model('classic_laptop', (0.05, 0.62, Z + 0.96), (0, 0, math.radians(180)), 1.0)
area((0.05, 0.55, Z + 1.15), (0.05, -1, Z + 1.35), 3, 0.35, (0.55, 0.75, 1.0))
for i in range(16):
    x = -1.1 + i * 0.145
    sphere('led', 0.009, (x, 0.48, Z + 0.68), emission(random.choice([(1, 0.2, 0.1), (0.2, 1, 0.3), (1, 0.7, 0.2), (0.3, 0.6, 1)]), 30 if random.random() < 0.7 else 0), seg=8)
for txt, x in [('ATEŞLE', -0.6), ('KUMRU', 0.62), ('KOR', 0.0)]:
    box('tapebg', (0.2, 0.004, 0.045), (x, 0.42, Z + 0.62), TAPE, rot=(math.radians(28), 0, 0))
    label(txt, (x, 0.416, Z + 0.62), (math.radians(90 + 28), 0, math.pi), 0.03, simple((0.05, 0.05, 0.05), 0.6))
# kabin ışığı: kırmızı gece lambası + panelden yeşil yansıma
point((0, -1.0, Z + 1.95), 10, (1.0, 0.22, 0.1), 0.25)
area((0, 0.6, Z + 0.8), (0, -1, Z + 1.5), 6, 2.0, (0.35, 0.85, 0.55))

# ---------------- pilotlar: Arda (sol), Elif (sağ) ----------------
SIT = {'L Thigh': (0, 0, 85), 'R Thigh': (0, 0, 85), 'L Calf': (0, 0, -88), 'R Calf': (0, 0, -88),
       'L UpperArm': (0, 30, -40), 'R UpperArm': (0, -30, -40), 'L Forearm': (0, 0, -45), 'R Forearm': (0, 0, -45)}
for who, x, extra in [('arda', -0.62, {'Head': (10, 0, -6)}), ('elif', 0.62, {'Head': (-14, 0, -2)})]:
    box('seat', (0.58, 0.58, 0.1), (x, -0.25, Z + 0.45), SEAT)
    box('seatback', (0.6, 0.12, 0.95), (x, -0.62, Z + 0.95), SEAT, rot=(math.radians(-10), 0, 0))
    box('headrest', (0.34, 0.12, 0.25), (x, -0.72, Z + 1.55), SEAT, rot=(math.radians(-10), 0, 0))
    person(who, loc=(x, -0.3, Z + 0.5 - 0.9 + 0.08), rot_z=math.radians(180), pose={**SIT, **extra})

# ---------------- kamera: koltukların arkası (Kaan'ın açılır koltuğu) ----------------
camera((0.08, -2.1, Z + 1.5), (0.0, 8, Z + 0.75), lens=20)
compositor_glare(threshold=2.0, size=0.7, strength=0.4)
bpy.context.scene.view_settings.exposure = 0.9
render(OUT)
