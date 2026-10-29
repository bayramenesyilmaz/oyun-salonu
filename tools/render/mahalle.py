# Mahalle yapı taşları: sıvalı apartmanlar, balkonlar, güneş enerjili ısıtıcılar, antenler.
import math, random
from lib import *

FLOOR_H = 3.0

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


def block(x0, y0, w, d, floors, mat, face=-1, lit=0.35, balconies=True, roof_props=True, seed=0, detail=True):
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
            if not detail:
                continue
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


