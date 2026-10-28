// Merkezi zaman yönetimi. Tüm sistemler zamanı buradan alır; böylece yavaş çekimde
// hareket, animasyon, parçacıklar, zamanlayıcılar ve sesler birbirinden kopmaz.

export class TimeManager {
  constructor() {
    this.scale = 1; // anlık ölçek
    this.target = 1; // hedef ölçek (yumuşak geçiş)
    this.realTime = 0;
    this.gameTime = 0;
    this.realDt = 0;
    this.dt = 0; // ölçeklenmiş dünya zamanı
    this.playerDt = 0; // oyuncu: yavaş çekimde de kontrolü korur

    // Odak yeteneği
    this.focusEnergy = 1;
    this.focusActive = false;
    this.focusCooldown = 0;
    this.FOCUS_SCALE = 0.3;
    this.FOCUS_DRAIN = 0.25; // saniyede (gerçek zaman) → 4 sn
    this.FOCUS_REGEN = 0.12;

    // Sinematik yavaş çekim
    this.cinematic = 0; // kalan gerçek süre
    this.cinematicScale = 0.25;

    this.timers = [];
    this.listeners = new Set();
  }

  onScaleChange(f) {
    this.listeners.add(f);
  }

  toggleFocus() {
    if (this.focusActive) return this.endFocus();
    if (this.focusEnergy < 0.2) return false;
    this.focusActive = true;
    return true;
  }

  endFocus() {
    if (!this.focusActive) return false;
    this.focusActive = false;
    this.focusCooldown = 2;
    return true;
  }

  // Kısa sinematik an (ör. ilk temas)
  cinematicMoment(seconds = 1.2, scale = 0.25) {
    this.cinematic = Math.max(this.cinematic, seconds);
    this.cinematicScale = scale;
  }

  // Oyun zamanında çalışan zamanlayıcı (yavaş çekimde o da yavaşlar)
  after(sec, fn) {
    const t = { at: this.gameTime + sec, fn };
    this.timers.push(t);
    return t;
  }

  cancel(t) {
    this.timers = this.timers.filter((x) => x !== t);
  }

  clearTimers() {
    this.timers = [];
  }

  reset() {
    this.scale = this.target = 1;
    this.focusActive = false;
    this.focusEnergy = 1;
    this.cinematic = 0;
    this.clearTimers();
  }

  tick(realDt, paused = false) {
    realDt = Math.min(realDt, 1 / 20);
    this.realDt = paused ? 0 : realDt;
    this.realTime += realDt;
    if (paused) {
      this.dt = this.playerDt = 0;
      return;
    }

    // Odak enerjisi
    if (this.focusActive) {
      this.focusEnergy -= this.FOCUS_DRAIN * realDt;
      if (this.focusEnergy <= 0) {
        this.focusEnergy = 0;
        this.endFocus();
      }
    } else {
      this.focusCooldown -= realDt;
      if (this.focusCooldown <= 0) this.focusEnergy = Math.min(1, this.focusEnergy + this.FOCUS_REGEN * realDt);
    }
    if (this.cinematic > 0) this.cinematic -= realDt;

    this.target = this.cinematic > 0 ? this.cinematicScale : this.focusActive ? this.FOCUS_SCALE : 1;
    // yumuşak giriş/çıkış (gerçek zamana göre)
    const prev = this.scale;
    const k = Math.min(1, realDt * (this.target < this.scale ? 9 : 4));
    this.scale += (this.target - this.scale) * k;
    if (Math.abs(this.scale - this.target) < 0.002) this.scale = this.target;
    if (Math.abs(prev - this.scale) > 0.001) this.listeners.forEach((f) => f(this.scale));

    this.dt = realDt * this.scale;
    this.playerDt = realDt * Math.max(this.scale, 0.55);
    this.gameTime += this.dt;

    if (this.timers.length) {
      const due = this.timers.filter((t) => t.at <= this.gameTime);
      if (due.length) {
        this.timers = this.timers.filter((t) => t.at > this.gameTime);
        due.forEach((t) => t.fn());
      }
    }
  }
}
