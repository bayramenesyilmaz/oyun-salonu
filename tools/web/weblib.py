# Web (three.js) için sahne dışa aktarma yardımcıları.
import bpy, os, json, glob, math
import numpy as np
from mathutils import Vector
import lib
from lib import PH

_web_cache = {}


def tinted_image(path, tint, size=1024):
    key = (path, tint, size)
    if key in _web_cache:
        return _web_cache[key]
    img = bpy.data.images.load(path, check_existing=False)
    if img.size[0] > size:
        img.scale(size, size)
    if tint:
        px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
        px[:, 0] *= tint[0]
        px[:, 1] *= tint[1]
        px[:, 2] *= tint[2]
        img.pixels.foreach_set(px.ravel())
        img.update()
    img.name = os.path.basename(os.path.dirname(path)) + ('_t%d%d%d' % tuple(int(t * 9) for t in tint) if tint else '')
    img.pack()
    _web_cache[key] = img
    return img


def webmat(tid, scale=1.0, tint=None, name=None, size=1024, rough=None):
    """glTF dışa aktarıcının tanıdığı yalın PBR malzeme (renk tonu dokuya işlenir)."""
    key = ('m', tid, scale, tint, size, rough)
    if key in _web_cache:
        return _web_cache[key]
    d = f'{PH}/tex/{tid}'
    m = bpy.data.materials.new(name or tid)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, 1)
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])

    def tex(fn, color=True, tint_=None):
        f = glob.glob(f'{d}/{fn}.*')
        if not f:
            return None
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = tinted_image(f[0], tint_, size)
        if not color:
            n.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
        return n
    dif = tex('diff', True, tint)
    if dif:
        nt.links.new(dif.outputs['Color'], b.inputs['Base Color'])
    arm = tex('arm', False)
    if arm:
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(arm.outputs['Color'], sep.inputs['Color'])
        if rough is None:
            nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
        else:
            b.inputs['Roughness'].default_value = rough
        nt.links.new(sep.outputs['Blue'], b.inputs['Metallic'])
    nor = tex('nor', False)
    if nor:
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(nor.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    _web_cache[key] = m
    return m


def patch_lib_for_web():
    """lib.pbr çağrılarını web malzemesine yönlendir (mahalle.py aynen kullanılabilsin)."""
    def pbr(tid, scale=1.0, tint=None, disp=0.0, rough_mul=1.0, name=None):
        return webmat(tid, scale, tint, name)
    lib.pbr = pbr
    return pbr


COLLIDERS = []


def collider(o, kind='box', pad=0.0):
    """Nesnenin dünya AABB'sini çarpışma kutusu olarak kaydet (three.js koordinatına çevrilir)."""
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    if o.type == 'EMPTY':
        pts = []
        for c in o.children_recursive:
            if c.type == 'MESH':
                pts += [c.matrix_world @ Vector(v) for v in c.bound_box]
    if not pts:
        return
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (mn + mx) / 2
    s = (mx - mn) / 2 + Vector((pad, pad, pad))
    # Blender (x, y, z) -> three (x, z, -y)
    COLLIDERS.append({'c': [round(c.x, 3), round(c.z, 3), round(-c.y, 3)], 'h': [round(s.x, 3), round(s.z, 3), round(s.y, 3)]})


def to_three(v):
    return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]


def merge_by_material():
    """Aynı malzemeyi kullanan durağan ağları birleştir (çizim çağrısı azalır)."""
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render and not o.get('keep')]
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.make_single_user(object=True, obdata=True)
    # üst nesne bağını kopar, dönüşümleri uygula
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    groups = {}
    for o in meshes:
        key = tuple(s.material.name if s.material else '' for s in o.material_slots)
        groups.setdefault(key, []).append(o)
    out = []
    for key, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        objs[0].name = 'm_' + (key[0] if key else 'none')
        out.append(objs[0])
    return out


def export_glb(path, size_limit=1024):
    for img in bpy.data.images:
        if img.size[0] > size_limit:
            img.scale(size_limit, size_limit)
    for o in bpy.context.scene.objects:
        o.select_set(o.type == 'MESH')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_image_format='AUTO',
                              export_jpeg_quality=80, export_yup=True, export_apply=True, export_lights=False,
                              export_cameras=False, export_animations=False)
    print('GLB', path, os.path.getsize(path) // 1024, 'KB')


def write_meta(path, meta):
    meta['colliders'] = COLLIDERS
    json.dump(meta, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))


def web_simplify(M):
    """Web sürümü: binalardaki klimalar basit kutu, silindirler az kenarlı."""
    from lib import box, simple, model
    AC = simple((0.82, 0.82, 0.8), 0.5, 0.2, name='acbox')
    GR = simple((0.15, 0.15, 0.16), 0.6, 0.3, name='acgrill')

    def model_web(mid, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0, only=None):
        if mid == 'exterior_aircon_unit':
            c = math.cos(rot[2])
            b = box('ac', (0.8 * scale, 0.3 * scale, 0.55 * scale), (loc[0], loc[1], loc[2] + 0.28 * scale), AC, rot=rot)
            box('acg', (0.42 * scale, 0.02, 0.42 * scale), (loc[0], loc[1] - c * 0.16, loc[2] + 0.28 * scale), GR, rot=rot)
            return b
        return model(mid, loc, rot, scale, only)
    M.model = model_web
    _cyl = M.cyl
    M.cyl = lambda name, r, depth, loc, mat=None, rot=(0, 0, 0), n=20, r2=None: _cyl(name, r, depth, loc, mat, rot, min(n, 12), r2)


def fonts_to_mesh():
    for o in list(bpy.context.scene.objects):
        if o.type == 'FONT':
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')


def merge_groups(group_of):
    """Ağları (grup, malzeme) çiftine göre birleştir; grup adı nesne adının önüne yazılır."""
    fonts_to_mesh()
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render]
    groups = {o.name: group_of(o) for o in meshes}
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.make_single_user(object=True, obdata=True)
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    buckets = {}
    for o in meshes:
        g = groups[o.name]
        mat = tuple(s.material.name if s.material else '' for s in o.material_slots)
        buckets.setdefault((g, mat), []).append(o)
    out = []
    for (g, mat), objs in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1 and not g.startswith('!'):
            bpy.ops.object.join()
            objs = objs[:1]
        for i, o in enumerate(objs):
            o.name = (g.lstrip('!') + '__' + (mat[0] if mat else 'none')) + (f'_{i}' if i else '')
            out.append(o)
    return out
