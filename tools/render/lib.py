# Kuşyolu konsept görselleri için ortak Blender yardımcıları (bpy, Cycles).
import bpy, os, glob, math, random
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', 'assets-src'))
PH = ROOT + '/polyhaven'
RB = ROOT + '/rocketbox'


def reset(samples=128, w=1600, h=900, preview=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16 if preview else samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 8
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 3
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.cycles.sample_clamp_indirect = 8
    s = 0.35 if preview else 1.0
    sc.render.resolution_x = int(w * s)
    sc.render.resolution_y = int(h * s)
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    try:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        try:
            sc.view_settings.look = 'Medium High Contrast'
        except Exception:
            pass
    sc.render.threads_mode = 'AUTO'
    return sc


def world_hdri(hid, strength=1.0, rot=0.0, bg_strength=None):
    w = bpy.data.worlds.new('W')
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(f'{PH}/hdri/{hid}.hdr')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value[2] = rot
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    if bg_strength is None:
        bg = nt.nodes.new('ShaderNodeBackground')
        bg.inputs['Strength'].default_value = strength
        nt.links.new(env.outputs['Color'], bg.inputs['Color'])
        nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    else:
        # ışık ve kamera için ayrı güç
        b1 = nt.nodes.new('ShaderNodeBackground')
        b1.inputs['Strength'].default_value = strength
        b2 = nt.nodes.new('ShaderNodeBackground')
        b2.inputs['Strength'].default_value = bg_strength
        nt.links.new(env.outputs['Color'], b1.inputs['Color'])
        nt.links.new(env.outputs['Color'], b2.inputs['Color'])
        lp = nt.nodes.new('ShaderNodeLightPath')
        mx = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(lp.outputs['Is Camera Ray'], mx.inputs[0])
        nt.links.new(b1.outputs[0], mx.inputs[1])
        nt.links.new(b2.outputs[0], mx.inputs[2])
        nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return w


_tex_cache = {}


def pbr(tid, scale=1.0, tint=None, disp=0.0, rough_mul=1.0, name=None):
    key = (tid, scale, tint, disp, rough_mul)
    if key in _tex_cache:
        return _tex_cache[key]
    d = f'{PH}/tex/{tid}'
    m = bpy.data.materials.new(name or tid)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])

    def img(fname, color=True):
        f = glob.glob(f'{d}/{fname}.*')
        if not f:
            return None
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = bpy.data.images.load(f[0], check_existing=True)
        if not color:
            n.image.colorspace_settings.name = 'Non-Color'
        nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
        return n

    dif = img('diff')
    if dif:
        if tint:
            mx = nt.nodes.new('ShaderNodeMix')
            mx.data_type = 'RGBA'
            mx.blend_type = 'MULTIPLY'
            mx.inputs['Factor'].default_value = 1.0
            mx.inputs['B'].default_value = (*tint, 1)
            nt.links.new(dif.outputs['Color'], mx.inputs['A'])
            nt.links.new(mx.outputs['Result'], bsdf.inputs['Base Color'])
        else:
            nt.links.new(dif.outputs['Color'], bsdf.inputs['Base Color'])
    arm = img('arm', False)
    rough = img('rough', False)
    if arm:
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(arm.outputs['Color'], sep.inputs['Color'])
        mul = nt.nodes.new('ShaderNodeMath')
        mul.operation = 'MULTIPLY'
        mul.inputs[1].default_value = rough_mul
        nt.links.new(sep.outputs['Green'], mul.inputs[0])
        nt.links.new(mul.outputs[0], bsdf.inputs['Roughness'])
        nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    elif rough:
        nt.links.new(rough.outputs['Color'], bsdf.inputs['Roughness'])
    nor = img('nor', False)
    if nor:
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(nor.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if disp:
        dsp = img('disp', False)
        if dsp:
            dn = nt.nodes.new('ShaderNodeDisplacement')
            dn.inputs['Scale'].default_value = disp
            nt.links.new(dsp.outputs['Color'], dn.inputs['Height'])
            nt.links.new(dn.outputs['Displacement'], nt.nodes['Material Output'].inputs['Displacement'])
            m.displacement_method = 'BUMP'
    _tex_cache[key] = m
    return m


def simple(color, rough=0.5, metal=0.0, emit=None, strength=1.0, name='m', alpha=1.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def emission(color, strength, name='em'):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial')
    e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = (*color, 1)
    e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], o.inputs['Surface'])
    return m


_CUBE_V = [(-.5, -.5, -.5), (.5, -.5, -.5), (.5, .5, -.5), (-.5, .5, -.5), (-.5, -.5, .5), (.5, -.5, .5), (.5, .5, .5), (-.5, .5, .5)]
_CUBE_F = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]


def box(name, size, loc, mat=None, rot=(0, 0, 0), bevel=0.0, uv_scale=1.0):
    """Hızlı kutu (bpy.ops kullanmadan; binlerce nesnede yavaşlamasın)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([(v[0] * size[0], v[1] * size[1], v[2] * size[2]) for v in _CUBE_V], [], _CUBE_F)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.matrix_world = o.matrix_basis.copy()
    box_uv(o, uv_scale)
    if bevel:
        mod = o.modifiers.new('bev', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    if mat:
        me.materials.append(mat)
    return o


def box_uv(o, s=1.0):
    # dünya ölçülü küp izdüşümü UV (1 birim = 1 m doku tekrarı / s)
    import bmesh
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.verify()
    mw = o.matrix_world
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            p = mw @ l.vert.co
            if ax == 0:
                l[uv].uv = (p.y / s, p.z / s)
            elif ax == 1:
                l[uv].uv = (p.x / s, p.z / s)
            else:
                l[uv].uv = (p.x / s, p.y / s)
    bm.to_mesh(me)
    bm.free()


def plane(name, size, loc, mat=None, rot=(0, 0, 0), uv_scale=1.0):
    me = bpy.data.meshes.new(name)
    a, b = size[0] / 2, size[1] / 2
    me.from_pydata([(-a, -b, 0), (a, -b, 0), (a, b, 0), (-a, b, 0)], [], [(0, 1, 2, 3)])
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.matrix_world = o.matrix_basis.copy()
    box_uv(o, uv_scale)
    if mat:
        me.materials.append(mat)
    return o


def cyl(name, r, depth, loc, mat=None, rot=(0, 0, 0), n=20, r2=None):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    if mat:
        me.materials.append(mat)
    return o


def sphere(name, r, loc, mat=None, seg=24, scale=(1, 1, 1)):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.scale = scale
    if mat:
        me.materials.append(mat)
    return o


_model_cache = {}


def model(mid, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0, only=None):
    """Poly Haven glTF modelini içe aktarır, bir boş nesneye bağlar. Aynı model ikinci kez istenirse kopyalar."""
    if mid in _model_cache and only is None:
        src = _model_cache[mid]
        root = bpy.data.objects.new(mid, None)
        bpy.context.scene.collection.objects.link(root)
        for o in src:
            c = o.copy()
            bpy.context.scene.collection.objects.link(c)
            c.parent = root
        root.location = loc
        root.rotation_euler = rot
        root.scale = (scale,) * 3
        return root
    before = set(bpy.data.objects)
    f = glob.glob(f'{PH}/models/{mid}/*.gltf')[0]
    bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in before]
    if only is not None:
        for o in list(new):
            if o.type == 'MESH' and not any(o.name.startswith(k) for k in only):
                bpy.data.objects.remove(o, do_unlink=True)
        new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(mid, None)
    bpy.context.scene.collection.objects.link(root)
    tops = [o for o in new if o.parent is None or o.parent not in new]
    for o in tops:
        o.parent = root
    root.location = loc
    root.rotation_euler = rot
    root.scale = (scale,) * 3
    if only is None:
        _model_cache[mid] = tops
    return root


def piece(mid, name, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    """Modüler bir paketten tek bir parçayı kopyalar (kaynak paket gizli tutulur)."""
    key = '__pack_' + mid
    if key not in _model_cache:
        before = set(bpy.data.objects)
        f = glob.glob(f'{PH}/models/{mid}/*.gltf')[0]
        bpy.ops.import_scene.gltf(filepath=f)
        new = [o for o in bpy.data.objects if o not in before]
        col = bpy.data.collections.new('pack_' + mid)
        for o in new:
            for c in o.users_collection:
                c.objects.unlink(o)
            col.objects.link(o)
            o.hide_render = True
        _model_cache[key] = {o.name: o for o in new}
    src = _model_cache[key][name]
    c = bpy.data.objects.new(name + '_i', src.data)
    bpy.context.scene.collection.objects.link(c)
    c.location = loc
    c.rotation_euler = rot
    c.scale = (scale,) * 3
    return c


# ---------------- insanlar (Microsoft Rocketbox, MIT) ----------------
def person(who, loc=(0, 0, 0), rot_z=0.0, pose=None, face=None, facial=True):
    d = f'{RB}/{who}'
    fbx = sorted(glob.glob(d + ('/*_facial.fbx' if facial else '/*.fbx')))
    fbx = [f for f in fbx if facial or not f.endswith('_facial.fbx')][0]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=fbx)
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    meshes = [o for o in new if o.type == 'MESH']
    # FBX'teki anahtar kareler konum ve pozu ezmesin
    arm.animation_data_clear()
    for me in meshes:
        me.animation_data_clear()
        if me.data.shape_keys:
            me.data.shape_keys.animation_data_clear()
    # dokuları yeniden bağla
    for me in meshes:
        for slot in me.material_slots:
            m = slot.material
            if not m or m.get('fixed'):
                continue
            nt = m.node_tree
            bsdf = nt.nodes.get('Principled BSDF')
            for n in nt.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    base = os.path.splitext(os.path.basename(n.image.filepath.replace('\\', '/')))[0]
                    f = glob.glob(f'{d}/Textures/{base}.*')
                    if f:
                        n.image = bpy.data.images.load(f[0], check_existing=True)
                        if 'normal' in base or 'specular' in base:
                            n.image.colorspace_settings.name = 'Non-Color'
            if bsdf:
                for l in list(bsdf.inputs['Specular IOR Level'].links):
                    nt.links.remove(l)
                bsdf.inputs['Specular IOR Level'].default_value = 0.38
                if m.name.endswith('_head'):
                    bsdf.inputs['Roughness'].default_value = 0.6
                    bsdf.inputs['Subsurface Weight'].default_value = 0.22
                    bsdf.inputs['Subsurface Radius'].default_value = (1.0, 0.35, 0.2)
                    bsdf.inputs['Subsurface Scale'].default_value = 0.012
                elif m.name.endswith('_body'):
                    bsdf.inputs['Roughness'].default_value = 0.72
                    bsdf.inputs['Subsurface Weight'].default_value = 0.04
                    bsdf.inputs['Subsurface Scale'].default_value = 0.01
                elif m.name.endswith('_opacity'):
                    bsdf.inputs['Roughness'].default_value = 0.55
                    # saç/kirpik: alfa kanalını doğrudan dokudan al
                    for n in nt.nodes:
                        if n.type == 'TEX_IMAGE':
                            for l in list(n.outputs['Color'].links):
                                if l.to_socket.name == 'Alpha':
                                    nt.links.remove(l)
                                    nt.links.new(n.outputs['Alpha'], bsdf.inputs['Alpha'])
                for n in nt.nodes:
                    if n.type == 'NORMAL_MAP':
                        n.inputs['Strength'].default_value = 0.9
            m['fixed'] = True
        mod = me.modifiers.new('sub', 'SUBSURF')  # armatürden sonra: deri yumuşar
        mod.levels = 0
        mod.render_levels = 1
        if hasattr(me.data, 'shade_smooth'):
            me.data.shade_smooth()
        if face and me.data.shape_keys:
            kb = me.data.shape_keys.key_blocks
            for k, v in face.items():
                for kk in kb:
                    if k in kk.name:
                        kk.value = v
    arm.location = arm.location + Vector(loc)
    arm.rotation_euler = (arm.rotation_euler.x, arm.rotation_euler.y, arm.rotation_euler.z + rot_z)
    pose_person(arm, pose or {})
    return arm


BASE_POSE = {
    'L UpperArm': (0, 38, 0), 'R UpperArm': (0, -38, 0),
    'L Forearm': (0, 0, -12), 'R Forearm': (0, 0, -12),
}


def pose_person(arm, pose):
    p = dict(BASE_POSE)
    p.update(pose)
    for k, (x, y, z) in p.items():
        b = arm.pose.bones.get('Bip01 ' + k)
        if not b:
            continue
        b.rotation_mode = 'XYZ'
        b.rotation_euler = Euler((math.radians(x), math.radians(y), math.radians(z)))
    bpy.context.view_layer.update()


def camera(loc, look, lens=35, name='Cam', dof=None, fstop=2.8, sensor=36):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = sensor
    c = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(c)
    c.location = loc
    d = Vector(look) - Vector(loc)
    c.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if dof:
        cd.dof.use_dof = True
        cd.dof.focus_distance = dof
        cd.dof.aperture_fstop = fstop
    bpy.context.scene.camera = c
    return c


def point(loc, power, color=(1, 0.8, 0.6), radius=0.1, name='L'):
    ld = bpy.data.lights.new(name, 'POINT')
    ld.energy = power
    ld.color = color
    ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return o


def area(loc, look, power, size=1.0, color=(1, 1, 1), name='A', size_y=None):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy = power
    ld.color = color
    ld.size = size
    if size_y:
        ld.shape = 'RECTANGLE'
        ld.size_y = size_y
    o = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    d = Vector(look) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o


def spot(loc, look, power, angle=40, blend=0.4, color=(1, 1, 1), radius=0.05, name='S'):
    ld = bpy.data.lights.new(name, 'SPOT')
    ld.energy = power
    ld.color = color
    ld.spot_size = math.radians(angle)
    ld.spot_blend = blend
    ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    d = Vector(look) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o


def render(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


# hazır pozlar (Rocketbox Bip01 iskeleti; eksenler denemeyle bulundu)
LOOK_UP = {'Head': (0, 0, -28), 'Neck': (0, 0, -12), 'Spine2': (0, 0, -6)}
POINT_R = {'R UpperArm': (75, 45, -105), 'R Forearm': (0, 0, -5)}


def compositor_glare(threshold=1.0, size=0.7, strength=0.5, kind='Bloom'):
    """Parlak ışıklara ışıma (Blender 5 birleştirici düğümleri)."""
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new('Comp', 'CompositorNodeTree')
    sc.compositing_node_group = ng
    rl = ng.nodes.new('CompositorNodeRLayers')
    gl = ng.nodes.new('CompositorNodeGlare')
    out = ng.nodes.new('NodeGroupOutput')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    gl.inputs['Type'].default_value = kind
    gl.inputs['Quality'].default_value = 'High'
    gl.inputs['Threshold'].default_value = threshold
    gl.inputs['Strength'].default_value = strength
    gl.inputs['Size'].default_value = size
    ng.links.new(rl.outputs['Image'], gl.inputs['Image'])
    ng.links.new(gl.outputs['Image'], out.inputs[0])
    return gl
