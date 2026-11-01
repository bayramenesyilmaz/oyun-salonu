# MPFB2 ile deneme karakterleri: yaşlı kadın, yaşlı adam, genç adam. Envanterden anahtar kelimeyle varlık seçer.
import bpy, sys, os, glob, json, importlib, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'render'))
OUT = sys.argv[-1]
import lib
from lib import world_hdri, area, camera, render, plane, pbr
from mathutils import Vector
lib.reset(samples=64, w=1500, h=900)
bpy.context.preferences.extensions if hasattr(bpy.context.preferences, 'extensions') else None
try:
    bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')
except Exception as e:
    print('enable', e)
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
inv = json.load(open(OUT + '/mh_envanter.json'))
def pick(sub, *words, avoid=()):
    ext = '.mhmat' if sub == 'skins' else '.mhclo'
    for p in inv.get(sub, []):
        n = p.lower()
        if not n.endswith(ext):
            continue
        if all(w in n for w in words) and not any(a in n for a in avoid):
            return os.path.join(ud, p)
    return None
def human(x, macro, skin, assets):
    h = HS.create_human()
    for k, v in macro.items():
        HOP.set_value(k, v, entity_reference=h)
    TS.reapply_macro_details(h)
    if skin:
        HS.set_character_skin(skin, h, skin_type='ENHANCED_SSS')
    for sub, path, atype in assets:
        if path:
            try:
                HS.add_mhclo_asset(path, h, asset_type=atype, material_type='MAKESKIN')
            except Exception as e:
                print('varlık eklenemedi', path, e)
    h.location.x = x
    return h
chosen = {}
def A(sub, *w, atype='Clothes', avoid=()):
    p = pick(sub, *w, avoid=avoid)
    chosen.setdefault('_', []).append((sub, w, p and os.path.relpath(p, ud)))
    return (sub, p, atype)
eyes = A('eyes', 'high', atype='Eyes') if pick('eyes', 'high') else A('eyes', '.mhclo', atype='Eyes')
brows = A('eyebrows', 'eyebrow001', atype='Eyebrows')
lash = A('eyelashes', '.mhclo', atype='Eyelashes')
women_skin = pick('skins', 'old', 'female') or pick('skins', 'female')
men_skin = pick('skins', 'old', 'male', avoid=('female',)) or pick('skins', 'male', avoid=('female',))
young_skin = pick('skins', 'young', 'male', avoid=('female',)) or men_skin
chosen['skins'] = [women_skin, men_skin, young_skin]
human(-0.75, {'gender': 0.0, 'age': 0.95, 'weight': 0.65, 'muscle': 0.3, 'caucasian': 0.8, 'asian': 0.1, 'african': 0.1}, women_skin,
      [eyes, brows, lash, A('hair', 'bun') if pick('hair', 'bun') else A('hair', 'short', avoid=('male',), atype='Hair'), A('clothes', 'dress', avoid=('flapper',)), A('clothes', 'shoe', avoid=('heel', 'overknee', 'boot'))])
human(0.0, {'gender': 1.0, 'age': 0.95, 'weight': 0.55, 'muscle': 0.4, 'caucasian': 0.8, 'asian': 0.1, 'african': 0.1}, men_skin,
      [eyes, brows, lash, A('hair', 'short', atype='Hair'), A('clothes', 'suit', avoid=('female',)), A('clothes', 'shoe', avoid=('heel', 'female', 'overknee', 'boot'))])
human(0.75, {'gender': 1.0, 'age': 0.5, 'weight': 0.5, 'muscle': 0.5, 'caucasian': 0.75, 'asian': 0.15, 'african': 0.1}, young_skin,
      [eyes, brows, lash, A('hair', 'short', atype='Hair'), A('clothes', 'shirt', avoid=('female',)), A('clothes', 'pants', avoid=('female',)), A('clothes', 'shoe', avoid=('heel', 'female', 'overknee', 'boot'))])
json.dump(chosen, open(OUT + '/mh_secilen.json', 'w'), indent=1, default=str)
world_hdri('qwantani_night_puresky', 0.05)
plane('floor', (8, 8), (0, 0, 0), pbr('old_wooden_floor_02', 2))
area((-1.5, -2.5, 2.5), (0, 0, 1.2), 400, 2, (1, 0.85, 0.7))
area((2, 1.5, 2.2), (0, 0, 1.3), 250, 1, (0.6, 0.7, 1))
camera((0, -4.2, 1.15), (0, 0, 0.95), lens=40)
render(OUT + '/mh_deneme.png')
