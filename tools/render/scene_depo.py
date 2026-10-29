# Sahne 2 — "Depo": mahallenin ucundaki kapanmış vinç deposu, gece. Leylek yapım aşamasında.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import leylek

PV = '--preview' in sys.argv
OUT = sys.argv[-1] if sys.argv[-1].endswith('.png') else '/tmp/depo.png'
random.seed(11)
reset(samples=200, w=1920, h=1080, preview=PV)
world_hdri('kloppenheim_07_puresky', strength=0.25, rot=0.0, bg_strength=1.0)

W, D, H = 30, 20, 11  # hol: x boyunca 30 m, y 20 m, 11 m yükseklik
FLOOR = pbr('garage_floor', 0.25)
WALL = pbr('rusty_corrugated_iron', 0.45)
WALL2 = pbr('worn_corrugated_iron', 0.45)
BRICK = pbr('brick_wall_02', 0.5)
STEEL = simple((0.12, 0.13, 0.14), 0.55, 0.9, name='steel')
YELLOW = simple((0.85, 0.6, 0.05), 0.5, 0.3, name='craneyellow')

plane('floor', (W, D), (0, 0, 0), FLOOR, uv_scale=1.0)
# alt duvarlar tuğla, üstü oluklu sac
for y in (-D / 2, D / 2):
    box('brick', (W, 0.3, 2.4), (0, y, 1.2), BRICK)
    box('wall', (W, 0.1, H - 2.4), (0, y, 2.4 + (H - 2.4) / 2), WALL if y > 0 else WALL2)
for x in (-W / 2, W / 2):
    box('brick', (0.3, D, 2.4), (x, 0, 1.2), BRICK)
    box('wall', (0.1, D, H - 2.4), (x, 0, 2.4 + (H - 2.4) / 2), WALL2)
# arka duvarda yüksek pencereler (kırık camlar, dışarıdan ay ışığı)
for x in range(-12, 13, 4):
    box('hwin', (2.6, 0.12, 1.4), (x, D / 2 - 0.02, 8.6), simple((0.02, 0.03, 0.05), 0.1, name='hwin'))
# çatı makasları ve sürgülü çatı (açılmış bir şerit: yıldızlar görünür)
for x in range(-14, 15, 4):
    box('truss', (0.25, D, 0.35), (x, 0, H), STEEL)
    for k in range(-4, 5):
        box('diag', (0.08, 0.08, 1.6), (x, k * 2.1, H - 0.7), STEEL, rot=(math.radians(35 if k % 2 else -35), 0, 0))
    box('tie', (0.2, D, 0.2), (x, 0, H - 1.4), STEEL)
for y in (-D / 2, -D / 4, D / 4, D / 2):
    box('purlin', (W, 0.2, 0.2), (0, y, H + 0.25), STEEL)
box('roofA', (W, D * 0.36, 0.06), (0, -D * 0.32, H + 0.4), WALL)
box('roofB', (W, D * 0.36, 0.06), (0, D * 0.32, H + 0.4), WALL)
# tavan vinci (ray + köprü)
for y in (-D / 2 + 1, D / 2 - 1):
    box('rail', (W, 0.4, 0.5), (0, y, H - 2.0), YELLOW)
box('bridge', (0.8, D - 2, 0.9), (-3.5, 0, H - 2.2), YELLOW)
box('hoist', (1.2, 1.0, 1.0), (-3.5, 0.5, H - 3.0), YELLOW)
cyl('chain', 0.03, 3.4, (-3.5, 0.5, H - 5.0), STEEL, n=6)

# ---------------- Leylek ----------------
ship = leylek.build(loc=(0.5, 1.0, 2.75), rz=math.radians(18), glow=True)

# iskele ve merdivenler
ladder = model('ladder_sectioned_01', (-1.2, -0.9, 0), (math.radians(-14), 0, math.radians(18)), 1.0)
for x, y in [(3.5, -2.2), (-2.0, 3.8)]:
    for dz in (0, 1.6):
        box('scaf', (2.0, 0.05, 0.05), (x, y, 1.5 + dz), STEEL)
    for dx in (-1, 1):
        box('scafp', (0.05, 0.05, 3.4), (x + dx, y, 1.7), STEEL)
    box('board', (2.0, 0.5, 0.05), (x, y, 3.1), pbr('rusty_metal_sheet', 1.0))

# atölye eşyaları
model('portable_welding_cart', (-4.0, -2.6, 0), (0, 0, math.radians(40)), 1.0)
model('portable_generator', (-6.5, 2.5, 0), (0, 0, math.radians(-20)), 1.0)
model('tool_cart', (4.8, -3.0, 0), (0, 0, math.radians(-30)), 1.0)
model('metal_tool_chest', (-9.0, -6.0, 0), (0, 0, math.radians(90)), 1.0)
model('drill_press_01', (-11.5, 4.0, 0), (0, 0, math.radians(90)), 1.0)
model('steel_frame_shelves_01', (-13.8, -1.0, 0), (0, 0, math.radians(90)), 1.0)
model('steel_frame_shelves_01', (-13.8, 2.0, 0), (0, 0, math.radians(90)), 1.0)
for i, (x, y) in enumerate([(9.5, 6.5), (10.3, 6.0), (9.8, 7.3), (-12.5, -7.5)]):
    model('Barrel_01', (x, y, 0), (0, 0, i), 1.0)
for i in range(5):
    model('metal_jerrycan', (8.0 + i * 0.45, -7.8, 0), (0, 0, random.uniform(-0.3, 0.3)), 1.0)
for i in range(6):
    model('old_tyre', (11.5 + (i % 2) * 0.1, -6.5, i * 0.22), (0, 0, i), 1.0)
for i in range(5):
    model('cardboard_box_01', (-12 + i * 0.7, 7.5, (i % 2) * 0.4), (0, 0, random.uniform(-0.4, 0.4)), 1.0)
model('rollershutter_door', (W / 2 - 0.1, -3.0, 0), (0, 0, math.radians(-90)), 1.0)

# Zeynep'in masası: dizüstü, devre kartları, telsiz
table = model('WoodenTable_03', (6.5, -5.2, 0), (0, 0, math.radians(-15)), 1.0)
model('classic_laptop', (6.4, -5.2, 0.78), (0, 0, math.radians(170)), 1.0)
model('circuit_board', (7.0, -5.0, 0.79), (0, 0, 0.5), 1.0)
model('vintage_radio_transceiver', (5.8, -5.5, 0.78), (0, 0, math.radians(160)), 1.0)
model('retro_multimeter', (7.3, -5.5, 0.79), (0, 0, 2.5), 1.0)
model('desk_lamp_arm_01', (7.4, -4.8, 0.78), (0, 0, math.radians(200)), 1.0)
point((7.0, -5.0, 1.25), 25, (1.0, 0.85, 0.65), 0.05)
area((6.4, -5.35, 0.98), (6.4, -6.5, 1.5), 4, 0.3, (0.6, 0.75, 1.0))  # ekran ışığı
model('tea_set_01', (5.4, -4.8, 0.78), (0, 0, 0.8), 1.0)

# ---------------- ışıklar ----------------
# floresan sıraları (bazıları yanık)
for i, x in enumerate(range(-12, 13, 6)):
    for y in (-5, 5):
        on = not (i == 1 and y > 0)
        model('mounted_fluorescent_lights', (x, y, H - 1.5), (0, 0, 0), 1.0)
        box('tube', (1.2, 0.06, 0.04), (x, y, H - 1.58), emission((0.85, 0.95, 1.0), 18 if on else 0.2))
        if on:
            area((x, y, H - 1.62), (x, y, 0), 220, 1.2, (0.8, 0.92, 1.0), size_y=0.15)
# Leylek'e tutulmuş iş lambaları
for p, t in [((-6.5, -5.5, 1.6), (0, 1, 2.5)), ((7.5, 3.5, 2.0), (1, 1, 2.5)), ((1.5, -7.0, 0.8), (1, 1, 2.0))]:
    model('portable_searchlight', (p[0], p[1], 0), (0, 0, math.atan2(t[1] - p[1], t[0] - p[0]) - math.pi / 2), 1.0)
    spot(p, t, 900, 45, 0.5, (1.0, 0.86, 0.68), 0.15)
# kaynak kıvılcımı (Mert'in elinde)
WELD = Vector((-2.6, -0.6, 1.25))
sphere('weld', 0.03, WELD, emission((0.65, 0.85, 1.0), 2000), seg=8)
point(WELD, 220, (0.55, 0.75, 1.0), 0.02)
for i in range(70):
    d = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.2, 1))).normalized()
    ln = random.uniform(0.05, 0.25)
    pos = WELD + d * random.uniform(0.05, 0.9) + Vector((0, 0, -random.uniform(0, 0.5)))
    c = cyl('spark', 0.004, ln, pos, emission((1.0, 0.7, 0.3), 120), n=4)
    c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
# açık çatıdan gelen ay ışığı
moon = bpy.data.lights.new('moon', 'SUN')
moon.energy = 0.4
moon.color = (0.6, 0.7, 1.0)
moon.angle = math.radians(1)
mo = bpy.data.objects.new('moon', moon)
bpy.context.scene.collection.objects.link(mo)
mo.rotation_euler = (math.radians(25), math.radians(10), 0)

# ---------------- ekip ----------------
WORK = {'L UpperArm': (0, 30, -25), 'R UpperArm': (0, -30, -25), 'L Forearm': (0, 0, -70), 'R Forearm': (0, 0, -75)}
DOWN = {'Head': (0, 0, 18), 'Neck': (0, 0, 6)}
person('mert', loc=(-2.9, -1.6, 0), rot_z=math.radians(200), pose={**WORK, **DOWN, 'Spine1': (0, 0, 12)}, face={'AK_19_EyeSquintLeft': 0.6, 'AK_20_EyeSquintRight': 0.6})
person('zeynep', loc=(6.3, -6.0, 0), rot_z=math.radians(-15), pose={**WORK, 'Head': (0, 0, 22), 'Spine1': (0, 0, 14)})
person('arda', loc=(3.0, -2.4, 0), rot_z=math.radians(150), pose={'Head': (0, 0, -14), 'R Forearm': (0, 0, -95), 'R UpperArm': (0, -35, -10)})
person('elif', loc=(3.6, -3.4, 0), rot_z=math.radians(120), pose={'Head': (-10, 0, -8)}, face={'AK_44_MouthSmileLeft': 0.4, 'AK_45_MouthSmileRight': 0.4})
person('kaan', loc=(-8.5, -4.5, 0), rot_z=math.radians(-60), pose={**WORK, 'Head': (0, 0, 8)})
model('cardboard_box_01', (-8.15, -4.75, 1.05), (0, 0, math.radians(-60)), 1.0)

# ---------------- kamera ----------------
camera((9.2, -7.4, 1.68), (-0.5, 1.5, 2.4), lens=24)
compositor_glare(threshold=1.6, size=0.7, strength=0.35)
bpy.context.scene.view_settings.exposure = 0.3
render(OUT)
