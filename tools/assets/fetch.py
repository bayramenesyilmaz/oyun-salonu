# manifest.json'daki varlıkları indirir: assets-src/<kaynak>/<id>/...
# Yalnızca eksik dosyaları indirir. Lisanslar: Poly Haven CC0, Microsoft Rocketbox MIT.
import json, os, sys, urllib.request, subprocess, shutil, glob
UA = {'User-Agent': 'oyun-salonu-varlik-botu/1.0 (github.com/bayramenesyilmaz/oyun-salonu)'}
ROOT = 'assets-src'
M = json.load(open('tools/assets/manifest.json'))
credits = []

def get_json(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120))

def dl(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r, open(path + '.part', 'wb') as f:
        shutil.copyfileobj(r, f)
    os.rename(path + '.part', path)

ph = M['polyhaven']
for hid in ph['hdris']['ids']:
    f = get_json(f'https://api.polyhaven.com/files/{hid}')
    u = f['hdri'][ph['hdris']['res']]['hdr']['url']
    dl(u, f'{ROOT}/polyhaven/hdri/{hid}.hdr')
    credits.append(('Poly Haven', 'HDRI', hid, 'CC0'))
for hid in ph.get('hdris_web', {}).get('ids', []):
    f = get_json(f'https://api.polyhaven.com/files/{hid}')
    r = ph['hdris_web']['res']
    dl(f['hdri'][r]['hdr']['url'], f'{ROOT}/polyhaven/hdri/{hid}_{r}.hdr')
for tid in ph['textures']['ids']:
    f = get_json(f'https://api.polyhaven.com/files/{tid}')
    res = ph['textures']['res']
    for key, name in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough'), ('AO', 'ao'), ('Displacement', 'disp'), ('arm', 'arm'), ('Metal', 'metal')]:
        if key in f and res in f[key]:
            fmt = 'jpg' if 'jpg' in f[key][res] else 'png'
            dl(f[key][res][fmt]['url'], f'{ROOT}/polyhaven/tex/{tid}/{name}.{fmt}')
    credits.append(('Poly Haven', 'doku', tid, 'CC0'))
for mid in ph['models']['ids']:
    try:
        f = get_json(f'https://api.polyhaven.com/files/{mid}')
        g = f['gltf'][ph['models']['res']]['gltf']
        base = f'{ROOT}/polyhaven/models/{mid}'
        dl(g['url'], f'{base}/{os.path.basename(g["url"])}')
        for p, inc in g.get('include', {}).items():
            dl(inc['url'], f'{base}/{p}')
        credits.append(('Poly Haven', 'model', mid, 'CC0'))
    except Exception as e:
        print('MODEL HATA', mid, e)

# Rocketbox (MIT): seçilen avatarlar; TGA dokular 2k JPG/PNG'ye çevrilir
rb = M.get('rocketbox', {})
if rb:
    tmp = '/tmp/rocketbox'
    if not os.path.exists(tmp):
        subprocess.check_call(['git', 'clone', '-q', '--depth', '1', '--filter=blob:none', '--sparse', 'https://github.com/microsoft/Microsoft-Rocketbox.git', tmp])
    subprocess.check_call(['git', '-C', tmp, 'sparse-checkout', 'set', '--no-cone'] + [f'/Assets/Avatars/{p}/' for p in rb.values()])
    from PIL import Image
    for name, p in rb.items():
        src = f'{tmp}/Assets/Avatars/{p}'
        dst = f'{ROOT}/rocketbox/{name}'
        os.makedirs(dst + '/Textures', exist_ok=True)
        for fbx in glob.glob(src + '/Export/*.fbx'):
            shutil.copy(fbx, dst + '/' + os.path.basename(fbx))
        for t in glob.glob(src + '/Textures/*.tga'):
            out = dst + '/Textures/' + os.path.basename(t)[:-4]
            im = Image.open(t)
            if 'opacity' in t:
                im.save(out + '.png', optimize=True)
            else:
                im.convert('RGB').save(out + '.jpg', quality=90)
        shutil.copy(src + '/' + os.path.basename(p) + '.png', dst + '/preview.png')
        credits.append(('Microsoft Rocketbox', 'insan modeli', f'{name} ({p})', 'MIT'))

os.makedirs(ROOT, exist_ok=True)
with open(f'{ROOT}/CREDITS.md', 'w') as f:
    f.write('# Varlık kaynakları ve lisanslar\n\n| Kaynak | Tür | Ad | Lisans |\n|---|---|---|---|\n')
    for c in credits:
        f.write('| ' + ' | '.join(c) + ' |\n')
    f.write('\nMicrosoft Rocketbox: Copyright (c) 2020 Microsoft, MIT lisansı. Poly Haven: CC0 (kamu malı).\n')
print('tamam', len(credits))
