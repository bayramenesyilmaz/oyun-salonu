// Test için sahte ağ: iki Match arasında gecikmeli bağlantı (Firebase'e gerek duymadan).
// Room (src/engine/online.js) ile aynı arayüzü sunar.
class Loop {
  constructor(lat, jit) {
    this.lat = lat;
    this.jit = jit;
    this.peer = null;
    this._s = null;
    this._e = null;
    this._l = null;
    this.last = null;
    this.evq = [];
    this.closed = false;
  }
  set onState(f) {
    this._s = f;
    if (f && this.last) f(this.last);
  }
  get onState() {
    return this._s;
  }
  set onEvent(f) {
    this._e = f;
    if (f) while (this.evq.length) f(this.evq.shift());
  }
  get onEvent() {
    return this._e;
  }
  set onLeave(f) {
    this._l = f;
  }
  get onLeave() {
    return this._l;
  }
  delay() {
    return this.lat + Math.random() * this.jit;
  }
  sendState(s) {
    const p = this.peer;
    const copy = JSON.parse(JSON.stringify(s));
    setTimeout(() => {
      if (p.closed) return;
      p.last = copy;
      p._s?.(copy);
    }, this.delay());
  }
  sendEvent(e) {
    const p = this.peer;
    const copy = JSON.parse(JSON.stringify(e));
    setTimeout(() => {
      if (p.closed) return;
      if (p._e) p._e(copy);
      else p.evq.push(copy);
    }, this.lat + 5);
  }
  close() {
    this.closed = true;
    const p = this.peer;
    setTimeout(() => p._l?.(), this.lat);
  }
}
export function loopPair(latency = 60, jitter = 25) {
  const a = new Loop(latency, jitter);
  const b = new Loop(latency, jitter);
  a.peer = b;
  b.peer = a;
  return [a, b];
}
