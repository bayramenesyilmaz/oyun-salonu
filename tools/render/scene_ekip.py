# Sahne 4 — "Ekip": beş arkadaş, depoda, Leylek'in önünde (karakter onayı için).
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import leylek

PV = '--preview' in sys.argv
OUT = sys.argv[-1] if sys.argv[-1].endswith('.png') else '/tmp/ekip.png'
reset(samples=160, w=1920, h=1080, preview=PV)
world_hdri('kloppenheim_02_puresky', strength=0.15, rot=0.0, bg_strength=0.2)
plane('floor', (40, 40), (0, 0, 0), pbr('garage_floor', 0.25))
box('wall', (40, 0.2, 12), (0, 13, 6), pbr('rusty_corrugated_iron', 0.45))
ship = leylek.build(loc=(1.5, 8.5, 2.75), rz=math.radians(-8), glow=True)
crew = [('kaan', -2.2, 0.35, 12, {'AK_44_MouthSmileLeft': 0.5, 'AK_45_MouthSmileRight': 0.5}),
        ('elif', -1.1, 0.05, 6, {'AK_44_MouthSmileLeft': 0.3, 'AK_45_MouthSmileRight': 0.3}),
        ('arda', 0.0, -0.1, 0, {'AK_44_MouthSmileLeft': 0.2, 'AK_45_MouthSmileRight': 0.2}),
        ('zeynep', 1.1, 0.05, -6, {'AK_44_MouthSmileLeft': 0.25, 'AK_45_MouthSmileRight': 0.25}),
        ('mert', 2.2, 0.35, -12, {})]
for who, x, y, rz, face in crew:
    person(who, loc=(x, y, 0), rot_z=math.radians(rz), face=face)
# ışık: sıcak ana ışık (iş lambası), soğuk dolgu, arkadan kontur
area((2.6, -3.2, 2.6), (0, 0, 1.4), 650, 1.6, (1.0, 0.82, 0.62))
area((-3.4, -2.2, 2.0), (0, 0, 1.4), 180, 2.5, (0.55, 0.68, 1.0))
area((0, 2.2, 3.2), (0, 0, 1.5), 400, 3.0, (0.9, 0.9, 1.0))
for x in (-6, 6):
    spot((x, 1.5, 0.6), (0.5, 4.6, 2.5), 700, 50, 0.5, (1.0, 0.85, 0.65), 0.15)
camera((0.0, -5.4, 1.45), (0.0, 0.0, 1.2), lens=42, dof=5.3, fstop=4.0)
compositor_glare(threshold=2.0, size=0.6, strength=0.3)
bpy.context.scene.view_settings.exposure = 0.2
render(OUT)
