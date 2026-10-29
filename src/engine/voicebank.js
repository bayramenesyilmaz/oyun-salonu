// Önceden üretilmiş doğal Türkçe seslendirme (Piper sinir ağı sesleri, CC0, derleme sırasında üretilir).
// Her replik "konuşmacı|metin" anahtarının kısa özetiyle (FNV-1a) bir mp3 dosyasına karşılık gelir.
// Dosyası olmayan replikler (ör. sayılar içeren dinamik cümleler) tarayıcının sesine düşer.

export function hashLine(s) {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export class VoiceBank {
  constructor(base) {
    this.base = base.endsWith('/') ? base : base + '/';
    this.set = null;
    this.cache = new Map();
    this.ready =
      typeof fetch === 'undefined'
        ? Promise.resolve(null)
        : fetch(this.base + 'manifest.json')
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => {
              this.set = m ? new Set(m.files) : null;
              return this.set;
            })
            .catch(() => null);
  }

  url(key) {
    if (!this.set) return null;
    const h = hashLine(key);
    return this.set.has(h) ? this.base + h + '.mp3' : null;
  }

  has(key) {
    return !!this.url(key);
  }

  // Sıradaki replikleri önceden indir (ilk oynatmada gecikme olmasın)
  preload(key) {
    const u = this.url(key);
    if (!u || this.cache.has(u)) return;
    const a = new Audio();
    a.preload = 'auto';
    a.src = u;
    this.cache.set(u, a);
    if (this.cache.size > 40) this.cache.delete(this.cache.keys().next().value);
  }

  // Oynat; ses öğesini döndürür (yoksa null). onEnd hem bitişte hem hatada çağrılır.
  play(key, volume = 1, onEnd) {
    const u = this.url(key);
    if (!u) return null;
    let a = this.cache.get(u);
    if (!a || !a.paused || a.currentTime > 0) a = new Audio(u);
    this.cache.delete(u);
    a.volume = Math.max(0, Math.min(1, volume));
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      onEnd && onEnd();
    };
    a.onended = fin;
    a.onerror = fin;
    const p = a.play();
    if (p && p.catch) p.catch(fin);
    return a;
  }
}
