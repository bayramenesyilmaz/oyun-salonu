// Ortak online altyapı (Firebase Realtime Database + anonim giriş). Ücretsiz Spark planında çalışır.
// Firebase kodu yalnızca online oyun başlatılınca yüklenir (dinamik import), diğer oyunları ağırlaştırmaz.
//
// Oda yapısı:  rooms/KOD/meta (kurucu), rooms/KOD/guest (katılan), rooms/KOD/p/UID (durum), rooms/KOD/ev/UID/* (olaylar)
// Kullanım:
//   const room = await createRoom();            // ya da: await joinRoom('ABCD')
//   room.sendState({...});  room.onState = (s) => {...};  // rakibin durumu (kopunca null)
//   room.sendEvent({k:'x'}); room.onEvent = (e) => {...}; room.onLeave = () => {...};
//   room.leave();
import { FIREBASE_CONFIG } from './firebaseConfig.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ23456789';

export class OnlineError extends Error {
  constructor(kind, msg) {
    super(msg);
    this.kind = kind;
  }
}

export function explain(e) {
  if (e instanceof OnlineError) return e.message;
  const s = String((e && (e.code || e.message)) || e);
  if (/operation-not-allowed|admin-restricted/i.test(s)) return 'Firebase’de anonim giriş kapalı. Authentication › Sign-in method › Anonymous seçeneğini aç.';
  if (/permission[_-]denied/i.test(s)) return 'Veritabanı kuralları yüklenmemiş ya da bu işleme izin vermiyor. Realtime Database › Rules sekmesine kuralları yapıştırıp Yayınla’ya bas.';
  if (/network|offline|unavailable|timeout|zaman/i.test(s)) return 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.';
  return 'Online bağlantı hatası: ' + s;
}

let fbPromise = null;
function loadFirebase() {
  if (!fbPromise) {
    fbPromise = (async () => {
      const [{ initializeApp }, auth, m] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database')]);
      const app = initializeApp(FIREBASE_CONFIG);
      const a = auth.getAuth(app);
      if (!a.currentUser) await auth.signInAnonymously(a);
      const db = m.getDatabase(app);
      return { uid: a.currentUser.uid, db, m };
    })();
    fbPromise.catch(() => (fbPromise = null));
  }
  return fbPromise;
}

const withTimeout = (p, ms = 15000) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('zaman aşımı')), ms))]);

const genCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

class Room {
  constructor(F, code, isHost) {
    this.F = F;
    this.code = code;
    this.isHost = isHost;
    this.uid = F.uid;
    this.base = 'rooms/' + code;
    this._s = null;
    this._e = null;
    this._l = null;
    this.last = null;
    this.evq = [];
    this.peerUid = null;
    this.unsubs = [];
    this.closed = false;
    this.hadPeer = false;
    this.peerEvents = new Set();
  }
  set onState(fn) {
    this._s = fn;
    if (fn && this.last) fn(this.last);
  }
  get onState() {
    return this._s;
  }
  set onEvent(fn) {
    this._e = fn;
    if (fn) while (this.evq.length) fn(this.evq.shift());
  }
  get onEvent() {
    return this._e;
  }
  set onLeave(fn) {
    this._l = fn;
  }
  get onLeave() {
    return this._l;
  }

  ref(path) {
    return this.F.m.ref(this.F.db, this.base + '/' + path);
  }
  sendState(obj) {
    if (this.closed) return;
    this.F.m.set(this.ref('p/' + this.uid), obj).catch(() => {});
  }
  sendEvent(ev) {
    if (this.closed) return;
    const { m } = this.F;
    const r = m.push(this.ref('ev/' + this.uid), ev);
    setTimeout(() => m.remove(r).catch(() => {}), 6000);
  }

  watchPeer(peerUid) {
    if (this.peerUid === peerUid) return;
    this.peerUid = peerUid;
    const { m } = this.F;
    const u1 = m.onValue(this.ref('p/' + peerUid), (snap) => {
      const v = snap.val();
      if (v) {
        this.hadPeer = true;
        this.last = v;
        this._s?.(v);
      } else if (this.hadPeer) {
        this.last = null;
        this._s?.(null);
      }
    });
    const u2 = m.onChildAdded(this.ref('ev/' + peerUid), (snap) => {
      if (this.peerEvents.has(snap.key)) return;
      this.peerEvents.add(snap.key);
      const v = snap.val();
      if (!v) return;
      if (this._e) this._e(v);
      else this.evq.push(v);
    });
    this.unsubs.push(u1, u2);
  }

  leave() {
    if (this.closed) return;
    this.closed = true;
    const { m } = this.F;
    this.unsubs.forEach((u) => {
      try {
        u();
      } catch {}
    });
    try {
      if (this.isHost) m.remove(this.ref('')).catch(() => {});
      else {
        m.remove(this.ref('p/' + this.uid)).catch(() => {});
        m.remove(this.ref('guest')).catch(() => {});
      }
    } catch {}
  }
  close() {
    this.leave();
  }
}

export async function createRoom(game = 'golgedovus') {
  const F = await withTimeout(loadFirebase());
  const { m, db, uid } = F;
  for (let i = 0; i < 6; i++) {
    const code = genCode();
    const metaRef = m.ref(db, `rooms/${code}/meta`);
    const snap = await withTimeout(m.get(metaRef));
    if (snap.exists()) continue;
    await withTimeout(m.set(metaRef, { host: uid, game, v: 1 }));
    const room = new Room(F, code, true);
    m.onDisconnect(m.ref(db, `rooms/${code}`)).remove();
    // katılan olunca rakibi izle
    room.unsubs.push(
      m.onValue(m.ref(db, `rooms/${code}/guest`), (s) => {
        const g = s.val();
        if (g) room.watchPeer(g);
        else if (room.hadPeer && !room.closed) room._l?.();
      }),
    );
    return room;
  }
  throw new OnlineError('kod', 'Oda kodu üretilemedi, tekrar dene.');
}

export async function joinRoom(codeIn) {
  const code = String(codeIn || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(code)) throw new OnlineError('kod', 'Oda kodu 4 harf/rakamdan oluşur.');
  const F = await withTimeout(loadFirebase());
  const { m, db, uid } = F;
  const snap = await withTimeout(m.get(m.ref(db, `rooms/${code}`)));
  if (!snap.exists() || !snap.child('meta').exists()) throw new OnlineError('yok', 'Bu kodla bir oda bulunamadı.');
  const g = snap.child('guest').val();
  if (g && g !== uid) throw new OnlineError('dolu', 'Oda dolu.');
  try {
    await withTimeout(m.set(m.ref(db, `rooms/${code}/guest`), uid));
  } catch (e) {
    if (/permission[_-]denied/i.test(String(e.code || e.message))) throw new OnlineError('dolu', 'Oda dolu ya da kapanmış.');
    throw e;
  }
  const room = new Room(F, code, false);
  m.onDisconnect(m.ref(db, `rooms/${code}/guest`)).remove();
  m.onDisconnect(m.ref(db, `rooms/${code}/p/${uid}`)).remove();
  const hostUid = snap.child('meta/host').val();
  room.watchPeer(hostUid);
  // kurucu odayı kapatırsa
  room.unsubs.push(
    m.onValue(m.ref(db, `rooms/${code}/meta`), (s) => {
      if (!s.exists() && !room.closed) {
        room.hadPeer = true;
        room._s?.(null);
        room._l?.();
      }
    }),
  );
  return room;
}
