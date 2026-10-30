# Kuşyolu replikleri: Chatterbox Multilingual (MIT) ile Türkçe seslendirme.
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
REFS = {'elif': '/tmp/ref/female.wav', 'zeynep': '/tmp/ref/zeynep.wav', 'arda': 'tools/tts/ref/fahrettin.wav', 'kaan': '/tmp/ref/kaan.wav', 'mert': '/tmp/ref/mert.wav'}
retry = set(json.load(open(f'tools/tts/{GAME}_retry.json'))) if os.path.exists(f'tools/tts/{GAME}_retry.json') else set()
done = 0
for s, t in LINES:
    h = hash_line(s + '|' + t)
    out = f'{OUT}/{h}.mp3'
    if os.path.exists(out) and h not in retry:
        continue
    excited = '!' in t
    try:
        t0 = time.time()
        if h in retry:
            torch.manual_seed(int(h[:6], 16))
        wav = model.generate(t, language_id='tr', audio_prompt_path=REFS.get(s), exaggeration=0.75 if excited else 0.5, cfg_weight=0.35 if excited else 0.5)
        ta.save('/tmp/line.wav', wav, model.sr)
        subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', '/tmp/line.wav', '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-17:TP=-1.5,apad=pad_dur=0.1', '-ac', '1', '-ar', '24000', '-b:a', '48k', out])
        done += 1
        print(s, h, round(time.time() - t0, 1), 's', flush=True)
    except Exception:
        traceback.print_exc()
json.dump({'voices': 'Chatterbox Multilingual (MIT); erkek referansları Piper tr_TR (CC0)', 'files': sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3'))}, open(f'{OUT}/manifest.json', 'w'))
print('bitti', done)
