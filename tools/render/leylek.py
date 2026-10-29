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


def painted_rust(name, paint=(0.78, 0.8, 0.8), scale=0.7, rust_amount=0.42):
    """Boyalı sac + gürültü maskeli pas (iki Poly Haven dokusunun karışımı)."""
    a = pbr('metal_plate', scale, tint=paint, name=name + '_paint')
    b = pbr('rusty_metal_02', scale * 1.3, name=name + '_rust')
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    # iki malzemenin düğüm ağaçlarını grup olarak kopyalamak yerine: aynı dokuları yeniden kur
    def build_bsdf(src):
        bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
        sb = src.node_tree.nodes['Principled BSDF']
        mapping = {}
        for n in src.node_tree.nodes:
            if n.type in ('OUTPUT_MATERIAL', 'BSDF_PRINCIPLED'):
                continue
            c = nt.nodes.new(n.bl_idname)
            for attr in ('image', 'operation', 'data_type', 'blend_type'):
                if hasattr(n, attr):
                    try:
                        setattr(c, attr, getattr(n, attr))
                    except Exception:
                        pass
            for i, inp in enumerate(n.inputs):
                if hasattr(inp, 'default_value'):
                    try:
                        c.inputs[i].default_value = inp.default_value
                    except Exception:
                        pass
            mapping[n] = c
        mapping[sb] = bs
        for l in src.node_tree.links:
            if l.from_node in mapping and l.to_node in mapping:
                fo = mapping[l.from_node].outputs[l.from_socket.identifier] if l.from_socket.identifier in mapping[l.from_node].outputs else mapping[l.from_node].outputs[l.from_socket.name]
                ti = mapping[l.to_node].inputs[l.to_socket.identifier] if l.to_socket.identifier in mapping[l.to_node].inputs else mapping[l.to_node].inputs[l.to_socket.name]
                nt.links.new(fo, ti)
        return bs
    b1 = build_bsdf(a)
    b2 = build_bsdf(b)
    mix = nt.nodes.new('ShaderNodeMixShader')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 1.6
    noise.inputs['Detail'].default_value = 12
    noise.inputs['Roughness'].default_value = 0.65
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 1 - rust_amount
    ramp.color_ramp.elements[1].position = 1 - rust_amount + 0.08
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mix.inputs['Fac'])
    nt.links.new(b1.outputs[0], mix.inputs[1])
    nt.links.new(b2.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


def label(text, loc, rot, size, mat, extrude=0.004):
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = text
    cu.size = size
    cu.extrude = extrude
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new('txt', cu)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def build(loc=(0, 0, 0), rz=0.0, glow=True, seed=3):
    rnd = random.Random(seed)
    root = bpy.data.objects.new('Leylek', None)
    bpy.context.scene.collection.objects.link(root)
    parts = []
    HULL = pbr('rusty_metal_02', 0.45, tint=(0.95, 0.95, 0.93), name='hull')
    HULL2 = pbr('blue_metal_plate', 0.8, name='hull2')
    PATCH = pbr('rusty_metal_sheet', 0.8, name='patch')
    CORR = pbr('corrugated_iron_02', 0.8, name='corr')
    PLATE = pbr('painted_metal_shutter', 1.0, tint=(0.75, 0.78, 0.8), name='plate')
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
        p = box('patch', sz, (x, y, z), rnd.choice([PATCH, PLATE, HULL2, CORR]))
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
        parts.append(box('cabin', (0.1, 1.9, 0.9), (2.75, 0, 0.75), emission((1.0, 0.62, 0.32), 2.5), rot=(0, math.radians(-30), 0)))
    # ad: LEYLEK (iki yanda), küçük gövde numarası
    PAINT = simple((0.05, 0.05, 0.06), 0.6, name='paintblack')
    WHITEP = simple((0.92, 0.92, 0.9), 0.5, name='paintwhite')
    for side in (-1, 1):
        parts.append(label('LEYLEK', (0.9, side * 1.80, 0.15), (math.radians(90), 0, 0 if side < 0 else math.pi), 0.62, PAINT))
        parts.append(label('KZL-01', (-2.6, side * 1.70, -0.45), (math.radians(90), 0, 0 if side < 0 else math.pi), 0.22, PAINT))
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
