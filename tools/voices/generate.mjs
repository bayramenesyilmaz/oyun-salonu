// Oyun repliklerini doğal Türkçe sesle (Piper, sherpa-onnx) önceden seslendirir → public/voices/<oyun>/<özet>.mp3
// Kullanım:
//   NODE_PATH=<sherpa-onnx-node@1.12 kurulu node_modules> VOICES=<ses modelleri klasörü> node tools/voices/generate.mjs [oyun]
// Ses modelleri: k2-fsa/sherpa-onnx "tts-models" sürümündeki vits-piper-tr_TR-fahrettin-medium ve -fettah-medium (CC0 veri kümesi).
// Yalnızca yeni/değişen replikler üretilir; artık kullanılmayan dosyalar silinir.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const sherpa = require('sherpa-onnx-node');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VOICES = process.env.VOICES || '/home/claude/voices/dl/x';
const only = process.argv[2];

// ---- aynı özet fonksiyonu (src/engine/voicebank.js) ----
function hashLine(s) {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

// ---- ses ayarları: model, hız, perde (yarım ton), efekt ----
// Kadın ve çocuk rolleri için Türkçe CC0 kadın sesi olmadığından erkek sesin perdesi yükseltilir.
const V = (voice, speed = 1, pitch = 0, fx = null) => ({ voice, speed, pitch, fx });
const CAST = {
  karakol: {
    arslan: V('fettah', 1.0, 0),
    kemal: V('fahrettin', 1.05, 0),
    selim: V('fahrettin', 0.95, -2.5, 'radio'),
    hasan: V('fettah', 0.88, -3),
    karakol: V('fettah', 1.05, -1, 'radio'),
    dusman: V('fahrettin', 1.1, -4),
    zehra: V('fettah', 0.9, 4.5),
    ayse: V('fahrettin', 1.0, 8),
    yusuf: V('fahrettin', 0.85, -3.5),
    seher: V('fahrettin', 1.0, 5),
    murat: V('fettah', 1.0, 1.5),
    rehine: V('fahrettin', 1.0, 2),
  },
  keci: {
    anlatici: V('fettah', 0.98, 0),
    cafer: V('fahrettin', 1.02, -2),
    riza: V('fettah', 1.1, -1),
    fadime: V('fahrettin', 1.05, 5),
    muhtar: V('fettah', 0.92, -3.5),
    gelin: V('fettah', 1.0, 5.5),
    damat: V('fahrettin', 1.12, 1),
    cocuk: V('fahrettin', 1.12, 8.5),
  },
  evsahibi: {
    anlatici: V('fettah', 0.98, 0),
    cingoz: V('fahrettin', 1.12, 4),
    necmi: V('fettah', 0.98, -2.5),
    defne: V('fahrettin', 1.05, 8),
    usta: V('fahrettin', 1.0, -1),
  },
  radyo: {
    ali: V('fettah', 1.04, 1, 'oldradio'),
    ali77: V('fettah', 1.02, 0, 'oldradio'),
    baba: V('fahrettin', 0.9, -3.5, 'oldradio'),
    spiker: V('fahrettin', 0.98, -1, 'oldradio'),
  },
  karakuyu: {
    narrator: V('fettah', 0.92, -0.5),
    death: V('fahrettin', 0.78, -5, 'cave'),
    nine: V('fettah', 0.8, 3, 'whisper'),
    whisper: V('fahrettin', 0.6, -7, 'whisper'),
  },
};

// Bölüm 1'deki Selim telsizde değil, yüz yüze; telsiz efekti yalnızca uzaktan konuşan rollerde
CAST.karakol.selim.fx = null;

const FX = {
  radio: 'highpass=f=350,lowpass=f=3200,acompressor=threshold=0.1:ratio=6,volume=1.4',
  cave: 'lowpass=f=2600,aecho=0.8:0.7:90|180:0.35|0.2',
  oldradio: 'highpass=f=300,lowpass=f=3400,acompressor=threshold=0.12:ratio=5,aecho=0.6:0.3:18:0.2,volume=1.3',
  whisper: 'highpass=f=500,lowpass=f=5000,aecho=0.7:0.6:120:0.3,volume=0.9',
};

// ---- replikleri topla ----
function collect(obj, out, seen = new Set()) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
  seen.add(obj);
  if (Array.isArray(obj)) return obj.forEach((x) => collect(x, out, seen));
  if (typeof obj.s === 'string' && typeof obj.t === 'string') out.push([obj.s, obj.t]);
  for (const v of Object.values(obj)) collect(v, out, seen);
}
// kaynak koddaki { s: 'x', t: '...' } kalıpları ve pick([...]) listeleri
function scanSource(dir, out) {
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    if (!String(f).endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(dir, String(f)), 'utf8');
    for (const m of src.matchAll(/\{\s*s:\s*'(\w+)',\s*t:\s*'((?:[^'\\]|\\.)*)'\s*\}/g)) out.push([m[1], m[2].replace(/\\'/g, "'")]);
    for (const m of src.matchAll(/s:\s*'(\w+)',\s*t:\s*pick\(\[([^\]]*)\]\)/g))
      for (const q of m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)) out.push([m[1], q[1].replace(/\\'/g, "'")]);
  }
}

async function linesFor(game) {
  const out = [];
  if (game === 'karakol') {
    const st = await imp('src/games/karakol/game/story.js');
    collect(st, out);
    // final sonu: tüm karar birleşimleri
    for (const hasanSaved of [true, false])
      for (const muratSaved of [true, false])
        for (const ch2Ayse of [true, false])
          for (let saved = 0; saved <= 14; saved++) collect(st.finalEnding({ hasanSaved, muratSaved, ch2Ayse, ch2Saved: saved }), out);
    scanSource(path.join(ROOT, 'src/games/karakol/game'), out);
  } else if (game === 'keci') {
    const st = await imp('src/games/keci/game/story.js');
    collect(st, out);
    scanSource(path.join(ROOT, 'src/games/keci/game'), out);
    for (const n of ['çiçekli şalvar', 'kırmızı yelek', 'oyalı yemeni', 'yün çorap']) out.push(['fadime', 'Hey! O benim ' + n + '! Bırak onu keçi!']);
  } else if (game === 'evsahibi') {
    const st = await imp('src/games/evsahibi/game/story.js');
    collect(st, out);
    scanSource(path.join(ROOT, 'src/games/evsahibi/game'), out);
  } else if (game === 'radyo') {
    collect(await imp('src/games/radyo/game/story.js'), out);
  } else if (game === 'karakuyu') {
    const st = await imp('src/games/karakuyu/game/story.js');
    const { splitSentences } = await imp('src/games/karakuyu/game/sentences.js');
    const narr = (t) => splitSentences(t).forEach((p) => out.push(['narrator', p]));
    [...st.INTRO, ...st.ENDING, ...st.ENDING_TRUE].forEach(narr);
    Object.values(st.PAGES).forEach((p) => narr(p.text));
    Object.values(st.ITEMS).forEach((i) => narr(i.toast));
    narr('Karakuyu. Ne duyarsan duy, arkana bakma.');
    [...st.DEATH_LINES, st.DEATH_LOOKBACK, st.DEATH_WEDDING].forEach((t) => splitSentences(t).forEach((p) => out.push(['death', p])));
    // Game.js içindeki seslendirilen bildirimler: toast(..., true) ya da toast(..., 'metin')
    const src = fs.readFileSync(path.join(ROOT, 'src/games/karakuyu/game/Game.js'), 'utf8');
    for (const m of src.matchAll(/this\.toast\(([^;]*?),\s*\d+,\s*([^)]*)\);/g)) {
      if (m[2].trim() === 'false') continue;
      for (const q of (m[1] + ' ' + m[2]).matchAll(/'((?:[^'\\]|\\.)*)'/g)) narr(q[1].replace(/\\'/g, "'"));
    }
    for (const t of ['…Deniz… gel kuzum, düğünümüz var…', '…oğlum, nineni tanımadın mı…', '…bir halay çek bizimle, sonra gidersin…']) splitSentences(t).forEach((p) => out.push(['nine', p]));
    out.push(['whisper', 'Deniiiz…'], ['whisper', 'Deniz… gel…']);
  }
  const uniq = new Map();
  for (const [s, t] of out) if (t && t.trim()) uniq.set(s + '|' + t, [s, t]);
  return [...uniq.values()];
}

// Konuşma için metni sadeleştir (ekranda yazılan değişmez)
function speakable(t) {
  return t
    .replace(/[“”"«»]/g, '')
    .replace(/—/g, ', ')
    .replace(/\(([^)]*)\)/g, ', $1,')
    .replace(/…/g, '... ')
    .replace(/Tğm\./g, 'Teğmen')
    .replace(/Yzb\./g, 'Yüzbaşı')
    .replace(/\s+/g, ' ')
    .trim();
}

const engines = {};
function engine(v) {
  if (engines[v]) return engines[v];
  const d = `${VOICES}/vits-piper-tr_TR-${v}-medium`;
  engines[v] = new sherpa.OfflineTts({
    model: { vits: { model: `${d}/tr_TR-${v}-medium.onnx`, tokens: `${d}/tokens.txt`, dataDir: `${d}/espeak-ng-data`, noiseScale: 0.6, noiseScaleW: 0.8, lengthScale: 1 }, numThreads: 4, provider: 'cpu' },
    maxNumSentences: 2,
  });
  return engines[v];
}

async function run(game) {
  const cast = CAST[game];
  const outDir = path.join(ROOT, 'public/voices', game);
  fs.mkdirSync(outDir, { recursive: true });
  const lines = await linesFor(game);
  const tmp = fs.mkdtempSync('/tmp/voicegen-');
  const keep = new Set();
  let made = 0, skipped = 0;
  for (const [s, t] of lines) {
    const c = cast[s];
    if (!c) {
      console.warn(`  [${game}] konuşmacı ayarı yok: ${s} — atlandı`);
      continue;
    }
    const h = hashLine(s + '|' + t);
    keep.add(h);
    const file = path.join(outDir, h + '.mp3');
    if (fs.existsSync(file)) {
      skipped++;
      continue;
    }
    const audio = engine(c.voice).generate({ text: speakable(t), sid: 0, speed: c.speed });
    const wav = path.join(tmp, h + '.wav');
    sherpa.writeWave(wav, { samples: audio.samples, sampleRate: audio.sampleRate });
    const r = Math.pow(2, c.pitch / 12);
    const filters = [];
    if (c.pitch) filters.push(`asetrate=${Math.round(audio.sampleRate * r)}`, `aresample=${audio.sampleRate}`, `atempo=${(1 / r).toFixed(4)}`);
    if (c.fx) filters.push(FX[c.fx]);
    filters.push('silenceremove=start_periods=1:start_threshold=-50dB', 'loudnorm=I=-17:TP=-1.5:LRA=11', 'apad=pad_dur=0.12');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', filters.join(','), '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '40k', file]);
    fs.rmSync(wav);
    made++;
  }
  // kullanılmayanları temizle
  let removed = 0;
  for (const f of fs.readdirSync(outDir)) {
    if (!f.endsWith('.mp3')) continue;
    if (!keep.has(f.slice(0, -4))) {
      fs.rmSync(path.join(outDir, f));
      removed++;
    }
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ voices: 'Piper tr_TR fahrettin/fettah (CC0 veri kümesi), sherpa-onnx ile üretildi', files: [...keep].sort() }));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${game}: ${lines.length} replik · ${made} yeni · ${skipped} hazır · ${removed} silindi`);
}

for (const g of only ? [only] : Object.keys(CAST)) await run(g);
