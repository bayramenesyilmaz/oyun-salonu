// Basit bulut kayıt yardımcısı (Firebase Realtime Database, yalnızca metin/JSON; Storage yok).
// Firebase yalnızca ilk kullanıldığında yüklenir. Bağlantı yoksa çağrılar hata fırlatır,
// oyunlar bunu yakalayıp çevrimdışı devam eder.
import { FIREBASE_CONFIG } from './firebaseConfig.js';

let P = null;
export function cloud() {
  if (!P) {
    P = (async () => {
      const [appM, auth, m] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database')]);
      const app = appM.getApps().length ? appM.getApp() : appM.initializeApp(FIREBASE_CONFIG);
      const a = auth.getAuth(app);
      if (!a.currentUser) await auth.signInAnonymously(a);
      const db = m.getDatabase(app);
      const R = (p) => m.ref(db, p);
      return {
        uid: a.currentUser.uid,
        get: async (p) => (await m.get(R(p))).val(),
        set: (p, v) => m.set(R(p), v),
        update: (p, v) => m.update(R(p), v),
        remove: (p) => m.remove(R(p)),
        push: (p, v) => m.push(R(p), v),
        on: (p, fn) => m.onValue(R(p), (s) => fn(s.val())),
        onChild: (p, fn) => m.onChildAdded(R(p), (s) => fn(s.key, s.val())),
        top: async (p, key, n) => {
          const s = await m.get(m.query(R(p), m.orderByChild(key), m.limitToLast(n)));
          const out = [];
          s.forEach((c) => { out.push({ id: c.key, ...c.val() }); });
          return out.reverse();
        },
        disconnectRemove: (p) => m.onDisconnect(R(p)).remove(),
        now: () => Date.now(),
      };
    })();
    P.catch(() => (P = null));
  }
  return P;
}

export const withTimeout = (p, ms = 10000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('zaman aşımı')), ms))]);

export function cloudErr(e) {
  const s = String((e && (e.code || e.message)) || e);
  if (/permission[_-]denied/i.test(s)) return 'Sunucu kuralları henüz yüklenmemiş. Oyun kaydın telefonda duruyor; online kısımlar kurallar yüklenince açılır.';
  if (/network|offline|unavailable|zaman/i.test(s)) return 'İnternete bağlanılamadı. Çevrimdışı devam ediyorsun.';
  return 'Online hata: ' + s;
}
