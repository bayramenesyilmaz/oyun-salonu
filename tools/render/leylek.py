# Leylek: mahalle deposunda hurdadan yapılmış uzay aracı (kendi modelimiz).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
from lib import box, cyl, sphere, simple, pbr, emission


def revolve(name, profile, segments=48, mat=None):
    """profile: [(yarıçap, x)] — X ekseni boyunca dönel gövde."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, x in profile:
        ring = []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            ring.append(bm.verts.new((x, r * math.cos(a), r * math.sin(a) * 0.86)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(segments):
            j = (i + 1) % segments
            bm.faces.new((a[i], a[j], b[j], b[i]))
    for f in bm.faces:
        f.smooth = True
    # UV: x ve açı
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for l in f.loops:
            v = l.vert.co
            l[uv].uv = (v.x / 1.5, math.atan2(v.z, v.y) * 1.2)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        me.materials.append(mat)
    return o


def build(loc=(0, 0, 0), rz=0.0, glow=True, seed=3):
    rnd = random.Random(seed)
    root = bpy.data.objects.new('Leylek', None)
    bpy.context.scene.collection.objects.link(root)
    parts = []
    HULL = pbr('rusty_painted_metal', 0.6, tint=(0.82, 0.86, 0.9), name='hull')
    HULL2 = pbr('blue_metal_plate', 0.8, name='hull2')
    PATCH = pbr('rusty_metal_02', 0.9, name='patch')
    CORR = pbr('corrugated_iron_02', 0.8, name='corr')
    PLATE = pbr('metal_plate', 1.0, name='plate')
    DARK = simple((0.05, 0.05, 0.055), 0.4, 0.9, name='darkmetal')
    GLASS = simple((0.05, 0.08, 0.1), 0.02, 0.0, name='cockpitglass', transmission=0.0)
    TAPE = simple((0.6, 0.6, 0.58), 0.7, 0.0, name='tape')
    ORANGE = simple((0.85, 0.35, 0.08), 0.5, 0.0, name='orange')
    # gövde profili (burun +X, kuyruk -X), uzunluk ≈ 9 m
    prof = [(0.05, 4.6), (0.6, 4.45), (1.05, 4.1), (1.38, 3.5), (1.6, 2.6), (1.72, 1.4), (1.75, 0.0), (1.72, -1.5), (1.62, -2.8), (1.45, -3.8), (1.3, -4.3)]
    hull = revolve('hull', prof, 56, HULL)
    parts.append(hull)
    # kuyruk kapağı ve motorlar
    parts.append(cyl('aft', 1.3, 0.15, (-4.35, 0, 0), DARK, rot=(0, math.radians(90), 0), n=40))
    for dy, dz, r in [(0.62, 0.35, 0.42), (-0.62, 0.35, 0.42), (0, -0.55, 0.5)]:
        parts.append(cyl('bell', r * 0.55, 1.1, (-4.9, dy, dz), DARK, rot=(0, math.radians(90), 0), n=28, r2=r))
        parts.append(cyl('bellin', r * 0.5, 1.12, (-4.9, dy, dz), emission((1.0, 0.55, 0.2), 6.0 if glow else 0.0), rot=(0, math.radians(90), 0), n=28, r2=r * 0.9))
    # kanatçıklar (oluklu sacdan)
    for side in (1, -1):
        w = box('wing', (2.6, 2.0, 0.08), (-2.2, side * 2.2, -0.35), CORR, rot=(0, 0, side * math.radians(-12)))
        w.rotation_euler = (side * math.radians(-8), 0, side * math.radians(-12))
        parts.append(w)
        parts.append(box('fin', (1.6, 0.08, 1.4), (-3.6, side * 0.8, 1.35), CORR, rot=(side * math.radians(20), 0, 0)))
    # yamalar: gövdeye perçinli farklı metal levhalar
    for i in range(46):
        x = rnd.uniform(-3.8, 3.4)
        a = rnd.uniform(-math.pi, math.pi)
        r = 1.76 - max(0, (abs(x) - 1.5)) * 0.12
        y, z = r * math.cos(a), r * math.sin(a) * 0.86
        n = Vector((0, math.cos(a), math.sin(a))).normalized()
        sz = (rnd.uniform(0.5, 1.3), rnd.uniform(0.4, 1.0), 0.03)
        p = box('patch', sz, (x, y, z), rnd.choice([PATCH, PLATE, HULL2, PATCH]))
        p.rotation_euler = n.to_track_quat('Z', 'X').to_euler()
        parts.append(p)
    # kokpit camı (eski bir otobüs ön camı gibi geniş, kavisli)
    for i, (dy, ry) in enumerate([(-0.55, 0.35), (0.55, -0.35)]):
        g = box('glass', (1.05, 0.95, 0.04), (3.25, dy, 0.82), GLASS)
        g.rotation_euler = (0, math.radians(-42), ry)
        parts.append(g)
        fr = box('gframe', (1.12, 1.02, 0.03), (3.23, dy, 0.80), DARK)
        fr.rotation_euler = g.rotation_euler
        parts.append(fr)
    if glow:
        parts.append(sphere('cabinlight', 0.5, (2.7, 0, 0.3), emission((1.0, 0.65, 0.35), 3.0), seg=12))
    # yan kapı (açık), merdiven
    parts.append(box('door', (1.2, 0.06, 1.7), (0.6, -1.78, -0.1), PLATE))
    # bant ve şeritler
    for x in (-1.2, 1.9):
        parts.append(cyl('band', 1.78, 0.18, (x, 0, 0), DARK, rot=(0, math.radians(90), 0), n=56))
    parts.append(box('stripe', (2.8, 0.02, 0.22), (0.2, -1.74, 0.55), ORANGE))
    # anten ve çanak (eski uydu çanağı)
    parts.append(cyl('mast', 0.03, 1.2, (-1.0, 0, 2.0), DARK))
    d = sphere('dish', 0.45, (-1.0, 0, 2.6), simple((0.85, 0.85, 0.82), 0.4, 0.5), seg=20, scale=(1, 1, 0.25))
    d.rotation_euler = (math.radians(60), 0, 0)
    parts.append(d)
    # iniş ayakları
    for x, y in [(2.4, 1.3), (2.4, -1.3), (-2.8, 1.5), (-2.8, -1.5)]:
        leg = cyl('leg', 0.09, 2.1, (x * 1.05, y * 1.25, -1.75), DARK, rot=(math.copysign(0.35, y), math.copysign(0.2, -x), 0))
        parts.append(leg)
        parts.append(cyl('pad', 0.42, 0.1, (x * 1.12, y * 1.55, -2.72), PLATE, n=24))
        parts.append(cyl('piston', 0.05, 1.4, (x * 0.95, y * 1.05, -1.45), simple((0.8, 0.8, 0.8), 0.2, 1.0)))
    # kablolar ve borular
    for i in range(6):
        parts.append(cyl('pipe', 0.04, rnd.uniform(1.5, 3.5), (rnd.uniform(-3, 1), rnd.choice((-1, 1)) * 1.72, rnd.uniform(-0.6, 0.6)), rnd.choice([DARK, TAPE]), rot=(0, math.radians(90), 0), n=10))
    for p in parts:
        p.parent = root
    root.location = loc
    root.rotation_euler = (0, 0, rz)
    return root
