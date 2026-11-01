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
def F(rel):
    p = os.path.join(ud, rel)
    if not os.path.exists(p):
        hits = [q for q in inv_all if rel.split('/')[-1] in q]
        p = os.path.join(ud, hits[0]) if hits else None
    chosen.setdefault('_', []).append((rel, p and os.path.relpath(p, ud)))
    return p
inv_all = [p for v in inv.values() for p in v]
def C(name, atype='Clothes', sub='clothes'):
    return (sub, F(f'{sub}/{name}/{name}.mhclo'), atype)
def grey_hair(h, tone=0.62):
    # saç malzemesini griye çek
    for o in h.children:
        if 'hair' in o.name.lower() or (o.get('mpfb_asset_type') or '').lower() == 'hair':
            for slot in o.material_slots:
                m = slot.material
                if not m or not m.node_tree: continue
                for n in m.node_tree.nodes:
                    if n.type == 'BSDF_PRINCIPLED':
                        for l in list(n.inputs['Base Color'].links):
                            hs = m.node_tree.nodes.new('ShaderNodeHueSaturation')
                            hs.inputs['Saturation'].default_value = 0.05
                            hs.inputs['Value'].default_value = 2.6
                            m.node_tree.links.new(l.from_socket, hs.inputs['Color'])
                            m.node_tree.links.new(hs.outputs['Color'], n.inputs['Base Color'])
                        if not n.inputs['Base Color'].links:
                            n.inputs['Base Color'].default_value = (tone, tone, tone * 0.97, 1)
eyes = ('eyes', F('eyes/high-poly/high-poly.mhclo'), 'Eyes')
brows = ('eyebrows', F('eyebrows/eyebrow001/eyebrow001.mhclo'), 'Eyebrows')
lash = ('eyelashes', F('eyelashes/eyelashes01/eyelashes01.mhclo'), 'Eyelashes')
anatolian = {'caucasian': 0.7, 'asian': 0.2, 'african': 0.1}
nine = human(-1.1, {'gender': 0.0, 'age': 1.0, 'weight': 0.75, 'muscle': 0.25, **anatolian},
      F('skins/onlytheghosts_old_eurasian_female/onlytheghosts_old_eurasian_female.mhmat'),
      [eyes, brows, lash, C('elvs_reverse_french_braid_bun', 'Hair', 'hair'), C('toigo_fisherman_sweater'), C('toigo_harem_pants'), C('toigo_flats')])
grey_hair(nine)
dede = human(-0.37, {'gender': 1.0, 'age': 1.0, 'weight': 0.55, 'muscle': 0.35, **anatolian},
      F('skins/old_caucasian_male/old_caucasian_male.mhmat'),
      [eyes, brows, lash, C('short02', 'Hair', 'hair'), C('male_worksuit01'), C('jujube_newsboy_cap'), C('shoes01')])
grey_hair(dede)
kom = human(0.37, {'gender': 1.0, 'age': 0.8, 'weight': 0.6, 'muscle': 0.5, **anatolian},
      F('skins/middleage_caucasian_male/middleage_caucasian_male.mhmat'),
      [eyes, brows, lash, C('short04', 'Hair', 'hair'), C('male_elegantsuit01'), C('fedora01'), C('shoes02')])
grey_hair(kom, 0.45)
genc = human(1.1, {'gender': 1.0, 'age': 0.5, 'weight': 0.5, 'muscle': 0.5, **anatolian},
      F('skins/young_caucasian_male/young_caucasian_male.mhmat'),
      [eyes, brows, lash, C('short02', 'Hair', 'hair'), C('toigo_fisherman_sweater'), C('toigo_wool_pants'), C('shoes03')])
chosen['skins'] = 'explicit'
json.dump(chosen, open(OUT + '/mh_secilen.json', 'w'), indent=1, default=str)
world_hdri('qwantani_night_puresky', 0.05)
plane('floor', (8, 8), (0, 0, 0), pbr('old_wooden_floor_02', 2))
area((-1.5, -2.5, 2.5), (0, 0, 1.2), 400, 2, (1, 0.85, 0.7))
area((2, 1.5, 2.2), (0, 0, 1.3), 250, 1, (0.6, 0.7, 1))
camera((0, -4.6, 1.25), (0, 0, 1.0), lens=38)
render(OUT + '/mh_deneme.png')
