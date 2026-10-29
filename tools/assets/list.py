# Poly Haven ve diğer kaynakların içerik listelerini çıkarır (seçim yapmak için).
import json, urllib.request, os, subprocess
UA = {'User-Agent': 'oyun-salonu-varlik-botu/1.0 (github.com/bayramenesyilmaz/oyun-salonu)'}
def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))
os.makedirs('tools/assets/out', exist_ok=True)
out = {}
for t in ['hdris', 'textures', 'models']:
    d = get(f'https://api.polyhaven.com/assets?t={t}')
    out[t] = {k: {'name': v.get('name'), 'cat': v.get('categories'), 'tags': v.get('tags', [])[:8]} for k, v in d.items()}
json.dump(out, open('tools/assets/out/polyhaven.json', 'w'), ensure_ascii=False, indent=0)
print({k: len(v) for k, v in out.items()})
