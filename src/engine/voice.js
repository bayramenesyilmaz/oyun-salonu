// Türkçe diyaloglar: altyazı her zaman, ses (tarayıcının ücretsiz Web Speech API'si) varsa.
// Her konuşmacının kendine ait perde/hız ayarı vardır; telsiz konuşmaları cızırtıyla başlar/biter.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export const SPEAKERS = {
  arslan: { name: 'Tğm. Arslan', pitch: 0.92, rate: 1.0, radio: false, color: '#d8e0c8' },
  kemal: { name: 'Uzm. Çvş. Kemal', pitch: 0.78, rate: 1.0, radio: false, color: '#c9d7a8' },
  selim: { name: 'Yzb. Selim Er', pitch: 0.7, rate: 0.95, radio: true, color: '#e2c98f' },
  hasan: { name: 'Hasan Dayı', pitch: 0.6, rate: 0.86, radio: false, color: '#e0b8a0' },
  karakol: { name: 'Karakol (telsiz)', pitch: 0.75, rate: 1.02, radio: true, color: '#e2c98f' },
  dusman: { name: '—', pitch: 0.5, rate: 1.1, radio: false, color: '#c98f8f' },
};

export class VoiceSystem {
  constructor(audio, onSubtitle, speakers = SPEAKERS, voiceIndex = null) {
    this.audio = audio;
    this.speakers = speakers;
    this.voiceIndex = voiceIndex;
    this.onSubtitle = onSubtitle;
    this.enabled = true;
    this.voices = [];
    this.queue = [];
    this.busy = false;
    this.token = 0;
    if (synth) {
      const load = () => {
        this.voices = synth.getVoices().filter((v) => /^tr(-|_|$)/i.test(v.lang));
      };
      load();
      synth.addEventListener?.('voiceschanged', load);
      setTimeout(load, 800);
    }
  }

  get hasVoice() {
    return !!synth && this.voices.length > 0;
  }

  // Konuşmacıya göre farklı ses (birden fazla Türkçe ses varsa) seç
  voiceFor(id) {
    if (!this.voices.length) return null;
    const pref = [...this.voices].sort((a, b) => score(b) - score(a));
    const sp = this.speakers[id];
    const female = pref.filter((v) => /emel|seda|yelda|filiz|female|kadın/i.test(v.name));
    const male = pref.filter((v) => /ahmet|tolga|male|erkek/i.test(v.name));
    const pool = sp && sp.female && female.length ? female : male.length ? male : pref;
    const map = this.voiceIndex || { selim: 0, karakol: 0, kemal: 1, hasan: 2, arslan: 0, dusman: 1 };
    const idx = map[id] || 0;
    return pool[idx % pool.length];
  }

  stop() {
    this.token++;
    this.cur = null;
    this.queue = [];
    this.busy = false;
    if (synth) synth.cancel();
    this.audio.radioHiss(false);
    this.onSubtitle(null);
  }

  // Satır dizisini sırayla oynat. lines: [{s:'kemal', t:'...'}]
  play(lines, onDone) {
    this.queue.push({ lines: lines.slice(), onDone });
    if (!this.busy) this.next();
  }

  next() {
    const item = this.queue[0];
    if (!item) {
      this.busy = false;
      return;
    }
    if (!item.lines.length) {
      this.queue.shift();
      item.onDone && item.onDone();
      return this.next();
    }
    this.busy = true;
    const line = item.lines.shift();
    const tok = ++this.token;
    const sp = this.speakers[line.s] || Object.values(this.speakers)[0];
    this.onSubtitle({ who: sp.name, text: line.t, color: sp.color });
    if (sp.radio) {
      this.audio.squelch(false);
      this.audio.radioHiss(true);
    }
    // Zamanlama oyun döngüsünden (update) ilerler: duraklatınca altyazı da bekler
    const readTime = 0.9 + line.t.length * 0.055;
    this.cur = { tok, sp, t: 0, min: readTime, max: readTime * 2.2 + 1.5, spoken: false, ended: false, gap: -1 };
    const v = this.enabled ? this.voiceFor(line.s) : null;
    if (!v) return;
    this.cur.spoken = true;
    const u = new SpeechSynthesisUtterance(line.t);
    u.voice = v;
    u.lang = v.lang;
    u.pitch = sp.pitch;
    u.rate = sp.rate;
    u.volume = Math.min(1, this.audio.volume * 1.1);
    const done = () => {
      if (this.cur && this.cur.tok === tok) this.cur.ended = true;
    };
    u.onend = done;
    u.onerror = done;
    setTimeout(() => tok === this.token && synth.speak(u), sp.radio ? 220 : 0);
  }

  // Oyun döngüsünden gerçek zamanlı çağrılır
  update(realDt) {
    const c = this.cur;
    if (!c || !this.busy) return;
    c.t += realDt;
    if (c.gap >= 0) {
      c.gap -= realDt;
      if (c.gap < 0) {
        this.cur = null;
        this.onSubtitle(null);
        this.next();
      }
      return;
    }
    const finished = c.spoken ? c.ended || c.t > c.max : c.t > c.min;
    if (finished) {
      if (c.sp.radio) {
        this.audio.radioHiss(false);
        this.audio.squelch(true);
      }
      c.gap = 0.25;
    }
  }

  pause(on) {
    if (!synth) return;
    if (on) synth.pause();
    else synth.resume();
  }
}

function score(v) {
  return (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0);
}
