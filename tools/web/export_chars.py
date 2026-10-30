# Rocketbox karakterlerini web için glb'ye çevirir: 1k dokular, seçili yüz şekilleri, hazır poz klipleri.
# Kullanım: python export_chars.py -- <çıkış klasörü>
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'render'))
from lib import *

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
KEEP = ('AA_VI_', 'AK_09_EyeBlinkLeft', 'AK_10_EyeBlinkRight', 'AK_44_MouthSmileLeft', 'AK_45_MouthSmileRight', 'AK_25_JawOpen',
        'AK_03_BrowInnerUp', 'AK_21_EyeWideLeft', 'AK_22_EyeWideRight', 'AK_19_EyeSquintLeft', 'AK_20_EyeSquintRight',
        'AK_30_MouthFrownLeft', 'AK_31_MouthFrownRight', 'AK_01_BrowDownLeft', 'AK_02_BrowDownRight')

BASE = dict(BASE_POSE)
SIT = {'L Thigh': (0, 0, 85), 'R Thigh': (0, 0, 85), 'L Calf': (0, 0, -88), 'R Calf': (0, 0, -88)}
CLIPS = {
    # ad: [(kare, poz sözlüğü), ...] — 30 kare/sn
    'idle': [(1, {}), (60, {'Spine1': (0, 0, -1.5), 'Spine2': (0, 0, -1), 'Head': (0, 0, 2), 'L Forearm': (0, 0, -15), 'R Forearm': (0, 0, -14)}), (120, {})],
    'lookup': [(1, LOOK_UP), (60, {**LOOK_UP, 'Spine1': (0, 0, -2)}), (120, LOOK_UP)],
    'point': [(1, {**LOOK_UP, **POINT_R}), (45, {**LOOK_UP, **POINT_R, 'R UpperArm': (75, 45, -110)}), (90, {**LOOK_UP, **POINT_R})],
    'armsup': [(1, {**LOOK_UP, 'L UpperArm': (-45, -60, -150), 'R UpperArm': (-45, 60, 150)}), (30, {**LOOK_UP, 'L UpperArm': (-45, -60, -140), 'R UpperArm': (-45, 60, 140)}), (60, {**LOOK_UP, 'L UpperArm': (-45, -60, -150), 'R UpperArm': (-45, 60, 150)})],
    'talk': [(1, {'R Forearm': (0, 0, -40)}), (20, {'R Forearm': (0, 0, -70), 'R UpperArm': (0, -30, -20), 'Head': (6, 0, 0)}),
             (45, {'R Forearm': (0, 0, -55), 'L Forearm': (0, 0, -45), 'Head': (-5, 0, 3)}), (70, {'R Forearm': (0, 0, -40)})],
    'sit': [(1, SIT), (60, {**SIT, 'Spine1': (0, 0, 2)}), (120, SIT)],
    'sit_tea': [(1, {**SIT, 'R Forearm': (0, 0, -100), 'R UpperArm': (0, -30, -15)}), (60, {**SIT, 'R Forearm': (0, 0, -105), 'R UpperArm': (0, -30, -18), 'Head': (0, 0, 4)}), (120, {**SIT, 'R Forearm': (0, 0, -100), 'R UpperArm': (0, -30, -15)})],
    'kneel': [(1, {'L Thigh': (0, 0, 95), 'L Calf': (0, 0, -100), 'R Thigh': (0, 0, 10), 'R Calf': (0, 0, -120), 'Spine1': (0, 0, 20), 'Head': (0, 0, 20), 'L Forearm': (0, 0, -60), 'R Forearm': (0, 0, -60)}),
              (60, {'L Thigh': (0, 0, 95), 'L Calf': (0, 0, -100), 'R Thigh': (0, 0, 10), 'R Calf': (0, 0, -120), 'Spine1': (0, 0, 22), 'Head': (0, 0, 22), 'L Forearm': (0, 0, -62), 'R Forearm': (0, 0, -62)})],
}
# yürüme döngüsü (30 kare)
W = []
for i, ph in enumerate((0, 0.25, 0.5, 0.75, 1.0)):
    a = math.sin(ph * 2 * math.pi)
    b = math.cos(ph * 2 * math.pi)
    W.append((1 + int(ph * 30), {
        'L Thigh': (0, 0, 24 * a), 'R Thigh': (0, 0, -24 * a),
        'L Calf': (0, 0, -8 - 30 * max(0, -b)), 'R Calf': (0, 0, -8 - 30 * max(0, b)),
        'L UpperArm': (0, 38, 14 * a), 'R UpperArm': (0, -38, 14 * a),
        'L Forearm': (0, 0, -25), 'R Forearm': (0, 0, -25), 'Spine1': (0, 0, 3), 'Pelvis': (0, 4 * a, 0),
    }))
CLIPS['walk'] = W
R = []
for i, ph in enumerate((0, 0.25, 0.5, 0.75, 1.0)):
    a = math.sin(ph * 2 * math.pi)
    b = math.cos(ph * 2 * math.pi)
    R.append((1 + int(ph * 20), {
        'L Thigh': (0, 0, 45 * a + 15), 'R Thigh': (0, 0, -45 * a + 15),
        'L Calf': (0, 0, -20 - 70 * max(0, -b)), 'R Calf': (0, 0, -20 - 70 * max(0, b)),
        'L UpperArm': (0, 45, 35 * a), 'R UpperArm': (0, -45, 35 * a),
        'L Forearm': (0, 0, -85), 'R Forearm': (0, 0, -85), 'Spine1': (0, 0, 10), 'Head': (0, 0, -6),
    }))
CLIPS['run'] = R


def key_pose(arm, frame, pose):
    p = dict(BASE)
    p.update(pose)
    for b in arm.pose.bones:
        b.rotation_mode = 'XYZ'
        b.rotation_euler = Euler((0, 0, 0))
    for k, (x, y, z) in p.items():
        b = arm.pose.bones.get('Bip01 ' + k)
        if b:
            b.rotation_euler = Euler((math.radians(x), math.radians(y), math.radians(z)))
    for b in arm.pose.bones:
        b.keyframe_insert('rotation_euler', frame=frame)


for who in sys.argv[sys.argv.index('--') + 1:-1] or ['arda', 'elif', 'mert', 'zeynep', 'kaan']:
    reset(preview=True)
    arm = person(who, loc=(0, 0, 0))
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    for me in meshes:
        for m in me.modifiers[:]:
            if m.type == 'SUBSURF':
                me.modifiers.remove(m)
        sk = me.data.shape_keys
        if sk:
            for kb in list(sk.key_blocks)[1:]:
                if not kb.name.startswith(KEEP):
                    me.shape_key_remove(kb)
            for kb in sk.key_blocks:
                kb.value = 0
        # glTF uyumlu malzemeler: SSS kapalı, opaklık için alfa kırpma
        for slot in me.material_slots:
            m = slot.material
            b = m.node_tree.nodes.get('Principled BSDF')
            b.inputs['Subsurface Weight'].default_value = 0
            if m.name.endswith('_opacity'):
                try:
                    m.surface_render_method = 'DITHERED'
                except Exception:
                    pass
    for img in bpy.data.images:
        if img.size[0] > 1024:
            img.scale(1024, 1024)
    # klipler
    arm.animation_data_create()
    for name, keys in CLIPS.items():
        act = bpy.data.actions.new(name)
        arm.animation_data.action = act
        for fr, pose in keys:
            key_pose(arm, fr, pose)
        tr = arm.animation_data.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, 1, act)
        arm.animation_data.action = None
    key_pose(arm, 1, {})
    for b in arm.pose.bones:
        b.rotation_euler = Euler((0, 0, 0))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=f'{OUT}/{who}.glb', export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='NLA_TRACKS', export_morph=True, export_morph_normal=False,
        export_skins=True, export_image_format='AUTO', export_jpeg_quality=82, export_yup=True,
        export_apply=False, export_force_sampling=True)
    print('OK', who, os.path.getsize(f'{OUT}/{who}.glb') // 1024, 'KB')
