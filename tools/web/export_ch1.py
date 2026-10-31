# Bölüm 1 web sahneleri: (A) çatı + mahalle, (B) boş arsa + krater. Çıktı: <klasör>/cati.glb, cati.json, arsa.glb, arsa.json
import sys, os, math, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'render'))
sys.path.insert(0, HERE)
import lib
from lib import *
import weblib
from weblib import webmat, collider, to_three

OUT = sys.argv[-1]
PART = sys.argv[-2] if len(sys.argv) > 2 and sys.argv[-2] in ('A', 'B', 'AB') else 'AB'
os.makedirs(OUT, exist_ok=True)


def web_simplify(M):
    """Web sürümü: binalardaki klimalar basit kutu, silindirler az kenarlı."""
    AC = simple((0.82, 0.82, 0.8), 0.5, 0.2, name='acbox')
    GR = simple((0.15, 0.15, 0.16), 0.6, 0.3, name='acgrill')
    def model_web(mid, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0, only=None):
        if mid == 'exterior_aircon_unit':
            c, s_ = math.cos(rot[2]), math.sin(rot[2])
            b = box('ac', (0.8 * scale, 0.3 * scale, 0.55 * scale), (loc[0], loc[1], loc[2] + 0.28 * scale), AC, rot=rot)
            box('acg', (0.42 * scale, 0.02, 0.42 * scale), (loc[0] - s_ * 0.0 + 0.0, loc[1] - c * 0.16, loc[2] + 0.28 * scale), GR, rot=rot)
            return b
        return model(mid, loc, rot, scale, only)
    M.model = model_web
    _cyl = M.cyl
    M.cyl = lambda name, r, depth, loc, mat=None, rot=(0, 0, 0), n=20, r2=None: _cyl(name, r, depth, loc, mat, rot, min(n, 12), r2)


def part_a():
    reset(preview=True)
    weblib.COLLIDERS.clear()
    weblib.patch_lib_for_web()
    import importlib
    import mahalle as M
    importlib.reload(M)
    web_simplify(M)
    random.seed(7)
    ROOF = 5 * M.FLOOR_H
    ow, od = 14, 11
    P0 = M.PLASTERS[0]
    box('ourbody', (ow, od, ROOF), (0, 0, ROOF / 2), P0)
    fl = plane('ourroof', (ow, od), (0, 0, ROOF + 0.001), webmat('concrete_floor_worn_001', 0.25))
    collider(fl)
    weblib.COLLIDERS[-1]['h'][1] = 0.05
    for sx, sy, sw, sd in [(0, od / 2, ow, 0.25), (0, -od / 2, ow, 0.25), (ow / 2, 0, 0.25, od), (-ow / 2, 0, 0.25, od)]:
        p = box('ourpar', (sw, sd, 1.05), (sx, sy, ROOF + 0.525), P0)
        collider(p)
        box('cap', (sw + 0.08, sd + 0.08, 0.06), (sx, sy, ROOF + 1.08), M.CONCRETE)
    # görünmez yüksek duvar: oyuncu parapetten düşmesin
    for sx, sy, sw, sd in [(0, od / 2, ow, 0.25), (0, -od / 2, ow, 0.25), (ow / 2, 0, 0.25, od), (-ow / 2, 0, 0.25, od)]:
        weblib.COLLIDERS.append({'c': to_three((sx, sy, ROOF + 1.9)), 'h': [sw / 2, 0.9, sd / 2], 'inv': 1})
    for x, y, rz in [(5.4, 3.2, -4), (-6.0, -1.5, 93)]:
        objs = M.solar_heater(x, y, ROOF, rz=math.radians(rz))
        weblib.COLLIDERS.append({'c': to_three((x, y, ROOF + 1.1)), 'h': [1.15, 1.1, 1.1] if abs(rz) < 45 else [1.1, 1.1, 1.15]})
    M.antenna(-2.2, 4.4, ROOF, 3.4)
    M.dish(5.8, 4.3, ROOF + 1.5, rz=math.radians(200))
    ac = model('exterior_aircon_unit', (-5.5, -1.0 + 3.5, ROOF), (0, 0, math.radians(90)), 1.0)
    collider(ac)
    t = cyl('tank', 0.75, 1.7, (5.2, -2.5, ROOF + 0.85), M.WHITE_METAL)
    collider(t)
    crate = model('plastic_crate_01', (0.9, -1.2, ROOF), (0, 0, 0.3), 1.0)
    collider(crate)
    model('tea_set_01', (0.9, -1.2, ROOF + 0.3), (0, 0, 0.4), 1.0)
    chairs = [(-0.4, -1.9, -150), (2.0, -2.1, 160), (1.6, 0.2, 20), (-0.2, -0.3, -40)]
    for x, y, r in chairs:
        c = model('plastic_monobloc_chair_01', (x, y, ROOF), (0, 0, math.radians(r)), 1.0)
        collider(c, pad=-0.08)
    sd = box('stairdoor', (2.6, 2.4, 2.6), (-6.0, -4.2, ROOF + 1.3), P0)
    collider(sd)
    box('door', (0.95, 0.06, 2.05), (-5.4, -2.97, ROOF + 1.03), webmat('painted_metal_shutter', 1.0, (0.45, 0.55, 0.6)))
    sphere('doorbulb', 0.06, (-6.6, -2.85, ROOF + 2.35), emission((1.0, 0.75, 0.45), 30), seg=10)
    # ampul dizisi
    bulbs = []
    WIRE = simple((0.05, 0.05, 0.05), 0.6, name='wire')
    BULB = emission((1.0, 0.68, 0.38), 12, 'bulbglow')
    def string(a, b, n, sag):
        a, b = Vector(a), Vector(b)
        pts = []
        for i in range(n + 1):
            tt = i / n
            p = a.lerp(b, tt)
            p.z -= math.sin(tt * math.pi) * sag
            pts.append(p)
        for p, q in zip(pts, pts[1:]):
            m = (p + q) / 2
            d = q - p
            c = cyl('w', 0.008, d.length, m, WIRE, n=5)
            c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        for p in pts[1:-1]:
            sphere('bulb', 0.045, p - Vector((0, 0, 0.06)), BULB, seg=10)
            bulbs.append(to_three(p - Vector((0, 0, 0.1))))
    string((-6.8, -4.2, ROOF + 2.5), (6.8, 4.9, ROOF + 1.6), 14, 0.6)
    string((-6.8, -4.2, ROOF + 2.5), (-6.8, 5.2, ROOF + 1.4), 8, 0.4)
    # mahalle: dört yönde bloklar
    k = 0
    def row(yy, dd, face, x0=-80, x1=85, near=False, props=True, fl_add=0):
        nonlocal k
        x = x0 + random.uniform(-3, 3)
        while x < x1:
            w = random.uniform(10, 16)
            floors = random.choice([4, 5, 5, 6, 6, 7, 8]) + fl_add
            cx = x + w / 2
            if abs(cx) < 13 and abs(yy) < 14:
                x += w + 2
                continue
            dnear = near and abs(cx) < 45
            M.block(cx, yy + dd / 2 * (1 if face < 0 else -1), w, dd, floors, random.choice(M.PLASTERS), face=face, lit=random.uniform(0.2, 0.45),
                    balconies=dnear, roof_props=props, seed=k, detail=dnear)
            x += w + random.uniform(0.8, 3.5)
            k += 1
    for yy, dd, near in [(18, 12, True), (34, 13, True), (51, 12, False), (68, 14, False), (88, 15, False), (110, 16, False)]:
        row(yy, dd, -1, near=near, props=yy < 90, fl_add=1 if yy > 60 else 0)
    for yy, dd, near in [(-14, 12, True), (-30, 13, True), (-47, 12, False), (-64, 14, False), (-84, 15, False)]:
        row(yy, dd, 1, near=near, props=yy > -70)
    for side in (-1, 1):
        M.block(side * 17.5, 0, 10, 12, 4 if side < 0 else 6, random.choice(M.PLASTERS), face=-1, seed=100 + side)
    # zemin ve sokak lambaları (yalnızca ışıyan kafalar; gerçek ışıklar three.js'de)
    plane('ground', (500, 500), (0, 0, 0), webmat('asphalt_02', 0.1, None, size=512))
    lamps = []
    LAMP = emission((1.0, 0.55, 0.22), 25, 'lampglow')
    for yy in (16.0, 32.5, 49.5, -12.5, -28.5, -45.5):
        for x in range(-70, 80, 14):
            sphere('lamp', 0.22, (x, yy, 7.0), LAMP, seg=8)
            box('pole', (0.12, 0.12, 7), (x, yy + 0.35, 3.5), M.RAIL)
            lamps.append(to_three((x, yy, 6.8)))
    # uzak camiler
    DOME = simple((0.45, 0.48, 0.5), 0.4, 0.8, name='dome')
    for mx, my, mh in [(-38, 190, 42), (52, 230, 38), (-120, -160, 40)]:
        cyl('minare', 1.3, mh, (mx, my, mh / 2), M.PLASTERS[4], n=16)
        cyl('serefe', 2.0, 0.5, (mx, my, mh * 0.78), M.PLASTERS[4], n=16)
        cyl('kulah', 1.4, 7, (mx, my, mh + 3.5), DOME, n=16, r2=0.0)
        cyl('isik', 1.45, 0.12, (mx, my, mh * 0.78 + 0.6), emission((0.6, 1.0, 0.7), 6, 'serefeglow'), n=24)
        sphere('kubbe', 11, (mx + 16, my + 6, 6), DOME, seg=32, scale=(1, 1, 0.75))
    weblib.merge_by_material()
    weblib.export_glb(f'{OUT}/cati.glb')
    meta = {
        'roof': ROOF, 'spawn': to_three((0.6, -3.4, ROOF)), 'spawnYaw': 0,
        'bulbs': bulbs[::3], 'lamps': lamps,
        'door': to_three((-5.4, -3.1, ROOF + 1.0)),
        'tea': to_three((0.9, -1.2, ROOF + 0.4)),
        'npc': {
            'kaan': {'p': to_three((-1.4, 4.4, ROOF)), 'yaw': 180},
            'elif': {'p': to_three((0.4, 4.2, ROOF)), 'yaw': 175},
            'mert': {'p': to_three((2.0, -2.1, ROOF)), 'yaw': 160, 'clip': 'sit_tea', 'sitH': 0.42},
            'zeynep': {'p': to_three((-0.4, -1.9, ROOF)), 'yaw': -150, 'clip': 'sit', 'sitH': 0.42},
        },
        'meteor': {'from': to_three((60, 280, 135)), 'to': to_three((-18, 260, 118)), 'impact': to_three((-35, 140, 0))},
    }
    weblib.write_meta(f'{OUT}/cati.json', meta)


def part_b():
    """Boş arsa: mahallenin arka sokağında, göktaşı kraterinin olduğu yer."""
    reset(preview=True)
    weblib.COLLIDERS.clear()
    weblib.patch_lib_for_web()
    import importlib
    import mahalle as M
    importlib.reload(M)
    web_simplify(M)
    import bmesh
    random.seed(19)
    # arazi: 70 x 50 m, ortada 7 m çaplı krater ve yanık zemin
    size, seg = 70, 140
    me = bpy.data.meshes.new('lot')
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=seg, y_segments=seg, size=size / 2)
    crater = Vector((4, 6, 0))
    for v in bm.verts:
        x, y = v.co.x, v.co.y * 0.72
        v.co.y = y
        r = math.hypot(x - crater.x, y - crater.y)
        h = (math.sin(x * 0.3) * math.cos(y * 0.25)) * 0.15 + (math.sin(x * 1.3 + y) * 0.04)
        R = 3.6
        if r < R:
            h -= (1 - (r / R) ** 2) * 1.5
        elif r < R * 1.9:
            h += math.sin((r - R) / (R * 0.9) * math.pi) * 0.45
        v.co.z = h
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        f.smooth = True
        for l in f.loops:
            l[uv].uv = (l.vert.co.x / 3.0, l.vert.co.y / 3.0)
    bm.to_mesh(me)
    bm.free()
    lot = bpy.data.objects.new('lot', me)
    bpy.context.scene.collection.objects.link(lot)
    me.materials.append(webmat('dry_ground_01', 1.0))
    # çevre: sokak tarafında yıkık tuğla duvar (bir boşlukla), beton bariyerler, az sayıda ot ve taş
    BR = webmat('brick_wall_02', 0.5)
    for x0, x1 in [(-34, -8), (-3, 34)]:
        w = box('wall', (x1 - x0, 0.25, 1.3), ((x0 + x1) / 2, -17.6, 0.65), BR)
        collider(w)
    for x, y, r in [(-12, -14, 10), (18, -15, -5), (-26, 10, 80)]:
        bb = model('concrete_road_barrier', (x, y, 0), (0, 0, math.radians(r)), 1.0)
        collider(bb)
    for i in range(14):
        a_ = random.uniform(0, math.tau)
        rr = random.uniform(9, 26)
        x, y = crater.x + math.cos(a_) * rr, crater.y + math.sin(a_) * rr * 0.7
        if abs(y) > 16:
            continue
        model('grass_medium_01', (x, y, 0), (0, 0, random.uniform(0, 6)), random.uniform(0.8, 1.3))
    for i in range(12):
        a_ = random.uniform(0, math.tau)
        rr = random.uniform(4.5, 9)
        model('stone_01', (crater.x + math.cos(a_) * rr, crater.y + math.sin(a_) * rr, 0.1), (random.uniform(0, 3), 0, random.uniform(0, 6)), random.uniform(0.3, 0.8))
    # çevre binalar (arka cepheler)
    k = 0
    for side, (y0, face) in enumerate([(26, -1), (-24, 1)]):
        x = -60
        while x < 60:
            w = random.uniform(10, 15)
            M.block(x + w / 2, y0 + (6 if face < 0 else -6), w, 12, random.choice([4, 5, 6, 7]), random.choice(M.PLASTERS), face=face, lit=random.uniform(0.3, 0.6), balconies=True, roof_props=True, seed=200 + k, detail=abs(x) < 40)
            x += w + random.uniform(0.5, 2)
            k += 1
    for x in (-42, 46):
        M.block(x, 0, 12, 30, 5, random.choice(M.PLASTERS), face=-1, seed=300 + x)
    plane('street', (200, 12), (0, -21, 0.01), webmat('asphalt_02', 0.3))
    lamps = []
    LAMP = emission((1.0, 0.55, 0.22), 25, 'lampglow')
    for x in range(-45, 50, 18):
        sphere('lamp', 0.22, (x, -19.5, 7.0), LAMP, seg=8)
        box('pole', (0.12, 0.12, 7), (x, -19.2, 3.5), M.RAIL)
        lamps.append(to_three((x, -19.5, 6.8)))
    weblib.merge_by_material()
    weblib.export_glb(f'{OUT}/arsa.glb')
    # sınırlar: görünmez duvarlar
    for c, h in [((0, -18.2, 1.5), (40, 1.5, 0.3)), ((0, 19, 1.5), (40, 1.5, 0.3)), ((-34, 0, 1.5), (0.3, 1.5, 20)), ((34, 0, 1.5), (0.3, 1.5, 20))]:
        weblib.COLLIDERS.append({'c': to_three(c), 'h': [h[0], h[2], h[1]], 'inv': 1})
    meta = {
        'spawn': to_three((-14, -15.5, 0)), 'spawnYaw': -35,
        'crater': to_three((crater.x, crater.y, -1.4)), 'craterR': 3.6,
        'kor': to_three((crater.x + 0.3, crater.y - 0.2, -1.25)),
        'lamps': lamps,
        'npc': {
            'kaan': {'p': to_three((crater.x - 4.5, crater.y - 3.5, 0)), 'yaw': 50},
            'elif': {'p': to_three((crater.x + 3.8, crater.y - 4.2, 0)), 'yaw': -20, 'clip': 'kneel'},
            'mert': {'p': to_three((crater.x - 1.0, crater.y - 5.2, 0)), 'yaw': 10},
            'zeynep': {'p': to_three((crater.x + 5.0, crater.y - 1.0, 0)), 'yaw': -70},
        },
        'terrain': {'size': size, 'crater': to_three((crater.x, crater.y, 0)), 'R': 3.6},
    }
    weblib.write_meta(f'{OUT}/arsa.json', meta)


if 'A' in PART:
    part_a()
if 'B' in PART:
    part_b()
