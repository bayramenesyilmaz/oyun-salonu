// Görev hedefleri, istatistikler ve puan. Sivillerin güvenliği çatışmadan daha değerlidir:
// düşman etkisiz hâle getirmek puan vermez; fark edilmeden ilerlemek ve kimseyi kaybetmemek verir.

export const POINTS = {
  civilian: 1000,
  main: 300,
  optional: 400,
  doc: 150,
  stealth: 500,
  squadSafe: 400,
  civHurt: -400,
  civLost: -2000,
  squadDown: -300,
  death: -200,
  civShotByPlayer: -600,
};

export class Mission {
  constructor(objectives, { civiliansTotal = 0, docsTotal = 0 } = {}) {
    this.objectives = objectives.map((o) => ({ done: false, failed: false, active: !o.hidden, progress: 0, ...o }));
    this.stats = {
      civiliansTotal,
      civiliansSaved: 0,
      civiliansHurt: 0,
      civiliansLost: 0,
      civShotByPlayer: 0,
      docsTotal,
      docs: 0,
      detected: false,
      squadDowned: 0,
      deaths: 0,
      shots: 0,
      hits: 0,
      enemiesDown: 0,
      startTime: 0,
      endTime: 0,
    };
    this.listeners = new Set();
  }

  onChange(f) {
    this.listeners.add(f);
  }
  changed(ev) {
    this.listeners.forEach((f) => f(ev));
  }

  get(id) {
    return this.objectives.find((o) => o.id === id);
  }

  activate(id) {
    const o = this.get(id);
    if (o && !o.active) {
      o.active = true;
      this.changed({ type: 'new', o });
    }
  }

  complete(id) {
    const o = this.get(id);
    if (!o || o.done || o.failed) return false;
    o.done = true;
    o.doneAt = Date.now();
    o.active = true;
    if (o.total) o.progress = o.total;
    this.changed({ type: 'done', o });
    return true;
  }

  fail(id) {
    const o = this.get(id);
    if (!o || o.done || o.failed) return;
    o.failed = true;
    this.changed({ type: 'failed', o });
  }

  progress(id, n) {
    const o = this.get(id);
    if (!o || o.done) return;
    o.progress = n;
    if (o.total && n >= o.total) this.complete(id);
    else this.changed({ type: 'progress', o });
  }

  isDone(id) {
    return !!this.get(id)?.done;
  }

  // HUD için görünen hedefler
  visible() {
    const now = Date.now();
    // tamamlanan hedefler birkaç saniye üstü çizili görünür, sonra listeden kalkar
    return this.objectives.filter((o) => o.active && !(o.done && now - (o.doneAt || 0) > 6000)).map((o) => ({
      id: o.id,
      text: o.total ? `${o.text} (${o.progress}/${o.total})` : o.text,
      optional: !!o.optional,
      done: o.done,
      failed: o.failed,
    }));
  }

  snapshot() {
    return JSON.parse(JSON.stringify({ objectives: this.objectives, stats: this.stats }));
  }

  restore(s) {
    this.objectives = s.objectives;
    this.stats = s.stats;
    this.changed({ type: 'restore' });
  }

  // Sonuç ekranı dökümü
  score() {
    const s = this.stats, P = POINTS;
    const rows = [];
    const mains = this.objectives.filter((o) => !o.optional && !o.noScore);
    const opts = this.objectives.filter((o) => o.optional && !o.noScore);
    rows.push({ label: `Kurtarılan sivil (${s.civiliansSaved}/${s.civiliansTotal})`, value: s.civiliansSaved * P.civilian });
    rows.push({ label: `Ana hedefler (${mains.filter((o) => o.done).length}/${mains.length})`, value: mains.filter((o) => o.done).length * P.main });
    rows.push({ label: `İsteğe bağlı hedefler (${opts.filter((o) => o.done).length}/${opts.length})`, value: opts.filter((o) => o.done).length * P.optional });
    rows.push({ label: `Hikâye belgeleri (${s.docs}/${s.docsTotal})`, value: s.docs * P.doc });
    rows.push({ label: s.detected ? 'Fark edilmeden tamamlama — fark edildin' : 'Fark edilmeden tamamlama', value: s.detected ? 0 : P.stealth });
    rows.push({ label: s.squadDowned ? 'Ekip güvenliği — ekip arkadaşı yaralandı' : 'Ekip güvenliği — kimse yere düşmedi', value: s.squadDowned ? 0 : P.squadSafe });
    if (s.civiliansHurt) rows.push({ label: `Sivil yaralandı (×${s.civiliansHurt})`, value: s.civiliansHurt * P.civHurt, bad: true });
    if (s.civShotByPlayer) rows.push({ label: `Sivile isabet eden atış (×${s.civShotByPlayer})`, value: s.civShotByPlayer * P.civShotByPlayer, bad: true });
    if (s.civiliansLost) rows.push({ label: `Kaybedilen sivil (×${s.civiliansLost})`, value: s.civiliansLost * P.civLost, bad: true });
    if (s.squadDowned) rows.push({ label: `Ekip arkadaşı yere düştü (×${s.squadDowned})`, value: s.squadDowned * P.squadDown, bad: true });
    if (s.deaths) rows.push({ label: `Kayıt noktasına dönüş (×${s.deaths})`, value: s.deaths * P.death, bad: true });
    const total = Math.max(0, rows.reduce((a, r) => a + r.value, 0));
    const max = s.civiliansTotal * P.civilian + mains.length * P.main + opts.length * P.optional + s.docsTotal * P.doc + P.stealth + P.squadSafe;
    const pct = max ? total / max : 0;
    const rank = s.civiliansLost ? (pct >= 0.45 ? 'B' : 'C') : pct >= 0.85 ? 'Ş' : pct >= 0.65 ? 'A' : pct >= 0.45 ? 'B' : 'C';
    const secs = Math.max(0, (s.endTime || 0) - (s.startTime || 0));
    const extra = {
      time: `${Math.floor(secs / 60)} dk ${Math.round(secs % 60)} sn`,
      accuracy: s.shots ? Math.round((s.hits / s.shots) * 100) + '%' : '—',
      enemiesDown: s.enemiesDown,
    };
    return { rows, total, max, pct, rank, extra };
  }
}
