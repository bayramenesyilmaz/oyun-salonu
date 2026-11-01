# Karaçam Dosyaları — karakter portreleri (şüpheli kartları). Çıktı: <klasör>/<ad>.png
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import bpy

OUT = sys.argv[-1]
pv = '--preview' in sys.argv
reset(samples=128, w=800, h=1000, preview=pv)
sc = bpy.context.scene
world_hdri('qwantani_night_puresky', 0.03)
CAST = [
    ('yusuf', {}),
    ('riza', {'BrowDown': 0.35}),
    ('nazmiye', {'BrowInnerUp': 0.5}),
    ('hatice', {'BrowInnerUp': 0.3}),
    ('selim', {'MouthSmile': 0.2}),
]
WALL = pbr('decrepit_wallpaper', 1.2, tint=(0.55, 0.45, 0.35))
arms = {}
for i, (who, face) in enumerate(CAST):
    x = i * 4.0
    arms[who] = person(who, loc=(x, 0, 0), face=face)
    plane('bg%d' % i, (3, 3), (x, 1.1, 1.5), WALL, rot=(math.pi / 2, 0, 0))
    area((x - 1.2, -1.2, 2.0), (x, 0, 1.55), 90, 0.8, (1.0, 0.72, 0.45), name='key%d' % i)
    area((x + 1.0, 0.8, 2.0), (x, 0, 1.6), 70, 0.6, (0.55, 0.7, 1.0), name='rim%d' % i)
    area((x + 0.9, -1.4, 1.4), (x, 0, 1.5), 10, 1.5, (0.8, 0.85, 1.0), name='fill%d' % i)

os.makedirs(OUT, exist_ok=True)
for i, (who, _) in enumerate(CAST):
    x = i * 4.0
    # baş yüksekliğini iskeletten bul
    a = arms[who]
    hb = a.pose.bones.get('Bip01 Head')
    hz = (a.matrix_world @ hb.head).z if hb else 1.6
    cam = camera((x + 0.12, -1.45, hz - 0.02), (x, 0, hz - 0.12), lens=70)
    sc.camera = cam
    render(f'{OUT}/{who}.png')
