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
# Vaka 2: Gülsüm (normal ve cin tutmuş hâlleri) ve Kadir
CIN_FACE = {'EyeWide': 1.0, 'JawOpen': 0.45, 'BrowDown': 0.9, 'MouthFrown': 0.6}
SHOTS += [
    ('gulsum', 'nazmiye', {'BrowInnerUp': 0.35}, {}),
    ('gulsum_cin_1', 'nazmiye', CIN_FACE, {'Head': (30, 0, 0), 'Neck': (10, 0, 0), 'Spine2': (0, 0, 8)}),
    ('gulsum_cin_2', 'nazmiye', {**CIN_FACE, 'JawOpen': 0.7}, {'Head': (-34, 0, 6), 'Neck': (-12, 0, 0), 'Spine2': (0, 0, 10)}),
    ('gulsum_cin_3', 'nazmiye', {'EyeWide': 1.0, 'EyeLookUp': 1.0, 'BrowDown': 1.0, 'MouthSmile': 0.5}, {'Head': (6, 0, 24), 'Neck': (0, 0, 10), 'Spine2': (0, 0, 12)}),
    ('kadir', 'kadir', {'MouthSmile': 0.15}, {}),
    ('kadir_gergin', 'kadir', {'BrowDown': 0.6, 'MouthFrown': 0.5, 'EyeSquint': 0.4}, {'Head': (0, 0, -6)}),
]
CIN = {n for n, *_ in SHOTS if n.startswith('gulsum_cin')}
if os.environ.get('KS_ONLY'):
    _only = set(os.environ['KS_ONLY'].split(','))
    SHOTS = [s_ for s_ in SHOTS if s_[0] in _only]


def pale(arm):
    # cin tutmuş: soluk, morumsu deri
    for o in arm.children:
        if o.type != 'MESH':
            continue
        for slot in o.material_slots:
            m = slot.material
            if not m or not m.name.endswith(('_head', '_body')):
                continue
            m = m.copy()
            slot.material = m
            nt = m.node_tree
            b = nt.nodes.get('Principled BSDF')
            if b and b.inputs['Base Color'].links:
                src = b.inputs['Base Color'].links[0].from_socket
                hs = nt.nodes.new('ShaderNodeHueSaturation')
                hs.inputs['Saturation'].default_value = 0.35
                hs.inputs['Value'].default_value = 0.85
                hs.inputs['Hue'].default_value = 0.55
                nt.links.new(src, hs.inputs['Color'])
                nt.links.new(hs.outputs['Color'], b.inputs['Base Color'])


os.makedirs(OUT, exist_ok=True)
for i, (name, who, face, pose) in enumerate(SHOTS):
    x = i * 5.0
    arm = person(who, loc=(x, 0, 0), face=face, pose=pose)
    if name in CIN:
        pale(arm)
        # korku ışığı: aşağıdan soğuk, arkadan kırmızı
        area((x + 0.2, -1.2, 0.3), (x, 0, 1.5), 140, 0.7, (0.55, 0.7, 1.0), name='key%d' % i)
        area((x - 1.0, 1.0, 2.0), (x, 0, 1.5), 160, 0.5, (1.0, 0.2, 0.12), name='rim%d' % i)
        continue
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
