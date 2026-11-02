# Karaçam Dosyaları — MakeHuman (MPFB2, CC0) ile yaşlı karakter kesitleri. Çıktı: <klasör>/<ad>.png
# Önkoşul: MPFB2 eklentisi kurulu ve CC0 paketleri açılmış olmalı (bkz. tools/kaynak/mh_kur.py).
import sys, os, json, importlib, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import bpy

OUT = sys.argv[-1]
pv = '--preview' in sys.argv
reset(samples=96, w=900, h=1200, preview=pv)
try:
    bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')
except Exception as e:
    print('enable', e)
sc = bpy.context.scene
sc.render.film_transparent = True
sc.render.image_settings.color_mode = 'RGBA'
def dyn(p, k):
    for m in list(sys.modules):
        if m.endswith(p):
            return getattr(importlib.import_module(m), k)
    raise ValueError(p)
HS = dyn('mpfb.services.humanservice', 'HumanService')
TS = dyn('mpfb.services.targetservice', 'TargetService')
HOP = dyn('mpfb.entities.objectproperties', 'HumanObjectProperties')
LS = dyn('mpfb.services.locationservice', 'LocationService')
ud = LS.get_user_data()
A = lambda rel: os.path.join(ud, rel)

def grey(obj, value=1.9, sat=0.08):
    for slot in obj.material_slots:
        m = slot.material
        if not m or not m.node_tree:
            continue
        nt = m.node_tree
        for n in list(nt.nodes):
            if n.type == 'BSDF_PRINCIPLED':
                bc = n.inputs['Base Color']
                if bc.links:
                    src = bc.links[0].from_socket
                    hs = nt.nodes.new('ShaderNodeHueSaturation')
                    hs.inputs['Saturation'].default_value = sat
                    hs.inputs['Value'].default_value = value
                    nt.links.new(src, hs.inputs['Color'])
                    nt.links.new(hs.outputs['Color'], bc)
                else:
                    bc.default_value = (0.62, 0.61, 0.58, 1)

def old_man(x, outfit):
    h = HS.create_human()
    for k, v in {'gender': 1.0, 'age': 1.0, 'weight': 0.48, 'muscle': 0.35, 'caucasian': 0.7, 'asian': 0.2, 'african': 0.1, 'height': 0.4}.items():
        HOP.set_value(k, v, entity_reference=h)
    TS.reapply_macro_details(h)
    HS.set_character_skin(A('skins/old_caucasian_male/old_caucasian_male.mhmat'), h, skin_type='ENHANCED_SSS')
    for sub, rel, t in [('eyes', 'eyes/high-poly/high-poly.mhclo', 'Eyes'), ('eyebrows', 'eyebrows/eyebrow001/eyebrow001.mhclo', 'Eyebrows'),
                        ('eyelashes', 'eyelashes/eyelashes01/eyelashes01.mhclo', 'Eyelashes'), ('hair', 'hair/short02/short02.mhclo', 'Hair')] + outfit:
        try:
            o = HS.add_mhclo_asset(A(rel), h, asset_type=t, material_type='MAKESKIN')
            if t in ('Hair', 'Eyebrows') and o:
                grey(o)
        except Exception as e:
            print('eklenemedi', rel, e)
    h.location.x = x
    return h

SHOTS = [
    ('huseyin', [('clothes', 'clothes/male_worksuit01/male_worksuit01.mhclo', 'Clothes'), ('clothes', 'clothes/jujube_newsboy_cap/jujube_newsboy_cap.mhclo', 'Clothes')]),
]
os.makedirs(OUT, exist_ok=True)
world_hdri('qwantani_night_puresky', 0.05)
for i, (name, outfit) in enumerate(SHOTS):
    x = i * 5.0
    old_man(x, outfit)
    area((x - 1.4, -1.5, 2.2), (x, 0, 1.45), 110, 0.9, (1.0, 0.74, 0.48), name='key%d' % i)
    area((x + 1.2, 0.9, 2.1), (x, 0, 1.5), 120, 0.6, (0.5, 0.65, 1.0), name='rim%d' % i)
    area((x + 1.0, -1.6, 1.3), (x, 0, 1.4), 18, 1.5, (0.8, 0.85, 1.0), name='fill%d' % i)
for i, (name, _) in enumerate(SHOTS):
    x = i * 5.0
    sc.camera = camera((x + 0.08, -1.55, 1.36), (x, 0, 1.3), lens=50)
    render(f'{OUT}/{name}.png')
