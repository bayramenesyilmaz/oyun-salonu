# Kuşyolu, Karaçam Dosyaları, Karakuyu Bölüm 2 ve Hamal replikleri: Chatterbox Multilingual (MIT) ile Türkçe seslendirme.
# Erkek sesler Piper (CC0) referanslarından klonlanır, kadın sesler modelin kendi sesinden türetilir.
import os, sys, json, time, subprocess, traceback
import torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

GAME = sys.argv[1]
LINES = json.load(open(f'tools/tts/{GAME}_lines.json'))
OUT = f'tts-out/{GAME}'
os.makedirs(OUT, exist_ok=True)
os.makedirs('/tmp/ref', exist_ok=True)
torch.set_num_threads(os.cpu_count() or 4)
torch.manual_seed(7)
def _h(s):
    h = 0x811c9dc5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'
_retry = set(json.load(open(f'tools/tts/{GAME}_retry.json'))) if os.path.exists(f'tools/tts/{GAME}_retry.json') else set()
_todo = [i for i, (s_, t_) in enumerate(LINES) if i % int(os.environ.get('NSHARD', '1')) == int(os.environ.get('SHARD', '0')) and (not os.path.exists(f'{OUT}/{_h(s_ + "|" + t_)}.mp3') or _h(s_ + "|" + t_) in _retry)]
if not _todo:
    print(GAME, 'yapılacak replik yok')
    sys.exit(0)
model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')

def hash_line(s):
    h = 0x811c9dc5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'

def shift(src, dst, semis):
    r = 2 ** (semis / 12)
    subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af', f'asetrate=24000*{r:.4f},aresample=24000,atempo={1/r:.4f}', dst])

# referanslar
base = model.generate('Bu gece gökyüzü çok berrak. Yıldızları saymaya kalksan sabaha kadar bitmez, ama ben yine de denemek isterim.', language_id='tr')
ta.save('/tmp/ref/female.wav', base, model.sr)
shift('/tmp/ref/female.wav', '/tmp/ref/zeynep.wav', 2.0)
shift('tools/tts/ref/fahrettin.wav', '/tmp/ref/kaan.wav', 1.8)
shift('tools/tts/ref/fettah.wav', '/tmp/ref/mert.wav', -1.5)
shift('tools/tts/ref/fettah.wav', '/tmp/ref/polis.wav', -3.0)
shift('tools/tts/ref/fahrettin.wav', '/tmp/ref/bekci.wav', -4.5)
shift('/tmp/ref/female.wav', '/tmp/ref/kumru.wav', -1.0)
shift('tools/tts/ref/fettah.wav', '/tmp/ref/yusuf.wav', 0.8)
shift('tools/tts/ref/fahrettin.wav', '/tmp/ref/riza.wav', -3.0)
shift('tools/tts/ref/fahrettin.wav', '/tmp/ref/selim.wav', 0.6)
shift('/tmp/ref/female.wav', '/tmp/ref/nazmiye.wav', -3.0)
shift('/tmp/ref/female.wav', '/tmp/ref/hatice.wav', 0.6)
shift('/tmp/ref/female.wav', '/tmp/ref/gulsum.wav', 1.5)
shift('/tmp/ref/female.wav', '/tmp/ref/gulsum_cin.wav', -2.0)
shift('tools/tts/ref/fahrettin.wav', '/tmp/ref/huseyin.wav', -2.5)
shift('tools/tts/ref/fettah.wav', '/tmp/ref/kadir.wav', 0.8)
shift('/tmp/ref/female.wav', '/tmp/ref/nine.wav', -3.5)
shift('tools/tts/ref/fahrettin.wav', '/tmp/ref/kemal.wav', 1.2)
shift('tools/tts/ref/fettah.wav', '/tmp/ref/reis.wav', -2.8)
shift('tools/tts/ref/fahrettin.wav', '/tmp/ref/hayri.wav', -1.2)
shift('/tmp/ref/female.wav', '/tmp/ref/eleni.wav', -0.8)
shift('tools/tts/ref/fettah.wav', '/tmp/ref/nuri.wav', -0.5)
shift('/tmp/ref/female.wav', '/tmp/ref/nazife.wav', -2.6)
shift('/tmp/ref/female.wav', '/tmp/ref/leyla.wav', 0.8)
REFS = {'elif': '/tmp/ref/female.wav', 'zeynep': '/tmp/ref/zeynep.wav', 'arda': 'tools/tts/ref/fahrettin.wav', 'kaan': '/tmp/ref/kaan.wav', 'mert': '/tmp/ref/mert.wav',
        'polis': '/tmp/ref/polis.wav', 'bekci': '/tmp/ref/bekci.wav', 'kumru': '/tmp/ref/kumru.wav',
        'yusuf': '/tmp/ref/yusuf.wav', 'riza': '/tmp/ref/riza.wav', 'selim': '/tmp/ref/selim.wav', 'nazmiye': '/tmp/ref/nazmiye.wav', 'hatice': '/tmp/ref/hatice.wav',
        'gulsum': '/tmp/ref/gulsum.wav', 'gulsum_cin': '/tmp/ref/gulsum_cin.wav', 'huseyin': '/tmp/ref/huseyin.wav', 'kadir': '/tmp/ref/kadir.wav',
        'narrator': 'tools/tts/ref/fahrettin.wav', 'nine': '/tmp/ref/nine.wav', 'cin': '/tmp/ref/gulsum_cin.wav', 'death': '/tmp/ref/gulsum_cin.wav',
        'kemal': '/tmp/ref/kemal.wav', 'reis': '/tmp/ref/reis.wav', 'hayri': '/tmp/ref/hayri.wav', 'eleni': '/tmp/ref/eleni.wav', 'nuri': '/tmp/ref/nuri.wav', 'nazife': '/tmp/ref/nazife.wav', 'leyla': '/tmp/ref/leyla.wav'}
_CINFX = 'asetrate=24000*0.74,aresample=24000,atempo=1.25,aecho=0.8:0.6:60|130:0.5|0.35,lowpass=f=3400,'
FX = {'cin': _CINFX, 'death': _CINFX, 'gulsum_cin': 'asetrate=24000*0.78,aresample=24000,atempo=1.2,aecho=0.8:0.55:45|95:0.45|0.3,lowpass=f=3800,', 'kumru': 'highpass=f=180,aecho=0.8:0.5:12|24:0.25|0.15,chorus=0.6:0.8:30:0.3:0.2:1.5,', 'polis': '', 'bekci': ''}
SHARD = int(os.environ.get('SHARD', '0'))
NSHARD = int(os.environ.get('NSHARD', '1'))
retry = set(json.load(open(f'tools/tts/{GAME}_retry.json'))) if os.path.exists(f'tools/tts/{GAME}_retry.json') else set()
done = 0
for i, (s, t) in enumerate(LINES):
    if i % NSHARD != SHARD:
        continue
    h = hash_line(s + '|' + t)
    out = f'{OUT}/{h}.mp3'
    if os.path.exists(out) and h not in retry:
        continue
    excited = '!' in t
    try:
        t0 = time.time()
        if h in retry:
            torch.manual_seed(int(h[:6], 16) + int(os.environ.get('SALT', '13')))
        wav = model.generate(t, language_id='tr', audio_prompt_path=REFS.get(s), exaggeration=0.75 if excited else 0.5, cfg_weight=0.35 if excited else 0.5)
        ta.save('/tmp/line.wav', wav, model.sr)
        subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', '/tmp/line.wav', '-af', FX.get(s, '') + 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-17:TP=-1.5,apad=pad_dur=0.1', '-ac', '1', '-ar', '24000', '-b:a', '48k', out])
        done += 1
        print(s, h, round(time.time() - t0, 1), 's', flush=True)
    except Exception:
        traceback.print_exc()
json.dump({'voices': 'Chatterbox Multilingual (MIT); erkek referansları Piper tr_TR (CC0)', 'files': sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3'))}, open(f'{OUT}/manifest.json', 'w'))
print('bitti', done)
