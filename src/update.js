// Sürüm kontrolü ve "Güncelle": eski önbellek yüzünden yeni yayın görünmüyorsa her şeyi temizleyip yeniden yükler.
/* global __BUILD_ID__, __BUILD_TIME__ */
export const BUILD = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
export const BUILT_AT = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null;

// Sunucudaki sürüm bu sayfadakinden farklıysa onu döndürür
export async function checkUpdate(timeoutMs = 4000) {
  if (!import.meta.env.PROD) return null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const r = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const v = await r.json();
    return v && v.id && v.id !== BUILD ? v : null;
  } catch {
    return null;
  }
}

// Service worker'ı ve tüm önbellekleri sil, sayfayı tazeden aç
export async function hardRefresh() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch { /* yok say */ }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch { /* yok say */ }
  const u = new URL(location.href);
  u.searchParams.set('v', Date.now().toString(36));
  location.replace(u.toString());
}

export function fmtBuild(iso) {
  if (!iso) return 'geliştirme';
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}
