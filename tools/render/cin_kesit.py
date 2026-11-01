# Karaçam Dosyaları — sorgu ekranı için bel üstü, arka planı saydam karakter kesitleri.
# Çıktı: <klasör>/<ad>[_ifade].png
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import bpy

OUT = sys.argv[-1]
pv = '--preview' in sys.argv
reset(samples=96, w=900, h=1200, preview=pv)
sc = bpy.context.scene
sc.render.film_transparent = True
sc.render.image_settings.color_mode = 'RGBA'
world_hdri('qwantani_night_puresky', 0.05)
# (ad, model, yüz ifadesi, poz)
SHOTS = [
    ('yusuf', 'yusuf', {}, {}),
    ('riza', 'riza', {'BrowDown': 0.3}, {}),
    ('nazmiye', 'nazmiye', {'BrowInnerUp': 0.45}, {}),
    ('nazmiye_uzgun', 'nazmiye', {'BrowInnerUp': 0.9, 'MouthFrown': 0.5}, {'Head': (0, 0, 8)}),
    ('hatice', 'hatice', {'BrowInnerUp': 0.25}, {}),
    ('selim', 'selim', {'MouthSmile': 0.15}, {}),
    ('selim_gergin', 'selim', {'BrowDown': 0.7, 'MouthFrown': 0.4, 'EyeSquint': 0.4}, {'Head': (0, 0, -5)}),
]
os.makedirs(OUT, exist_ok=True)
for i, (name, who, face, pose) in enumerate(SHOTS):
    x = i * 5.0
    arm = person(who, loc=(x, 0, 0), face=face, pose=pose)
    area((x - 1.4, -1.5, 2.2), (x, 0, 1.45), 110, 0.9, (1.0, 0.74, 0.48), name='key%d' % i)
    area((x + 1.2, 0.9, 2.1), (x, 0, 1.5), 120, 0.6, (0.5, 0.65, 1.0), name='rim%d' % i)
    area((x + 1.0, -1.6, 1.3), (x, 0, 1.4), 18, 1.5, (0.8, 0.85, 1.0), name='fill%d' % i)
for i, (name, who, face, pose) in enumerate(SHOTS):
    x = i * 5.0
    # yalnızca bu karakter görünsün
    for o in bpy.data.objects:
        if o.type in ('MESH', 'ARMATURE'):
            root = o
            while root.parent:
                root = root.parent
            o.hide_render = abs(root.location.x - x) > 1.0 if root.type == 'ARMATURE' else o.hide_render
    cam = camera((x + 0.08, -1.62, 1.42), (x, 0, 1.36), lens=50)
    sc.camera = cam
    render(f'{OUT}/{name}.png')
