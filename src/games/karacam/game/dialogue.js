// Seslendirilmiş konuşma oynatıcı: replikleri sırayla çalar; ses dosyası yoksa metin uzunluğuna göre bekler.
import { VoiceBank } from '@engine/voicebank.js';

export class Dialogue {
  constructor(onLine, opts = {}) {
    this.onLine = onLine; // (satır | null)
    this.bank = opts.silent ? null : new VoiceBank('/karacam/voices/');
    this.volume = 1;
    this.fast = !!opts.fast;
    this.queue = [];
    this.cur = null;
    this.audio = null;
    this.timer = null;
    this.done = null;
  }
  get busy() {
    return !!this.cur;
  }
  preload(lines) {
    if (!this.bank) return;
    this.bank.ready.then(() => lines.forEach((l) => this.bank.preload(l.s + '|' + l.t)));
  }
  play(lines, done) {
    this.stop(false);
    this.queue = lines.slice();
    this.done = done || null;
    this.next();
  }
  next() {
    clearTimeout(this.timer);
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null;
      this.audio.pause();
      this.audio = null;
    }
    const l = this.queue.shift();
    if (!l) {
      this.cur = null;
      this.onLine(null);
      const d = this.done;
      this.done = null;
      d && d();
      return;
    }
    this.cur = l;
    this.onLine(l);
    if (this.queue[0] && this.bank) this.bank.preload(this.queue[0].s + '|' + this.queue[0].t);
    const fallback = () => {
      // ses yoksa okuma süresi kadar bekle
      this.timer = setTimeout(() => this.next(), this.fast ? 60 : 1200 + l.t.length * 55);
    };
    if (!this.bank || this.fast) return fallback();
    this.bank.ready.then(() => {
      if (this.cur !== l) return;
      const a = this.bank.play(l.s + '|' + l.t, this.volume, () => {
        if (this.cur === l) this.timer = setTimeout(() => this.next(), 650);
      });
      if (a) this.audio = a;
      else fallback();
    });
  }
  // dokununca: o anki repliği geç
  skip() {
    if (this.cur) this.next();
  }
  stop(fire = false) {
    clearTimeout(this.timer);
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null;
      this.audio.pause();
      this.audio = null;
    }
    this.queue = [];
    this.cur = null;
    const d = this.done;
    this.done = null;
    if (fire && d) d();
  }
}
