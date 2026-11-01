# MPFB2'yi (GPLv3 kod, CC0 varlıklar) bpy içine kurar, CC0 paketlerini açar, içerik listesini yazar.
import bpy, sys, os, glob, json, zipfile, importlib
ZIP, PACKS, OUT = sys.argv[-3], sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.extensions.package_install_files(filepath=ZIP, repo='user_default', enable_on_install=True)
def dyn(p, k):
    for m in list(sys.modules):
        if m.endswith(p):
            return getattr(importlib.import_module(m), k)
    raise ValueError(p)
LocationService = dyn('mpfb.services.locationservice', 'LocationService')
ud = LocationService.get_user_data()
os.makedirs(ud, exist_ok=True)
for z in sorted(glob.glob(PACKS + '/*.zip')):
    with zipfile.ZipFile(z) as f:
        f.extractall(ud)
    print('açıldı', os.path.basename(z))
inv = {}
for sub in ('skins', 'clothes', 'hair', 'eyebrows', 'eyelashes', 'eyes', 'proxymeshes'):
    inv[sub] = sorted(os.path.relpath(p, ud) for p in glob.glob(f'{ud}/{sub}/**/*.mh*', recursive=True) if p.endswith(('.mhclo', '.mhmat', '.proxy')))
os.makedirs(OUT, exist_ok=True)
json.dump(inv, open(OUT + '/mh_envanter.json', 'w'), indent=1)
print({k: len(v) for k, v in inv.items()})
