# Bölüm 3–5 web sahnesi: vinç deposunun içi + aşamalı Leylek + toplanacak parçalar.
# Çıktı: <klasör>/depo.glb, depo.json
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
import leylek
random.seed(11)

W, D, H = 30, 20, 11
FLOOR = webmat('garage_floor', 0.25)
WALL = webmat('rusty_corrugated_iron', 0.45)
WALL2 = webmat('worn_corrugated_iron', 0.45)
BRICK = webmat('brick_wall_02', 0.5)
STEEL = simple((0.12, 0.13, 0.14), 0.55, 0.9, name='steel')
YELLOW = simple((0.85, 0.6, 0.05), 0.5, 0.3, name='craneyellow')
GROUP = {}


def tag(o, g):
    """Nesneyi (ve alt nesnelerini) bir gruba yaz; JS bu ada göre bulur."""
    for x in [o] + list(o.children_recursive):
        GROUP[x.name] = g
    return o


plane('floor', (W, D), (0, 0, 0), FLOOR, uv_scale=1.0)
for y in (-D / 2, D / 2):
    box('brick', (W, 0.3, 2.4), (0, y, 1.2), BRICK)
    box('wall', (W, 0.1, H - 2.4), (0, y, 2.4 + (H - 2.4) / 2), WALL if y > 0 else WALL2)
for x in (-W / 2, W / 2):
    box('brick', (0.3, D, 2.4), (x, 0, 1.2), BRICK)
    box('wall', (0.1, D, H - 2.4), (x, 0, 2.4 + (H - 2.4) / 2), WALL2)
for c, h in [((0, -D / 2, 3), (W / 2, 0.3, 3)), ((0, D / 2, 3), (W / 2, 0.3, 3)), ((-W / 2, 0, 3), (0.3, D / 2, 3)), ((W / 2, 0, 3), (0.3, D / 2, 3))]:
    weblib.COLLIDERS.append({'c': to_three(c), 'h': [h[0], h[2], h[1]]})
for x in range(-12, 13, 4):
    box('hwin', (2.6, 0.12, 1.4), (x, D / 2 - 0.02, 8.6), simple((0.03, 0.05, 0.09), 0.1, name='hwin'))
for x in range(-14, 15, 4):
    box('truss', (0.25, D, 0.35), (x, 0, H), STEEL)
    for k in range(-4, 5):
        box('diag', (0.08, 0.08, 1.6), (x, k * 2.1, H - 0.7), STEEL, rot=(math.radians(35 if k % 2 else -35), 0, 0))
    box('tie', (0.2, D, 0.2), (x, 0, H - 1.4), STEEL)
for y in (-D / 2, -D / 4, D / 4, D / 2):
    box('purlin', (W, 0.2, 0.2), (0, y, H + 0.25), STEEL)
# çatı: üç panel (ortadaki 5. bölümde kayar)
tag(box('roofA', (W, D * 0.36, 0.06), (0, -D * 0.32, H + 0.4), WALL), '!roofA')
tag(box('roofB', (W, D * 0.36, 0.06), (0, D * 0.32, H + 0.4), WALL), '!roofB')
tag(box('roofM', (W, D * 0.29, 0.06), (0, 0, H + 0.45), WALL2), '!roofM')
for y in (-D / 2 + 1, D / 2 - 1):
    box('rail', (W, 0.4, 0.5), (0, y, H - 2.0), YELLOW)
box('bridge', (0.8, D - 2, 0.9), (-3.5, 0, H - 2.2), YELLOW)
box('hoist', (1.2, 1.0, 1.0), (-3.5, 0.5, H - 3.0), YELLOW)
cyl('chain', 0.03, 3.4, (-3.5, 0.5, H - 5.0), STEEL, n=6)

# ---------------- Leylek (aşamalı) ----------------
LX, LY, LZ, LRZ = 0.5, 1.0, 2.75, math.radians(18)
ship = leylek.build(loc=(LX, LY, LZ), rz=LRZ, glow=False)
STAGE = {
    'hull': 'L0', 'aft': 'L0', 'band': 'L0', 'leg': 'L0', 'pad': 'L0', 'piston': 'L0', 'pipe': 'L0',
    'bell': 'L1', 'bellin': 'L1',
    'patch': 'L2', 'wing': 'L2', 'fin': 'L2', 'door': 'L2',
    'glass': 'L3', 'gframe': 'L3', 'cabin': 'L3',
    'mast': 'L4', 'dish': 'L4',
    'txt': 'L5', 'stripe': 'L5',
}
for o in ship.children:
    base = o.name.split('.')[0]
    tag(o, STAGE.get(base, 'L0'))
bpy.context.view_layer.update()
SM = ship.matrix_world.copy()
def ship_pt(x, y, z):
    return SM @ Vector((x, y, z))
# Leylek'in çarpışması: gövde boyunca üç kutu
for lx in (-3, 0, 3):
    p = ship_pt(lx, 0, 0)
    weblib.COLLIDERS.append({'c': to_three((p.x, p.y, 1.6)), 'h': [1.9, 1.6, 1.9]})
door_out = ship_pt(0.6, -2.6, -2.75)
ladder = model('ladder_sectioned_01', (door_out.x, door_out.y, 0), (math.radians(-14), 0, LRZ), 1.0)
tag(ladder, '!ladder')
kor_slot = ship_pt(-3.2, -1.6, -0.3)

# ---------------- atölye ----------------
for x, y in [(3.5, -2.2), (-2.0, 4.6)]:
    for dz in (0, 1.6):
        box('scaf', (2.0, 0.05, 0.05), (x, y, 1.5 + dz), STEEL)
    for dx in (-1, 1):
        box('scafp', (0.05, 0.05, 3.4), (x + dx, y, 1.7), STEEL)
    box('board', (2.0, 0.5, 0.05), (x, y, 3.1), webmat('rusty_metal_sheet', 1.0))
collider(model('portable_welding_cart', (-4.0, -3.4, 0), (0, 0, math.radians(40)), 1.0))
collider(model('tool_cart', (4.8, -3.6, 0), (0, 0, math.radians(-30)), 1.0))
collider(model('metal_tool_chest', (-9.0, -6.0, 0), (0, 0, math.radians(90)), 1.0))
collider(model('drill_press_01', (-11.5, 4.0, 0), (0, 0, math.radians(90)), 1.0))
for y in (-1.0, 2.0):
    collider(model('steel_frame_shelves_01', (-13.8, y, 0), (0, 0, math.radians(90)), 1.0))
for i, (x, y) in enumerate([(9.5, 6.5), (10.3, 6.0), (9.8, 7.3), (-12.5, -7.5)]):
    collider(model('Barrel_01', (x, y, 0), (0, 0, i), 1.0))
for i in range(6):
    model('old_tyre', (11.5, -6.5 + (i // 3) * 0.1, (i % 3) * 0.22), (0, 0, i), 1.0)
weblib.COLLIDERS.append({'c': to_three((11.5, -6.5, 0.4)), 'h': [0.5, 0.4, 0.5]})
for i in range(5):
    model('cardboard_box_01', (-12 + i * 0.7, 7.5, (i % 2) * 0.4), (0, 0, random.uniform(-0.4, 0.4)), 1.0)
weblib.COLLIDERS.append({'c': to_three((-10.6, 7.5, 0.5)), 'h': [1.9, 0.5, 0.5]})
model('rollershutter_door', (W / 2 - 0.1, -3.0, 0), (0, 0, math.radians(-90)), 1.6)
# Zeynep'in masası
TX, TY = 6.5, -5.2
collider(model('WoodenTable_03', (TX, TY, 0), (0, 0, math.radians(-15)), 1.0))
model('classic_laptop', (TX - 0.1, TY, 0.78), (0, 0, math.radians(170)), 1.0)
model('circuit_board', (TX + 0.5, TY + 0.2, 0.79), (0, 0, 0.5), 1.0)
model('retro_multimeter', (TX + 0.8, TY - 0.3, 0.79), (0, 0, 2.5), 1.0)
model('desk_lamp_arm_01', (TX + 0.9, TY + 0.4, 0.78), (0, 0, math.radians(200)), 1.0)
model('tea_set_01', (TX - 1.1, TY + 0.4, 0.78), (0, 0, 0.8), 1.0)
# floresanlar
tubes = []
for i, x in enumerate(range(-12, 13, 6)):
    for y in (-5, 5):
        on = not (i == 1 and y > 0)
        model('mounted_fluorescent_lights', (x, y, H - 1.5), (0, 0, 0), 1.0)
        box('tube', (1.2, 0.06, 0.04), (x, y, H - 1.58), emission((0.85, 0.95, 1.0), 6 if on else 0.2, 'tubeglow' if on else 'tubedead'))
        if on:
            tubes.append(to_three((x, y, H - 1.9)))
worklights = []
for p, t in [((-6.5, -5.5, 1.6), (0, 1, 2.5)), ((7.5, 3.5, 2.0), (1, 1, 2.5)), ((1.5, -7.0, 0.8), (1, 1, 2.0))]:
    model('portable_searchlight', (p[0], p[1], 0), (0, 0, math.atan2(t[1] - p[1], t[0] - p[0]) - math.pi / 2), 1.0)
    worklights.append({'p': to_three(p), 't': to_three(t)})

# ---------------- toplanacak parçalar (Bölüm 3) ----------------
items = {}
def item(key, obj, at):
    tag(obj, '!item_' + key)
    items[key] = to_three(at)
item('jenerator', model('portable_generator', (-11.0, 6.4, 0), (0, 0, math.radians(-20)), 1.0), (-11.0, 6.4, 0.6))
sac = bpy.data.objects.new('sacstack', None)
bpy.context.scene.collection.objects.link(sac)
for k in range(6):
    b = box('sac', (2.2, 1.0, 0.035), (11.2, 2.2, 0.05 + k * 0.05), webmat('corrugated_iron_02', 0.8), rot=(0, 0, random.uniform(-0.08, 0.08)))
    b.parent = sac
item('sac', sac, (11.2, 2.2, 0.4))
item('telsiz', model('vintage_radio_transceiver', (-13.6, -1.0, 1.08), (0, 0, math.radians(90)), 1.0), (-13.6, -1.0, 1.25))
dish_root = bpy.data.objects.new('canak', None)
bpy.context.scene.collection.objects.link(dish_root)
d = sphere('dish', 0.45, (12.6, -8.6, 0.55), simple((0.88, 0.88, 0.85), 0.4, 0.5, name='dishwhite'), seg=20, scale=(1, 0.25, 1))
d.rotation_euler = (math.radians(-25), 0, math.radians(20))
d.parent = dish_root
item('canak', dish_root, (12.6, -8.6, 0.6))
# hazırlık eşyaları (Bölüm 4)
jc = bpy.data.objects.new('bidonlar', None)
bpy.context.scene.collection.objects.link(jc)
for i in range(5):
    m = model('metal_jerrycan', (8.0 + i * 0.45, -8.0, 0), (0, 0, random.uniform(-0.3, 0.3)), 1.0)
    m.parent = jc
item('su', jc, (8.9, -8.0, 0.4))
weblib.COLLIDERS.append({'c': to_three((8.9, -8.0, 0.35)), 'h': [1.2, 0.35, 0.3]})
mp = plane('harita', (0.42, 0.3), (TX + 0.2, TY - 0.25, 0.795), emission((0.55, 0.75, 1.0), 0.6, 'mapglow'), rot=(0, 0, math.radians(-15)))
item('harita', mp, (TX + 0.2, TY - 0.25, 0.85))
bk = box('defter', (0.22, 0.3, 0.035), (TX - 0.6, TY - 0.3, 0.8), simple((0.35, 0.18, 0.08), 0.7, name='leather'), rot=(0, 0, 0.3))
item('defter', bk, (TX - 0.6, TY - 0.3, 0.85))

weblib.merge_groups(lambda o: GROUP.get(o.name, 'static'))
weblib.export_glb(f'{OUT}/depo.glb')
R = lambda d: round(d, 2)
meta = {
    'spawn': to_three((9.2, -7.0, 0)), 'spawnYaw': 125,
    'door': to_three((14.0, -3.0, 1.2)), 'doorStand': to_three((13.0, -3.0, 0)),
    'table': to_three((TX, TY, 0.85)), 'korOnTable': to_three((TX - 0.3, TY + 0.15, 0.95)),
    'korSlot': to_three(tuple(kor_slot)), 'ladder': to_three((door_out.x, door_out.y, 1.2)),
    'ship': {'p': to_three((LX, LY, LZ)), 'yaw': R(math.degrees(LRZ))},
    'cockpit': to_three(tuple(ship_pt(3.0, 0, 0.75))),
    'mertAtShip': {'p': to_three((-2.6, -2.2, 0)), 'yaw': -150},
    'items': items, 'tubes': tubes, 'worklights': worklights,
    'npc': {
        'zeynep': {'p': to_three((TX - 0.2, TY - 0.8, 0)), 'yaw': -15, 'clip': 'work'},
        'mert': {'p': to_three((-2.6, -2.2, 0)), 'yaw': -150},
        'elif': {'p': to_three((4.6, -4.2, 0)), 'yaw': 140},
        'kaan': {'p': to_three((2.0, -6.2, 0)), 'yaw': 110},
    },
}
weblib.write_meta(f'{OUT}/depo.json', meta)
