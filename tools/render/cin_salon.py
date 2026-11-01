# Karaçam Dosyaları — Vaka 1 olay yeri: Demirci evinin salonu, gece 03.00 (1986).
# Gizli nesne sahnesi: her aranan nesnenin ekran kutusu <çıktı>.json olarak yazılır.
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = sys.argv[-1]
pv = '--preview' in sys.argv
random.seed(7)
reset(samples=160, w=1600, h=900, preview=pv)
sc = bpy.context.scene

W, D, H = 5.2, 4.6, 2.75
SHELF_Z = [0.47, 0.9]  # oda: x genişlik, y derinlik (kamera -y'de), z yükseklik


# ---------- yardımcılar ----------
def meshes(root):
    return [o for o in [root] + list(root.children_recursive) if o.type == 'MESH']


def bbox(root):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes(root) for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def put(mid, x, y, z=0.0, rz=0.0, s=1.0, floor=True, rx=0.0, ry=0.0):
    """Modeli koyar; floor=True ise tabanını z'ye oturtur."""
    r = model(mid, (x, y, z), (math.radians(rx), math.radians(ry), math.radians(rz)), s)
    if floor:
        mn, mx = bbox(r)
        r.location.z += z - mn.z
    return r


def on(base, mid, fx=0.5, fy=0.5, rz=0.0, s=1.0, rx=0.0, ry=0.0, dz=0.0):
    """base nesnesinin üst yüzeyine, bbox içinde (fx, fy) oranında koyar."""
    mn, mx = bbox(base)
    x = mn.x + (mx.x - mn.x) * fx
    y = mn.y + (mx.y - mn.y) * fy
    return put(mid, x, y, mx.z + dz, rz, s, True, rx, ry)


def fit_h(root, h):
    mn, mx = bbox(root)
    k = h / max(1e-6, mx.z - mn.z)
    root.scale = tuple(v * k for v in root.scale)
    mn2, _ = bbox(root)
    root.location.z += mn.z - mn2.z
    return root


# ---------- oda ----------
FLOOR = pbr('old_wooden_floor_02', 2.2)
WALL = pbr('decrepit_wallpaper', 2.0, tint=(0.95, 0.88, 0.75))
LOWER = pbr('patterned_plaster_wall', 1.5, tint=(0.55, 0.62, 0.55))
CEIL = pbr('patterned_plaster_wall', 2.0, tint=(0.9, 0.88, 0.82))
plane('floor', (W, D), (0, 0, 0), FLOOR, uv_scale=1.0)
plane('ceil', (W, D), (0, 0, H), CEIL, rot=(math.pi, 0, 0))
# arka duvar (y=+D/2), sol (x=-W/2), sağ (x=+W/2); ön duvar kamera arkasında
for name, size, loc, rot in (
    ('wall_back', (W, H), (0, D / 2, H / 2), (math.pi / 2, 0, 0)),
    ('wall_left', (D, H), (-W / 2, 0, H / 2), (math.pi / 2, 0, math.pi / 2)),
    ('wall_right', (D, H), (W / 2, 0, H / 2), (math.pi / 2, 0, -math.pi / 2)),
    ('wall_front', (W, H), (0, -D / 2, H / 2), (math.pi / 2, 0, math.pi)),
):
    plane(name, size, loc, WALL, rot=rot)
# lambri (alt duvar boyası) ve süpürgelik
WOODTRIM = pbr('wood_table_worn', 1.0, tint=(0.45, 0.32, 0.22))
for name, size, loc in (
    ('dado_back', (W, 0.02, 0.95), (0, D / 2 - 0.011, 0.475)),
    ('dado_left', (0.02, D, 0.95), (-W / 2 + 0.011, 0, 0.475)),
    ('dado_right', (0.02, D, 0.95), (W / 2 - 0.011, 0, 0.475)),
):
    box(name, size, loc, LOWER)
for name, size, loc in (
    ('rail_back', (W, 0.04, 0.04), (0, D / 2 - 0.03, 0.96)),
    ('rail_left', (0.04, D, 0.04), (-W / 2 + 0.03, 0, 0.96)),
    ('rail_right', (0.04, D, 0.04), (W / 2 - 0.03, 0, 0.96)),
    ('skirt_back', (W, 0.03, 0.1), (0, D / 2 - 0.03, 0.05)),
    ('skirt_left', (0.03, D, 0.1), (-W / 2 + 0.03, 0, 0.05)),
    ('skirt_right', (0.03, D, 0.1), (W / 2 - 0.03, 0, 0.05)),
):
    box(name, size, loc, WOODTRIM)

# sol duvarda pencere: dışarıda ay ışığı, perde
WIN = (-W / 2, -0.2, 1.45)
box('win_frame_t', (0.12, 1.3, 0.07), (WIN[0] + 0.03, WIN[1], WIN[2] + 0.6), WOODTRIM)
box('win_frame_b', (0.18, 1.3, 0.06), (WIN[0] + 0.06, WIN[1], WIN[2] - 0.6), WOODTRIM)
box('win_frame_l', (0.12, 0.07, 1.25), (WIN[0] + 0.03, WIN[1] - 0.62, WIN[2]), WOODTRIM)
box('win_frame_r', (0.12, 0.07, 1.25), (WIN[0] + 0.03, WIN[1] + 0.62, WIN[2]), WOODTRIM)
box('win_frame_m', (0.08, 0.04, 1.2), (WIN[0] + 0.03, WIN[1], WIN[2]), WOODTRIM)
plane('win_night', (1.2, 1.15), (WIN[0] + 0.005, WIN[1], WIN[2]), emission((0.08, 0.13, 0.25), 0.6, 'nightglass'), rot=(math.pi / 2, 0, math.pi / 2))
CURT = pbr('velour_velvet', 1.2, tint=(0.45, 0.12, 0.1))
for i, dy in enumerate((-0.95, 0.75)):
    box('curtain%d' % i, (0.06, 0.42, 1.9), (WIN[0] + 0.12, WIN[1] + dy, 1.5), CURT)
area((WIN[0] - 0.6, WIN[1], WIN[2] + 0.3), (0.6, 0.3, 0.2), 60, 1.1, (0.55, 0.68, 1.0), name='moon')

# halı
RUG = pbr('dirty_carpet', 1.2, tint=(0.85, 0.35, 0.25))
plane('rug', (2.4, 1.7), (0.1, 0.45, 0.006), RUG)

# ---------- mobilya ----------
stove = put('barrel_stove', -1.95, 1.75, rz=30)
mn, mx = bbox(stove)
cyl('stovepipe', 0.065, H - mx.z, ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mx.z + H) / 2), simple((0.05, 0.05, 0.05), 0.5, 0.8, name='pipe'))
clock = put('vintage_grandfather_clock_01', -0.85, D / 2 - 0.24, rz=0)
fit_h(clock, 2.05)
mirror = put('ornate_mirror_01', 0.15, D / 2 - 0.01, 1.6, floor=False)
# aynanın üstüne yarı kaymış çarşaf
bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=80, size=1)
sheet = bpy.context.active_object; sheet.name = 'sheet'
sheet.scale = (0.62, 0.95, 1)
sheet.rotation_euler = (math.pi / 2, 0.05, 0)
sheet.location = (0.2, D / 2 - 0.07, 1.42)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
me = sheet.data
noise = __import__('mathutils').noise
for v in me.vertices:
    x, z = v.co.x, v.co.z
    t = max(0.0, min(1.0, (0.48 - z) / 0.95))  # 0 üstte, 1 altta
    n = noise.noise(Vector((x * 5, 1.3, z * 4)))
    # aşağı doğru açılan, derinleşen kıvrımlar
    fold = (math.sin(x * 26 + n * 2.5) * 0.035 + n * 0.03) * t ** 0.8
    v.co.y -= fold + 0.05 * (1 - t) ** 4
    v.co.x *= 1 + 0.18 * t
    if t > 0.8:  # düzensiz alt kenar
        v.co.z += noise.noise(Vector((x * 9, 4.0, 0))) * 0.06 * (t - 0.8) * 5
sheet.data.materials.append(simple((0.5, 0.49, 0.45), 0.92, name='sheet'))
sheet.modifiers.new('sol', 'SOLIDIFY').thickness = 0.003
sm = sheet.modifiers.new('sub', 'SUBSURF'); sm.levels = 0; sm.render_levels = 1
for p_ in me.polygons: p_.use_smooth = True
cabinet = put('vintage_cabinet_01', 1.6, D / 2 - 0.3, rz=0, s=0.8)
shelf = put('wooden_bookshelf_worn', -W / 2 + 0.3, 0.75, rz=-90, s=0.85)
sofa = put('sofa_02', W / 2 - 0.45, 0.35, rz=90)
# rafa eski kitaplar (basit kutular)
mn, mx = bbox(shelf)
BOOKC = [(0.35, 0.08, 0.06), (0.1, 0.18, 0.12), (0.45, 0.35, 0.2), (0.12, 0.1, 0.25), (0.5, 0.45, 0.35), (0.25, 0.05, 0.05)]
for lvl, z0 in enumerate(SHELF_Z):
    y = mn.y + 0.08
    while y < mx.y - 0.25 - lvl * 0.2:
        t = random.uniform(0.025, 0.06); h = random.uniform(0.2, 0.29); d = random.uniform(0.15, 0.22)
        b = box('book', (d, t, h), (mn.x + 0.06 + d / 2, y + t / 2, z0 + h / 2), simple(random.choice(BOOKC), 0.7, name='book%d' % random.randint(0, 5)), rot=(random.uniform(-0.05, 0.05), 0, 0))
        y += t + 0.004
pillows = on(sofa, 'throw_pillows_01', 0.6, 0.5, rz=90, s=0.8, dz=-0.3)
table = put('round_wooden_table_01', 0.25, 0.45, rz=10)
fit_h(table, 0.5)
rock = put('Rockingchair_01', -1.45, -0.45, rz=-120)
ottoman = put('Ottoman_01', 1.0, -0.6, rz=20, s=0.75)
tvstand = put('ClassicNightstand_01', 2.15, -1.1, rz=-90)
tv = on(tvstand, 'Television_01', 0.5, 0.5, rz=-90)
put('wicker_basket_01', -1.55, 2.05, rz=15)
put('ceramic_vase_01', -0.25, D / 2 - 0.2, rz=0)

# duvar süsleri
put('wall_clock', W / 2 - 0.01, 0.35, 1.85, rz=90, floor=False)

# masa üstü: çay takımı, gaz lambası (yanık)
tea = on(table, 'tea_set_01', 0.45, 0.5, rz=30, s=0.45)
oil = on(table, 'vintage_oil_lamp', 0.75, 0.68, rz=0, s=0.5)
mn, mx = bbox(oil)
fz = mn.z + (mx.z - mn.z) * 0.42
point(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, fz + 0.03), 45, (1.0, 0.6, 0.28), 0.02, name='oilflame')
sphere('flame', 0.008, ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, fz), emission((1, 0.55, 0.2), 60, 'flame'), scale=(1, 1, 2.4))

put('pull_chain_light_socket', 0.25, 0.45, H, floor=False)

# kömürlük kapağı (zeminde) ve çamurlu ayak izleri: kapaktan saate
TRAP = pbr('wood_table_worn', 1.0, tint=(0.35, 0.25, 0.18))
box('trapdoor', (0.7, 0.6, 0.03), (-1.2, 1.35, 0.012), TRAP)
box('trap_ring', (0.08, 0.02, 0.01), (-1.2, 1.08, 0.03), simple((0.1, 0.09, 0.08), 0.4, 0.9, name='ring'))
MUD = simple((0.13, 0.09, 0.055), 0.95, name='mud')
def blob(name, loc, sx, sy, rz):
    bpy.ops.mesh.primitive_circle_add(vertices=20, radius=1, fill_type='NGON', location=loc)
    o = bpy.context.active_object; o.name = name
    o.scale = (sx, sy, 1); o.rotation_euler = (0, 0, rz)
    o.data.materials.append(MUD)
    return o
for i in range(5):
    t = i / 4
    x, y = -0.95 + 0.2 * t, 1.55 + 0.45 * t
    side = 0.06 if i % 2 else -0.06
    rz = -0.45
    dx, dy = -math.sin(rz), math.cos(rz)
    cx, cy = x + side, y
    blob('sole%d' % i, (cx + dx * 0.05, cy + dy * 0.05, 0.0035), 0.042, 0.075, rz)
    blob('heel%d' % i, (cx - dx * 0.085, cy - dy * 0.085, 0.0035), 0.035, 0.04, rz)

# ---------- aranan nesneler ----------
items = {}
def item(key, label, obj):
    items[key] = (label, obj)

item('cep_saati', 'Cep saati', put('pocket_watch', -0.5, 1.78, rz=40, rx=90))
item('gozluk', 'Gözlük', on(shelf, 'round_spectacles', 0.5, 0.4, rz=-60, dz=-0.95))
item('cakmak', 'Çakmak', on(stove, 'vintage_lighter', 0.35, 0.55, rz=20, rx=90))
item('sigara', 'Sigara paketi', put('cigarette_pack', -0.75, 0.55, rz=70, rx=90))
item('fener', 'El feneri', put('vintage_flashlight', 1.45, 0.75, rz=120))
item('ordek', 'Oyuncak ördek', put('rubber_duck_toy', -0.35, 0.1, rz=-30, s=0.3))
item('kapan', 'Fare kapanı', put('mousetrap', -2.35, 2.1, rz=10))
item('kartpostal', 'Almanya kartpostalları', on(table, 'postcard_set_01', 0.3, 0.3, rz=-25, rx=90, s=0.4))
item('calar', 'Çalar saat', put('alarm_clock_01', -0.1, 2.0, rz=-25))
item('samdan', 'Şamdan', put('wooden_candlestick', -1.85, 0.35, rz=0, rx=90))
item('kaset', 'Kasetçalar', on(ottoman, 'portable_cassette_player', 0.5, 0.5, rz=20))
item('buyutec', 'Büyüteç', on(table, 'magnifying_glass_01', 0.6, 0.25, rz=60, rx=90))

# tespih: ipe dizili boncuklar
BEAD = simple((0.18, 0.05, 0.03), 0.25, name='bead')
tesbih = bpy.data.objects.new('tesbih', None); sc.collection.objects.link(tesbih)
mn, mx = bbox(table)
cx, cy, cz = mn.x + (mx.x - mn.x) * 0.7, mn.y + (mx.y - mn.y) * 0.25, mx.z + 0.008
for i in range(33):
    a = i / 33 * math.tau
    s = sphere('bead%d' % i, 0.0075, (math.cos(a) * 0.07, math.sin(a) * 0.045, 0), BEAD, seg=10)
    s.parent = tesbih
tesbih.location = (cx, cy, cz)
tesbih.rotation_euler = (0, 0, 0.6)
item('tesbih', 'Tespih', tesbih)
# muska: üçgen bez
muska = bpy.data.objects.new('muska', None); sc.collection.objects.link(muska)
bm = bpy.data.meshes.new('muskam')
bm.from_pydata([(-0.04, 0, 0), (0.04, 0, 0), (0, 0.06, 0)], [], [(0, 1, 2)])
mo = bpy.data.objects.new('muska_tri', bm); sc.collection.objects.link(mo)
mo.data.materials.append(simple((0.42, 0.33, 0.18), 0.85, name='muskacloth'))
mo.modifiers.new('sol', 'SOLIDIFY').thickness = 0.012
mo.parent = muska
mn, mx = bbox(clock)
muska.location = (mx.x - 0.04, mn.y - 0.012, 1.25)
muska.rotation_euler = (math.pi / 2, 0, 0)
item('muska', 'Muska', muska)

# ---------- ışık ----------
world_hdri('qwantani_night_puresky', 0.02)
area((0.3, -1.6, H - 0.05), (0.3, 0.8, 0), 110, 2.5, (1.0, 0.8, 0.6), name='fill')  # çok hafif dolgu
spot((-2.5, -0.2, 1.6), (-0.4, 1.4, 0.3), 700, 45, 0.7, (0.6, 0.72, 1.0), name='moonbeam')
mn, mx = bbox(stove)
point(((mn.x + mx.x) / 2 + 0.2, (mn.y + mx.y) / 2 - 0.25, 0.25), 6, (1.0, 0.35, 0.1), 0.05, name='stoveglow')  # sobanın közü
compositor_glare(1.2, 0.6, 0.35)

cam = camera((0.1, -D / 2 + 0.15, 1.6), (0.0, 1.4, 0.8), lens=22)
sc.view_settings.exposure = 0.6

# ---------- ekran kutuları ----------
bpy.context.view_layer.update()
rx, ry = sc.render.resolution_x, sc.render.resolution_y
boxes = {}
for k, (label, root) in items.items():
    xs, ys = [], []
    for o in meshes(root):
        for c in o.bound_box:
            p = world_to_camera_view(sc, cam, o.matrix_world @ Vector(c))
            if p.z > 0:
                xs.append(p.x); ys.append(1 - p.y)
    if xs:
        boxes[k] = {'label': label, 'x0': round(min(xs), 4), 'y0': round(min(ys), 4), 'x1': round(max(xs), 4), 'y1': round(max(ys), 4)}
# gözlem noktaları (listede olmayan ipuçları)
def objs_box(objs):
    xs, ys = [], []
    for o in objs:
        for c in o.bound_box:
            p = world_to_camera_view(sc, cam, o.matrix_world @ Vector(c))
            if p.z > 0:
                xs.append(p.x); ys.append(1 - p.y)
    return {'x0': round(max(0, min(xs)), 4), 'y0': round(max(0, min(ys)), 4), 'x1': round(min(1, max(xs)), 4), 'y1': round(min(1, max(ys)), 4)}
spots = {
    'kapak': objs_box([bpy.data.objects['trapdoor']]),
    'izler': objs_box([o for o in bpy.data.objects if o.name.startswith(('sole', 'heel'))]),
    'saat': objs_box(meshes(clock)),
    'ayna': objs_box([sheet]),
}
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
json.dump({'w': rx, 'h': ry, 'items': boxes, 'spots': spots}, open(os.path.splitext(OUT)[0] + '.json', 'w'), ensure_ascii=False, indent=1)
print('KUTULAR', json.dumps(boxes, ensure_ascii=False))
render(OUT)
