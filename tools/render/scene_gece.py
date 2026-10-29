# Sahne 1 — "Göktaşı": Kızılkaya Mahallesi, bir yaz gecesi, çatıda çay. Birinci şahıs.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

PV = '--preview' in sys.argv
OUT = sys.argv[-1] if sys.argv[-1].endswith('.png') else '/tmp/gece.png'
random.seed(7)
reset(samples=160, w=1920, h=1080, preview=PV)
world_hdri('rogland_clear_night', strength=0.6, rot=math.radians(120), bg_strength=0.9)

FLOOR_H = 3.0
ROOF = 5 * FLOOR_H  # bizim bina 5 katlı

# ---------------- malzemeler ----------------
PLASTERS = [
    pbr('yellow_plaster_02', 0.35, tint=(1.0, 0.86, 0.62)),
    pbr('painted_plaster_wall', 0.35, tint=(0.95, 0.78, 0.68)),
    pbr('worn_plaster_wall', 0.35, tint=(0.85, 0.82, 0.78)),
    pbr('red_plaster_weathered', 0.35, tint=(0.95, 0.7, 0.6)),
    pbr('white_plaster_rough_02', 0.35, tint=(0.9, 0.9, 0.86)),
    pbr('painted_plaster_wall', 0.35, tint=(0.75, 0.85, 0.8), name='plaster_green'),
]
ROOF_FLOOR = pbr('concrete_floor_worn_001', 0.25)
DIRTY = pbr('dirty_concrete', 0.3)
CONCRETE = pbr('worn_plaster_wall', 0.4, tint=(0.7, 0.7, 0.68), name='slab')
METAL = simple((0.55, 0.55, 0.56), 0.45, 1.0, name='metal')
WHITE_METAL = simple((0.85, 0.85, 0.83), 0.35, 0.6, name='whitemetal')
RAIL = simple((0.12, 0.12, 0.13), 0.5, 0.8, name='rail')
GLASS_DARK = simple((0.02, 0.025, 0.03), 0.05, 0.0, name='glassdark')
SOLAR = simple((0.03, 0.06, 0.12), 0.08, 0.3, name='solar')
SHUTTER = pbr('painted_metal_shutter', 0.6, tint=(0.85, 0.85, 0.82))
SHUTTER_ROLL = simple((0.75, 0.72, 0.66), 0.6, 0.0, name='pvc')


def window_light(warm=True):
    c = random.choice([(1.0, 0.72, 0.42), (1.0, 0.8, 0.55), (0.95, 0.9, 0.85), (0.75, 0.85, 1.0)]) if warm else (0.6, 0.75, 1.0)
    return emission(c, random.uniform(1.2, 4.0), 'winlight')


WIN_LIGHTS = [window_light() for _ in range(8)] + [emission((0.45, 0.6, 1.0), 2.2, 'tvglow')]
CURTAINS = [simple(c, 0.9, name='curtain') for c in [(0.85, 0.75, 0.55), (0.7, 0.3, 0.25), (0.9, 0.88, 0.8), (0.4, 0.5, 0.6)]]


def solar_heater(x, y, z, rz=0.0):
    """Türkiye çatılarının simgesi: güneş enerjili su ısıtıcısı (kolektör + yatay depo)."""
    g = []
    ang = math.radians(38)
    c, s = math.cos(rz), math.sin(rz)
    def P(dx, dy, dz):
        return (x + dx * c - dy * s, y + dx * s + dy * c, z + dz)
    for i, dx in enumerate((-0.55, 0.55)):
        g.append(box('sol', (1.0, 2.0, 0.08), P(dx, 0, 0.95), SOLAR, rot=(ang, 0, rz)))
        g.append(box('solf', (1.06, 2.06, 0.05), P(dx, 0.02, 0.93), METAL, rot=(ang, 0, rz)))
    cyl('tank', 0.28, 2.2, P(0, 0.95, 1.85), WHITE_METAL, rot=(0, math.radians(90), rz))
    for dx in (-0.9, 0.9):
        g.append(box('leg', (0.05, 0.05, 1.7), P(dx, 0.8, 0.85), RAIL))
        g.append(box('leg', (0.05, 0.05, 0.4), P(dx, -0.75, 0.2), RAIL))
    return g


def dish(x, y, z, rz=0.0, r=0.38):
    d = sphere('dish', r, (x, y, z), WHITE_METAL, seg=20, scale=(1, 0.25, 1))
    d.rotation_euler = (math.radians(-20), 0, rz)
    box('arm', (0.03, 0.4, 0.03), (x + 0.0, y - 0.25, z - 0.05), RAIL, rot=(0, 0, rz))
    return d


def antenna(x, y, z, h=2.6):
    box('mast', (0.04, 0.04, h), (x, y, z + h / 2), RAIL)
    for i in range(5):
        box('el', (0.9 - i * 0.12, 0.02, 0.02), (x, y, z + h - 0.15 - i * 0.18), RAIL)


def block(x0, y0, w, d, floors, mat, face=-1, lit=0.35, balconies=True, roof_props=True, seed=0):
    """Basit Türk apartmanı: sıvalı duvarlar, kat bantları, pencereler, balkonlar, çatı eşyaları.
    face: ön cephenin yönü (-1 = -Y'ye bakar, kameraya doğru)."""
    rnd = random.Random(seed)
    H = floors * FLOOR_H
    box('b', (w, d, H), (x0, y0, H / 2), mat, uv_scale=1.0)
    fy = y0 + face * d / 2  # ön yüz
    bays = max(2, int(w // 3.2))
    bw = w / bays
    for f in range(floors):
        z = f * FLOOR_H
        # kat bandı
        box('band', (w + 0.06, 0.08, 0.22), (x0, fy + face * 0.03, z + FLOOR_H - 0.1), CONCRETE)
        for b in range(bays):
            cx = x0 - w / 2 + bw * (b + 0.5)
            ww = min(1.5, bw * 0.55)
            wh = 1.45
            wz = z + 1.0 + wh / 2
            on = rnd.random() < lit
            # pencere boşluğu ve iç ışık
            box('win', (ww, 0.02, wh), (cx, fy + face * 0.005, wz), rnd.choice(WIN_LIGHTS) if on else GLASS_DARK)
            if on and rnd.random() < 0.6:
                cw = ww * rnd.uniform(0.25, 0.45)
                box('cur', (cw, 0.01, wh), (cx - ww / 2 + cw / 2, fy + face * 0.015, wz), rnd.choice(CURTAINS))
            # PVC çerçeve ve panjur kutusu
            box('frm', (ww + 0.1, 0.06, 0.06), (cx, fy + face * 0.03, wz - wh / 2), WHITE_METAL)
            box('frm', (ww + 0.1, 0.06, 0.06), (cx, fy + face * 0.03, wz + wh / 2), WHITE_METAL)
            box('frm', (0.05, 0.06, wh), (cx, fy + face * 0.03, wz), WHITE_METAL)
            if rnd.random() < 0.35:
                k = rnd.uniform(0.3, 1.0)
                box('roll', (ww, 0.03, wh * k), (cx, fy + face * 0.04, wz + wh / 2 - wh * k / 2), SHUTTER_ROLL)
            # balkon
            if balconies and f > 0 and b % 2 == 0:
                bd = 1.2
                box('bal', (bw * 0.95, bd, 0.16), (cx, fy + face * bd / 2, z + 0.08), CONCRETE)
                box('par', (bw * 0.95, 0.06, 0.9), (cx, fy + face * (bd - 0.03), z + 0.6), RAIL if rnd.random() < 0.5 else mat)
                if rnd.random() < 0.4:
                    model('exterior_aircon_unit', (cx + bw * 0.3, fy + face * 0.5, z + 0.16), (0, 0, math.pi if face > 0 else 0), 0.9)
                if rnd.random() < 0.25:
                    dish(cx - bw * 0.3, fy + face * 0.8, z + 1.3, rz=0 if face < 0 else math.pi)
                if rnd.random() < 0.3:
                    # çamaşır ipi
                    for k in range(rnd.randint(2, 5)):
                        box('cl', (0.35, 0.01, 0.5), (cx - bw * 0.35 + k * 0.42, fy + face * (bd - 0.3), z + 2.1), rnd.choice(CURTAINS))
            elif f > 0 and rnd.random() < 0.15:
                model('exterior_aircon_unit', (cx + ww, fy + face * 0.25, z + 0.7), (0, 0, math.pi if face > 0 else 0), 0.8)
    # çatı
    box('parapet', (w, d, 0.6), (x0, y0, H + 0.3), mat)
    box('roof', (w - 0.3, d - 0.3, 0.02), (x0, y0, H + 0.58), DIRTY)
    if roof_props:
        for k in range(rnd.randint(1, 3)):
            solar_heater(x0 + rnd.uniform(-w / 2 + 1.5, w / 2 - 1.5), y0 + rnd.uniform(-d / 4, d / 4), H + 0.6, rz=math.radians(rnd.choice([0, 0, 8, -6])))
        for k in range(rnd.randint(0, 3)):
            antenna(x0 + rnd.uniform(-w / 2 + 1, w / 2 - 1), y0 + rnd.uniform(-d / 3, d / 3), H + 0.6, rnd.uniform(1.8, 3.2))
        if rnd.random() < 0.5:
            box('stairhouse', (3, 3, 2.6), (x0 + rnd.uniform(-w / 4, w / 4), y0 + d / 4, H + 1.9), mat)
        if rnd.random() < 0.6:
            cyl('tank', 0.7, 1.6, (x0 + rnd.uniform(-w / 3, w / 3), y0 - d / 5, H + 1.4), WHITE_METAL)


# ---------------- bizim çatı ----------------
ow, od = 14, 11
box('ourbody', (ow, od, ROOF), (0, 0, ROOF / 2), PLASTERS[0])
plane('ourroof', (ow, od), (0, 0, ROOF + 0.001), ROOF_FLOOR, uv_scale=1.0)
for sx, sy, sw, sd in [(0, od / 2, ow, 0.25), (0, -od / 2, ow, 0.25), (ow / 2, 0, 0.25, od), (-ow / 2, 0, 0.25, od)]:
    box('ourpar', (sw, sd, 1.05), (sx, sy, ROOF + 0.525), PLASTERS[0])
    box('cap', (sw + 0.08, sd + 0.08, 0.06), (sx, sy, ROOF + 1.08), CONCRETE)
solar_heater(4.2, 1.5, ROOF, rz=math.radians(-4))
solar_heater(-4.8, 2.8, ROOF, rz=math.radians(3))
antenna(-2.2, 4.4, ROOF, 3.4)
dish(5.8, 4.3, ROOF + 1.5, rz=math.radians(200))
model('exterior_aircon_unit', (-5.5, -1.0, ROOF), (0, 0, math.radians(90)), 1.0)
cyl('tank', 0.75, 1.7, (5.2, -2.5, ROOF + 0.85), WHITE_METAL)
# çay sofrası: ters çevrilmiş kasa üstünde çay takımı, plastik sandalyeler
model('plastic_crate_01', (0.9, -1.2, ROOF), (0, 0, 0.3), 1.0)
model('tea_set_01', (0.9, -1.2, ROOF + 0.3), (0, 0, 0.4), 1.0)
model('plastic_monobloc_chair_01', (-0.4, -1.9, ROOF), (0, 0, math.radians(-150)), 1.0)
model('plastic_monobloc_chair_01', (2.0, -2.1, ROOF), (0, 0, math.radians(160)), 1.0)
model('plastic_monobloc_chair_01', (1.6, 0.2, ROOF), (0, 0, math.radians(20)), 1.0)
# çatı kapısındaki ampul
sphere('bulb', 0.06, (-6.6, -4.9, ROOF + 2.2), emission((1.0, 0.75, 0.45), 40))
point((-6.6, -4.75, ROOF + 2.15), 60, (1.0, 0.72, 0.42), 0.05)
box('stairdoor', (2.6, 2.4, 2.6), (-6.0, -4.2, ROOF + 1.3), PLASTERS[0])

# ---------------- ekip: parapette göğe bakıyorlar ----------------
person('kaan', loc=(-1.4, 4.6, ROOF), rot_z=math.radians(180 + 10), pose={**LOOK_UP, **POINT_R}, face={'AK_25_JawOpen': 0.35, 'AK_21_EyeWideLeft': 0.6, 'AK_22_EyeWideRight': 0.6, 'AK_03_BrowInnerUp': 0.6})
person('elif', loc=(0.4, 4.4, ROOF), rot_z=math.radians(180 - 8), pose={**LOOK_UP, 'L UpperArm': (0, 30, 0), 'R UpperArm': (-20, -30, -20), 'R Forearm': (0, 0, -95)}, face={'AK_25_JawOpen': 0.2, 'AK_03_BrowInnerUp': 0.5})
person('mert', loc=(2.3, 3.6, ROOF), rot_z=math.radians(180 - 25), pose={'Head': (0, 0, -22), 'Neck': (0, 0, -8)})

# ---------------- mahalle: sokaklar ve bloklar ----------------
plane('ground', (400, 400), (0, 60, 0), pbr('asphalt_02', 0.1), uv_scale=4)
rows = [(20, 12), (38, 13), (58, 12), (80, 14), (104, 15), (130, 16)]
k = 0
for ri, (yy, dd) in enumerate(rows):
    x = -70 + random.uniform(-4, 4)
    while x < 75:
        w = random.uniform(11, 17)
        floors = random.choice([4, 5, 5, 6, 6, 7, 8]) + (1 if ri > 3 else 0)
        block(x + w / 2, yy + dd / 2, w, dd, floors, random.choice(PLASTERS), lit=random.uniform(0.2, 0.45), balconies=ri < 4, roof_props=ri < 5, seed=k)
        x += w + random.uniform(1.0, 7.0)
        k += 1
# yanlardaki bloklar
for side in (-1, 1):
    block(side * 16, 0, 10, 12, 4 if side < 0 else 6, random.choice(PLASTERS), face=-1, seed=100 + side)

# sokak lambaları (sodyum turuncusu)
for yy in (16.5, 34.5, 52.5, 75):
    for x in range(-60, 70, 14):
        model('street_lamp_02', (x + random.uniform(-1, 1), yy, 0), (0, 0, 0), 1.0)
        point((x, yy - 0.6, 7.2), 120, (1.0, 0.55, 0.22), 0.15)

# uzakta cami: kubbe ve minare silueti
DOME = simple((0.45, 0.48, 0.5), 0.4, 0.8)
for mx, my, mh in [(-38, 190, 42), (52, 230, 38)]:
    cyl('minare', 1.3, mh, (mx, my, mh / 2), PLASTERS[4], n=16)
    cyl('serefe', 2.0, 0.5, (mx, my, mh * 0.78), PLASTERS[4], n=16)
    cyl('kulah', 1.4, 7, (mx, my, mh + 3.5), DOME, n=16, r2=0.0)
    cyl('isik', 1.45, 0.12, (mx, my, mh * 0.78 + 0.6), emission((0.6, 1.0, 0.7), 6), n=24)
    sphere('kubbe', 11, (mx + 16, my + 6, 6), DOME, seg=32, scale=(1, 1, 0.75))
# uzak şehir ışıkları: malzeme başına tek bir ağ
import bmesh
for li, lm in enumerate(WIN_LIGHTS):
    me = bpy.data.meshes.new('citylights')
    bm = bmesh.new()
    for i in range(110):
        a = random.uniform(-1.2, 1.2)
        r = random.uniform(220, 600)
        x, y = math.sin(a) * r, 40 + math.cos(a) * r
        z = random.uniform(1, 25) * (1 if r < 400 else 0.6)
        sz = random.uniform(0.25, 0.8)
        c, sn = math.cos(a), math.sin(a)
        vs = [bm.verts.new((x + dx * c, y - dx * sn, z + dz)) for dx, dz in ((-sz, -sz), (sz, -sz), (sz, sz), (-sz, sz))]
        bm.faces.new(vs)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(lm)
    ob = bpy.data.objects.new('citylights', me)
    bpy.context.scene.collection.objects.link(ob)

# ---------------- göktaşı ----------------
head = Vector((-18, 260, 118))
dirv = Vector((-1.0, 0.15, -0.42)).normalized()  # gidiş yönü
L = 95
tail_mat = bpy.data.materials.new('trail')
tail_mat.use_nodes = True
nt = tail_mat.node_tree
nt.nodes.clear()
o = nt.nodes.new('ShaderNodeOutputMaterial')
em = nt.nodes.new('ShaderNodeEmission')
tr = nt.nodes.new('ShaderNodeBsdfTransparent')
mx = nt.nodes.new('ShaderNodeMixShader')
tc = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ')
cr = nt.nodes.new('ShaderNodeValToRGB')
# Z=0 baş tarafı (parlak), Z=1 kuyruğun ucu (sönük)
cr.color_ramp.elements[0].position = 0.0
cr.color_ramp.elements[0].color = (1, 1, 1, 1)
cr.color_ramp.elements[1].position = 1.0
cr.color_ramp.elements[1].color = (0, 0, 0, 1)
cr.color_ramp.interpolation = 'EASE'
nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
nt.links.new(sep.outputs['Z'], cr.inputs['Fac'])
em.inputs['Color'].default_value = (0.75, 1.0, 0.85, 1)
em.inputs['Strength'].default_value = 60
nt.links.new(cr.outputs['Color'], mx.inputs['Fac'])
nt.links.new(tr.outputs[0], mx.inputs[1])
nt.links.new(em.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], o.inputs['Surface'])
tail = cyl('tail', 1.2, L, head - dirv * (L / 2), None, n=24, r2=0.08)
tail.rotation_euler = (-dirv).to_track_quat('Z', 'Y').to_euler()
tail.data.materials.append(tail_mat)
sphere('bolidehead', 1.6, head, emission((1.0, 0.97, 0.85), 400))
glow = sphere('halo', 4.5, head)
gm = bpy.data.materials.new('halo')
gm.use_nodes = True
g = gm.node_tree
g.nodes.clear()
go = g.nodes.new('ShaderNodeOutputMaterial')
ge = g.nodes.new('ShaderNodeEmission')
ge.inputs['Color'].default_value = (0.7, 1.0, 0.8, 1)
ge.inputs['Strength'].default_value = 4
gt = g.nodes.new('ShaderNodeBsdfTransparent')
gx = g.nodes.new('ShaderNodeMixShader')
lw = g.nodes.new('ShaderNodeLayerWeight')
lw.inputs['Blend'].default_value = 0.6
g.links.new(lw.outputs['Facing'], gx.inputs['Fac'])
g.links.new(ge.outputs[0], gx.inputs[1])
g.links.new(gt.outputs[0], gx.inputs[2])
g.links.new(gx.outputs[0], go.inputs['Surface'])
glow.data.materials.append(gm)
# göktaşının mahalleye düşürdüğü yeşilimsi ışık
sun = bpy.data.lights.new('bolide', 'SUN')
sun.energy = 0.9
sun.color = (0.72, 1.0, 0.85)
sun.angle = math.radians(3)
so = bpy.data.objects.new('bolide', sun)
bpy.context.scene.collection.objects.link(so)
so.rotation_euler = (Vector((0, 0, 0)) - head).to_track_quat('-Z', 'Y').to_euler()

# ---------------- kamera: göz hizası, göğe biraz kalkık ----------------
cam = camera((0.9, -3.4, ROOF + 1.7), (-4, 60, ROOF + 13), lens=20, dof=6.0, fstop=8)
cam.data.dof.use_dof = False
compositor_glare(threshold=1.5, size=0.75, strength=0.45)
bpy.context.scene.view_settings.exposure = 0.6
render(OUT)
