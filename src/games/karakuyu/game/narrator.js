// Sesli anlatım: tarayıcının yerleşik metin-okuma özelliği (Web Speech API).
// Ücretsizdir, internet gerektirmez (çoğu cihazda), sunucu ya da token kullanmaz.
// Türkçe ses cihazda yoksa sessizce devre dışı kalır.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

class Narrator {
  constructor() {
    this.enabled = true;
    this.rate = 0.92;
    this.volume = 0.9;
    this.voice = null;
    this.voices = [];
    this.ready = false;
    this.listeners = new Set();
    this.queueId = 0;
    if (!synth) return;
    const load = () => {
      const all = synth.getVoices();
      this.voices = all.filter((v) => /^tr(-|_|$)/i.test(v.lang));
      if (!this.voice || !this.voices.includes(this.voice)) this.voice = this.pickDefault();
      this.ready = true;
      this.listeners.forEach((f) => f());
    };
    load();
    synth.addEventListener?.('voiceschanged', load);
    // bazı tarayıcılar sesleri geç yükler
    setTimeout(load, 600);
    setTimeout(load, 2000);
  }

  get supported() {
    return !!synth;
  }

  get hasTurkish() {
    return this.voices.length > 0;
  }

  pickDefault() {
    if (!this.voices.length) return null;
    const pref = this.voices.find((v) => v.name === this.preferred);
    if (pref) return pref;
    // Doğal/çevrimiçi sesler daha iyi duyulur (Edge "Natural", Chrome "Google")
    const score = (v) =>
      (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
    return [...this.voices].sort((a, b) => score(b) - score(a))[0];
  }

  setVoiceByName(name) {
    this.preferred = name;
    const v = this.voices.find((x) => x.name === name);
    if (v) this.voice = v;
  }

  onChange(f) {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  stop() {
    this.queueId++;
    if (synth) synth.cancel();
  }

  get speaking() {
    return !!synth && (synth.speaking || synth.pending);
  }

  // Bir veya birden fazla metni sırayla okur. opts: { pitch, rate, interrupt, onEnd }
  say(text, opts = {}) {
    if (!synth || !this.enabled || !this.voice || !text) {
      opts.onEnd && setTimeout(opts.onEnd, 0);
      return;
    }
    if (opts.interrupt !== false) this.stop();
    const id = this.queueId;
    const parts = splitSentences(Array.isArray(text) ? text.join('\n') : text);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.voice = this.voice;
      u.lang = this.voice.lang;
      u.rate = (opts.rate ?? 1) * this.rate;
      u.pitch = opts.pitch ?? 0.85;
      u.volume = (opts.volume ?? 1) * this.volume;
      if (i === parts.length - 1 && opts.onEnd) u.onend = () => id === this.queueId && opts.onEnd();
      synth.speak(u);
    });
    // Chrome uzun kuyrukta takılabilir: arada bir dürt
    clearInterval(this._kick);
    this._kick = setInterval(() => {
      if (!synth.speaking) return clearInterval(this._kick);
      synth.pause();
      synth.resume();
    }, 10000);
  }

  // Cinin fısıltısı: çok kalın, yavaş, kısık
  whisperName() {
    if (!synth || !this.enabled || !this.voice || this.speaking) return;
    const u = new SpeechSynthesisUtterance(Math.random() < 0.5 ? 'Deniiiz…' : 'Deniz… gel…');
    u.voice = this.voice;
    u.lang = this.voice.lang;
    u.rate = 0.55;
    u.pitch = 0.05;
    u.volume = 0.55 * this.volume;
    synth.speak(u);
  }
}

// Uzun metinleri cümlelere böl (Chrome ~200 karakterden uzun metinlerde susabiliyor)
function splitSentences(t) {
  const out = [];
  for (const para of t.split(/\n+/)) {
    const s = para.trim();
    if (!s) continue;
    const sentences = s.match(/[^.!?…]+[.!?…]*["”]?/g) || [s];
    let buf = '';
    for (const x of sentences) {
      if ((buf + x).length > 180 && buf) {
        out.push(buf.trim());
        buf = '';
      }
      buf += x;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

export const narrator = new Narrator();
