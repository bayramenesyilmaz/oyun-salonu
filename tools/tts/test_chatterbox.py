# Chatterbox Multilingual (MIT) ile Türkçe deneme: varsayılan ses + Piper referanslı klonlar.
import os, sys, time, traceback
import torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
torch.set_num_threads(os.cpu_count() or 4)
os.makedirs('tts-test', exist_ok=True)
t0 = time.time()
model = ChatterboxMultilingualTTS.from_pretrained(device='cpu')
print('model yüklendi', round(time.time() - t0, 1), 's', flush=True)
LINES = {
    'elif': 'Bakın! Gökyüzüne bakın! O ne öyle, yıldız mı kayıyor?',
    'kaan': 'Abi bu yıldız değil, bu düşüyor! Bizim tarafa düşüyor!',
    'mert': 'Herkes sakin olsun. Ses gelecek, kulaklarınızı kapatın.',
    'arda': 'Arazinin oraya düştü. Hadi, polis gelmeden önce biz bakalım.',
}
REFS = {'elif': None, 'zeynep': None, 'kaan': 'tools/tts/ref/fahrettin.wav', 'mert': 'tools/tts/ref/fettah.wav', 'arda': 'tools/tts/ref/fahrettin.wav'}
for who, text in LINES.items():
    for variant in ('ref', 'default'):
        ref = REFS.get(who) if variant == 'ref' else None
        if variant == 'ref' and ref is None:
            continue
        try:
            t = time.time()
            kw = dict(language_id='tr')
            if ref:
                kw['audio_prompt_path'] = ref
            wav = model.generate(text, **kw)
            ta.save(f'tts-test/{who}_{variant}.wav', wav, model.sr)
            print(who, variant, 'ok', round(time.time() - t, 1), 's', flush=True)
        except Exception:
            traceback.print_exc()
