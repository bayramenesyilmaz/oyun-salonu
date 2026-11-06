// Çok oyunculu (en çok 4 kişi) oda altyapısı: Firebase Realtime Database + anonim giriş (ücretsiz Spark plan).
// Oda yapısı:  ops/KOD/meta (kurucu, harita, durum) · ops/KOD/pl/UID (oyuncu bilgisi) · ops/KOD/pos/UID (konum)
//              ops/KOD/world (kurucunun dünya görüntüsü) · ops/KOD/ev/UID/* (kısa ömürlü olaylar)
// Mantık Room sınıfında; ağ kısmı "backend" ile değişir (Firebase ya da test için bellek içi).
import { FIREBASE_CONFIG } from './firebaseConfig.js';
import { OnlineError, explain } from './online.js';

export { OnlineError, explain };
const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
const genCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
export const MAX_PLAYERS = 4;

const withTimeout = (p, ms = 15000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('zaman aşımı')), ms))]);

// ---------- Firebase backend ----------
let fbPromise = null;
async function firebaseBackend() {
  if (!fbPromise) {
    fbPromise = (async () => {
      const [{ initializeApp }, auth, m] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database')]);
      const app = initializeApp(FIREBASE_CONFIG, 'ops');
      const a = auth.getAuth(app);
      if (!a.currentUser) await auth.signInAnonymously(a);
      const db = m.getDatabase(app);
      const ref = (p) => m.ref(db, p);
      return {
        uid: a.currentUser.uid,
        get: async (p) => (await m.get(ref(p))).val(),
        set: (p, v) => m.set(ref(p), v),
        update: (p, v) => m.update(ref(p), v),
        push: (p, v) => m.push(ref(p), v).key,
        remove: (p) => m.remove(ref(p)),
        watch: (p, cb) => m.onValue(ref(p), (s) => cb(s.val())),
        watchAdded: (p, cb) => m.onChildAdded(ref(p), (s) => cb(s.key, s.val())),
        onDisconnectRemove: (p) => m.onDisconnect(ref(p)).remove(),
      };
    })();
    fbPromise.catch(() => (fbPromise = null));
  }
  return fbPromise;
}

// ---------- bellek içi backend (testler için) ----------
export class MemHub {
  constructor() {
    this.data = {};
    this.subs = [];
  }
  _get(p) {
    let o = this.data;
    for (const k of p.split('/').filter(Boolean)) {
      if (o == null || typeof o !== 'object') return undefined;
      o = o[k];
    }
    return o;
  }
  _put(p, v) {
    const ks = p.split('/').filter(Boolean);
    let o = this.data;
    for (let i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
      o = o[ks[i]];
    }
    const last = ks[ks.length - 1];
    if (v == null) delete o[last];
    else o[last] = JSON.parse(JSON.stringify(v));
    this._notify(p);
  }
  _notify(p) {
    for (const s of this.subs.slice()) {
      if (s.kind === 'value' && (p.startsWith(s.path) || s.path.startsWith(p))) setTimeout(() => s.active && s.cb(this._get(s.path) === undefined ? null : JSON.parse(JSON.stringify(this._get(s.path)))), 0);
      if (s.kind === 'added' && p.startsWith(s.path + '/')) {
        const key = p.slice(s.path.length + 1).split('/')[0];
        const v = this._get(s.path + '/' + key);
        if (v !== undefined && !s.seen.has(key)) {
          s.seen.add(key);
          setTimeout(() => s.active && s.cb(key, JSON.parse(JSON.stringify(v))), 0);
        }
      }
    }
  }
  backend(uid) {
    const hub = this;
    return {
      uid,
      get: async (p) => (hub._get(p) === undefined ? null : JSON.parse(JSON.stringify(hub._get(p)))),
      set: async (p, v) => hub._put(p, v),
      update: async (p, v) => Object.keys(v).forEach((k) => hub._put(p + '/' + k, v[k])),
      push: (p, v) => {
        const k = 'k' + Math.random().toString(36).slice(2, 10);
        hub._put(p + '/' + k, v);
        return k;
      },
      remove: async (p) => hub._put(p, null),
      watch: (p, cb) => {
        const s = { kind: 'value', path: p, cb, active: true };
        hub.subs.push(s);
        setTimeout(() => s.active && cb(hub._get(p) === undefined ? null : JSON.parse(JSON.stringify(hub._get(p)))), 0);
        return () => (s.active = false);
      },
      watchAdded: (p, cb) => {
        const s = { kind: 'added', path: p, cb, active: true, seen: new Set() };
        hub.subs.push(s);
        const cur = hub._get(p) || {};
        for (const k of Object.keys(cur)) {
          s.seen.add(k);
          setTimeout(() => s.active && cb(k, cur[k]), 0);
        }
        return () => (s.active = false);
      },
      onDisconnectRemove: () => {},
    };
  }
}

// ---------- oda mantığı ----------
class Room {
  constructor(B, code, isHost) {
    this.B = B;
    this.code = code;
    this.isHost = isHost;
    this.uid = B.uid;
    this.base = 'ops/' + code + '/';
    this.players = {};
    this.meta = null;
    this.h = {};
    this.unsubs = [];
    this.watched = new Set();
    this.closed = false;
  }
  on(ev, fn) {
    this.h[ev] = fn;
    return this;
  }
  emit(ev, ...a) {
    this.h[ev]?.(...a);
  }
  start() {
    const B = this.B;
    this.unsubs.push(
      B.watch(this.base + 'pl', (v) => {
        this.players = v || {};
        for (const u of Object.keys(this.players)) {
          if (u === this.uid || this.watched.has(u)) continue;
          this.watched.add(u);
          this.unsubs.push(B.watch(this.base + 'pos/' + u, (p) => this.emit('pos', u, p)));
          const seen = new Set();
          this.unsubs.push(
            B.watchAdded(this.base + 'ev/' + u, (k, e) => {
              if (seen.has(k) || !e) return;
              seen.add(k);
              this.emit('ev', u, e);
            }),
          );
        }
        this.emit('players', this.players);
      }),
      B.watch(this.base + 'meta', (v) => {
        const had = !!this.meta;
        this.meta = v;
        if (!v && (had || !this.isHost) && !this.closed) this.emit('closed');
        else if (v) this.emit('meta', v);
      }),
    );
    if (!this.isHost) this.unsubs.push(B.watch(this.base + 'world', (v) => v && this.emit('world', v)));
  }
  setInfo(obj) {
    const cur = this.players[this.uid] || {};
    this.players[this.uid] = { ...cur, ...obj };
    return this.B.set(this.base + 'pl/' + this.uid, this.players[this.uid]).catch(() => {});
  }
  setMeta(obj) {
    this.meta = { ...this.meta, ...obj };
    return this.B.update(this.base + 'meta', obj).catch(() => {});
  }
  sendPos(o) {
    if (!this.closed) this.B.set(this.base + 'pos/' + this.uid, o).catch(() => {});
  }
  sendWorld(o) {
    if (!this.closed) this.B.set(this.base + 'world', o).catch(() => {});
  }
  sendEv(o) {
    if (this.closed) return;
    const k = this.B.push(this.base + 'ev/' + this.uid, o);
    setTimeout(() => this.B.remove(this.base + 'ev/' + this.uid + '/' + k).catch(() => {}), 6000);
  }
  leave() {
    if (this.closed) return;
    this.closed = true;
    this.unsubs.forEach((u) => {
      try {
        u();
      } catch {}
    });
    try {
      if (this.isHost) this.B.remove(this.base.slice(0, -1)).catch(() => {});
      else {
        this.B.remove(this.base + 'pl/' + this.uid).catch(() => {});
        this.B.remove(this.base + 'pos/' + this.uid).catch(() => {});
      }
    } catch {}
  }
}

export async function createRoom(info, meta = {}, backend) {
  const B = backend || (await withTimeout(firebaseBackend()));
  for (let i = 0; i < 6; i++) {
    const code = genCode();
    if (await withTimeout(B.get(`ops/${code}/meta`))) continue;
    await withTimeout(B.set(`ops/${code}/meta`, { host: B.uid, st: 'lobby', v: 1, ...meta }));
    const room = new Room(B, code, true);
    B.onDisconnectRemove(`ops/${code}`);
    await withTimeout(B.set(`ops/${code}/pl/${B.uid}`, info));
    room.players[B.uid] = info;
    room.meta = { host: B.uid, st: 'lobby', ...meta };
    room.start();
    return room;
  }
  throw new OnlineError('kod', 'Oda kodu üretilemedi, tekrar dene.');
}

export async function joinRoom(codeIn, info, backend) {
  const code = String(codeIn || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(code)) throw new OnlineError('kod', 'Oda kodu 4 harf/rakamdan oluşur.');
  const B = backend || (await withTimeout(firebaseBackend()));
  const meta = await withTimeout(B.get(`ops/${code}/meta`));
  if (!meta) throw new OnlineError('yok', 'Bu kodla bir oda bulunamadı.');
  if (meta.st !== 'lobby') throw new OnlineError('basladi', 'Bu odada oyun başlamış.');
  const pl = (await withTimeout(B.get(`ops/${code}/pl`))) || {};
  if (!pl[B.uid] && Object.keys(pl).length >= MAX_PLAYERS) throw new OnlineError('dolu', 'Oda dolu (4 kişi).');
  try {
    await withTimeout(B.set(`ops/${code}/pl/${B.uid}`, info));
  } catch (e) {
    if (/permission[_-]denied/i.test(String(e.code || e.message))) throw new OnlineError('dolu', 'Oda dolu ya da kapanmış.');
    throw e;
  }
  B.onDisconnectRemove(`ops/${code}/pl/${B.uid}`);
  B.onDisconnectRemove(`ops/${code}/pos/${B.uid}`);
  const room = new Room(B, code, false);
  room.players = { ...pl, [B.uid]: info };
  room.meta = meta;
  room.start();
  return room;
}
