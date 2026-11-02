# Bölüm 6–7: Leylek'in dış modeli (uzayda ve Ay'a inişte dış kamera için). Çıktı: <klasör>/leylek.glb, leylek.json
# Blender: burun +X, sağ -Y, yukarı +Z  ->  three: burun +X, yukarı +Y
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'render'))
sys.path.insert(0, HERE)
import lib
from lib import *
import weblib
from weblib import to_three
import leylek

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
reset(preview=True)
weblib.COLLIDERS.clear()
weblib.patch_lib_for_web()
ship = leylek.build(loc=(0, 0, 0), rz=0.0, glow=True)
GROUP = {}
for o in ship.children:
    base = o.name.split('.')[0]
    GROUP[o.name] = '!bell' if base == 'bellin' else 'static'
weblib.merge_groups(lambda o: GROUP.get(o.name, 'static'))
weblib.export_glb(f'{OUT}/leylek.glb')
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in bpy.data.objects if o.type == 'MESH' for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
weblib.write_meta(f'{OUT}/leylek.json', {
    'min': to_three(tuple(mn)), 'max': to_three(tuple(mx)),
    'engines': [to_three((-5.45, dy, dz)) for dy, dz in [(0.62, 0.35), (-0.62, 0.35), (0, -0.55)]],
    'nose': to_three((4.6, 0, 0)),
    'cockpit': to_three((3.0, 0, 0.75)),
})
