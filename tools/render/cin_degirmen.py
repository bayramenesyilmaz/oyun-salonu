# Karaçam Dosyaları — Vaka 2 olay yeri: su değirmeninin içi, gece 02.40 (1986).
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = sys.argv[-1]
pv = '--preview' in sys.argv
random.seed(11)
reset(samples=160, w=1600, h=900, preview=pv)
sc = bpy.context.scene
W, D, H = 6.0, 5.2, 3.2


def meshes(root):
    return [o for o in [root] + list(root.children_recursive) if o.type == 'MESH']


def bbox(root):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes(root) for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))


def put(mid, x, y, z=0.0, rz=0.0, s=1.0, floor=True, rx=0.0, ry=0.0):
    r = model(mid, (x, y, z), (math.radians(rx), math.radians(ry), math.radians(rz)), s)
    if floor:
        mn, mx = bbox(r)
        r.location.z += z - mn.z
    return r


def on(base, mid, fx=0.5, fy=0.5, rz=0.0, s=1.0, rx=0.0, dz=0.0):
    mn, mx = bbox(base)
    return put(mid, mn.x + (mx.x - mn.x) * fx, mn.y + (mx.y - mn.y) * fy, mx.z + dz, rz, s, True, rx)


# ---------- oda ----------
FLOOR = pbr('wood_planks_dirt', 2.0, tint=(0.8, 0.72, 0.62))
STONE = pbr('plastered_stone_wall', 1.6, tint=(0.85, 0.8, 0.72))
PLANK = pbr('wooden_rough_planks', 1.4, tint=(0.62, 0.5, 0.4))
plane('floor', (W, D), (0, 0, 0), FLOOR)
for name, size, loc, rot, mat in (
    ('wall_back', (W, H), (0, D / 2, H / 2), (math.pi / 2, 0, 0), STONE),
    ('wall_left', (D, H), (-W / 2, 0, H / 2), (math.pi / 2, 0, math.pi / 2), STONE),
    ('wall_right', (D, H), (W / 2, 0, H / 2), (math.pi / 2, 0, -math.pi / 2), STONE),
    ('wall_front', (W, H), (0, -D / 2, H / 2), (math.pi / 2, 0, math.pi), STONE),
    ('ceil', (W, D), (0, 0, H), (math.pi, 0, 0), PLANK),
):
    plane(name, size, loc, mat, rot=rot)
for i, x in enumerate((-2.2, -0.7, 0.8, 2.3)):
    box('beam%d' % i, (0.22, D, 0.26), (x, 0, H - 0.14), PLANK)
for i, y in enumerate((-1.2, 1.2)):
    box('post%d' % i, (0.2, 0.2, H), (-0.7, y, H / 2), PLANK)

# değirmen taşı tezgâhı
STN = pbr('stone_floor', 0.6, tint=(0.8, 0.78, 0.74))
box('platform', (1.9, 1.9, 0.55), (-0.9, 0.9, 0.275), PLANK)
cyl('vat', 0.82, 0.32, (-0.9, 0.9, 0.71), PLANK, n=40)
cyl('runner', 0.7, 0.24, (-0.9, 0.9, 0.98), STN, n=48)
cyl('eye', 0.12, 0.26, (-0.9, 0.9, 1.0), simple((0.05, 0.05, 0.05), 0.6), n=16)
hop = cyl('hopper', 0.55, 0.6, (-0.9, 0.9, 1.65), PLANK, n=4, r2=0.12)
hop.rotation_euler = (0, math.pi, math.radians(45))
box('hopper_frame', (0.08, 1.2, 0.08), (-0.9, 0.9, 2.0), PLANK)
box('chute', (0.15, 0.5, 0.06), (-0.4, 0.5, 0.75), PLANK, rot=(0, math.radians(-25), math.radians(30)))
TASOBJ = [o for o in bpy.data.objects if o.name.split('.')[0] in ('platform', 'vat', 'runner', 'hopper', 'eye')]
# un yığını ve un lekeleri
FLOUR = simple((0.92, 0.9, 0.85), 0.95, name='flour')
pile = sphere('flourpile', 0.35, (-0.05, 0.25, 0.0), FLOUR, scale=(1.3, 1.0, 0.32))
for i in range(14):
    a = random.random() * math.tau
    r = 0.3 + random.random() * 1.2
    p = plane('flour%d' % i, (0.3 + random.random() * 0.5, 0.2 + random.random() * 0.4), (-0.6 + math.cos(a) * r, 0.5 + math.sin(a) * r, 0.003 + i * 0.0003), FLOUR, rot=(0, 0, random.random() * 3))
UNOBJ = [pile] + [o for o in bpy.data.objects if o.name.startswith('flour') and o.type == 'MESH']

# su çarkı mili ve dişli (sol duvarda)
GEAR = pbr('wooden_rough_planks', 0.8, tint=(0.5, 0.4, 0.3))
gx, gy, gz = -W / 2 + 0.45, 1.0, 1.4
cyl('gear', 1.05, 0.14, (gx, gy, gz), GEAR, rot=(0, math.radians(90), 0), n=48)
for i in range(24):
    a = i / 24 * math.tau
    box('tooth', (0.16, 0.08, 0.12), (gx + 0.12, gy + math.cos(a) * 1.08, gz + math.sin(a) * 1.08), GEAR, rot=(a, 0, 0))
for i in range(4):
    a = i / 4 * math.pi
    box('spoke', (0.1, 2.0, 0.1), (gx - 0.02, gy, gz), PLANK, rot=(a, 0, 0))
cyl('axle', 0.09, 2.2, (gx + 0.9, gy, gz), simple((0.08, 0.07, 0.06), 0.5, 0.8, name='iron'), rot=(0, math.radians(90), 0), n=16)

# devlet ambarı çuvalları (sağ arka)
SACKS = []
for i, (x, y, z, rz) in enumerate([(1.9, 1.9, 0, 10), (2.45, 1.85, 0, -15), (2.2, 1.45, 0, 30), (2.15, 1.75, 0.3, 80), (1.55, 1.4, 0, -40), (2.6, 1.2, 0, 5)]):
    s = put('cement_bag', x, y, z, rz=rz)
    SACKS.append(s)
STAMP = simple((0.55, 0.06, 0.05), 0.8, name='stamp', alpha=0.85)
for s in SACKS[:4]:
    mn, mx = bbox(s)
    plane('stamp', (0.18, 0.12), ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mx.z + 0.002), STAMP, rot=(0, 0, random.random()))
crate = put('wooden_crate_01', 2.4, -0.4, rz=20)
put('wooden_barrels_01', -2.4, -1.6, rz=40)
put('wooden_ladder', 0.6, D / 2 - 0.25, rz=0, rx=12)

# pencere (sağ duvar, aralık) + ay ışığı
WIN = (W / 2, -0.6, 1.7)
FR = simple((0.22, 0.16, 0.1), 0.8, name='winframe')
for dz in (-0.45, 0.45):
    box('wf', (0.14, 1.0, 0.07), (WIN[0] - 0.05, WIN[1], WIN[2] + dz), FR)
for dy in (-0.5, 0.5):
    box('wf', (0.14, 0.07, 0.95), (WIN[0] - 0.05, WIN[1] + dy, WIN[2]), FR)
plane('night', (0.95, 0.85), (WIN[0] - 0.01, WIN[1], WIN[2]), emission((0.06, 0.1, 0.2), 0.8, 'nightglass'), rot=(math.pi / 2, 0, -math.pi / 2))
shutter = box('shutter', (0.04, 0.5, 0.9), (WIN[0] - 0.3, WIN[1] - 0.72, WIN[2]), PLANK, rot=(0, 0, math.radians(-50)))
PENCERE = [o for o in bpy.data.objects if o.name.startswith(('wf', 'night', 'shutter'))]
area((WIN[0] + 0.8, WIN[1], WIN[2] + 0.2), (-0.6, 0.6, 0.2), 120, 0.9, (0.55, 0.68, 1.0), name='moon')
spot((WIN[0] - 0.2, WIN[1], 2.2), (-0.8, 0.2, 0.0), 260, 45, 0.6, (0.6, 0.72, 1.0), name='moonbeam')

# asılı fener (yanık)
lan = put('Lantern_01', 0.1, -0.3, 2.1, floor=False)
mn, mx = bbox(lan)
cyl('lanwire', 0.005, H - mx.z, ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mx.z + H) / 2), simple((0.05, 0.05, 0.05), 0.5, 0.9))
point(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2), 55, (1.0, 0.62, 0.3), 0.04, name='lanflame')
area((0.3, -2.0, H - 0.1), (0.0, 0.8, 0.0), 40, 2.0, (1.0, 0.8, 0.6), name='fill')

# ---------- aranan nesneler ----------
items = {}
def item(key, label, obj):
    items[key] = (label, obj)

item('defter', 'Gülsüm’ün defteri', on(SACKS[4], 'binder_notebook', 0.5, 0.5, rz=30, dz=-0.02))
item('cakmak', 'Çakmak', put('vintage_lighter', -0.25, 0.05, rz=40, rx=90))
item('yag', 'Yağ kutusu', put('small_oil_can_01', -2.55, 0.1, rz=20))
item('cizme', 'Lastik çizmeler', put('rubber_boots', 1.2, -1.75, rz=-30))
item('kepce', 'Tahta kepçe', on(SACKS[2], 'wooden_spoon', 0.5, 0.5, rz=60, rx=90, dz=-0.02))
item('balta', 'Balta', put('hatchet', -2.3, -0.6, rz=70, rx=90))
item('kase', 'Tahta kâse', on(crate, 'wooden_bowl_01', 0.4, 0.5, rz=0))
item('kova', 'Kova', put('wooden_bucket_01', -1.6, -0.7, rz=0))
item('kurek', 'Kürek', put('rusted_spade_01', 2.85, -1.2, rz=90, rx=80))
item('supurge', 'Süpürge', put('wooden_broom', -2.8, -1.0, rz=0, ry=15))
item('tabure', 'Tabure', put('folding_wooden_stool', 0.9, -0.9, rz=25))
item('balyoz', 'Balyoz', put('sledgehammer_01', 1.4, 0.4, rz=-60, rx=90))

# görünme noktası (Gülsüm'ün karanlıkta belirdiği yer)
appar = Vector((1.25, 2.1, 0.0))

# ---------- ışık ----------
world_hdri('qwantani_night_puresky', 0.02)
compositor_glare(1.2, 0.6, 0.35)
cam = camera((0.3, -D / 2 + 0.15, 1.6), (-0.1, 1.5, 0.8), lens=21)
sc.view_settings.exposure = 0.5

# ---------- ekran kutuları ----------
bpy.context.view_layer.update()
def proj(objs):
    xs, ys = [], []
    for o in objs:
        for c in o.bound_box:
            p = world_to_camera_view(sc, cam, o.matrix_world @ Vector(c))
            if p.z > 0:
                xs.append(p.x); ys.append(1 - p.y)
    return {'x0': round(max(0, min(xs)), 4), 'y0': round(max(0, min(ys)), 4), 'x1': round(min(1, max(xs)), 4), 'y1': round(min(1, max(ys)), 4)}
boxes = {k: {'label': lab, **proj(meshes(r))} for k, (lab, r) in items.items()}
spots = {'cuval': proj([m for s in SACKS[:4] for m in meshes(s)]), 'un': proj(UNOBJ), 'tas': proj(TASOBJ), 'pencere': proj(PENCERE)}
a0 = world_to_camera_view(sc, cam, appar)
a1 = world_to_camera_view(sc, cam, appar + Vector((0, 0, 1.62)))
appar_scr = {'x': round(a0.x, 4), 'y': round(1 - a0.y, 4), 'h': round(a0.y - a1.y if False else (a1.y - a0.y), 4)}
rx, ry = sc.render.resolution_x, sc.render.resolution_y
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
json.dump({'w': rx, 'h': ry, 'items': boxes, 'spots': spots, 'apparition': appar_scr}, open(os.path.splitext(OUT)[0] + '.json', 'w'), ensure_ascii=False, indent=1)
print('KUTULAR', json.dumps(boxes, ensure_ascii=False))
render(OUT)
