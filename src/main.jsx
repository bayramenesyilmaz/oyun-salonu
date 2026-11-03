import { createRoot } from 'react-dom/client';
import { GAMES } from './games.js';
import { checkUpdate, hardRefresh } from './update.js';

// Basit yönlendirme: her oyun kendi adresinde, tam sayfa yüklemesiyle açılır.
// Böylece bir oyunun kodu ve CSS'i diğerine karışmaz; yalnızca açılan oyun indirilir.
const path = location.pathname.replace(/\/+$/, '') || '/';
const game = GAMES.find((g) => path === '/' + g.id || path.startsWith('/' + g.id + '/'));

function loadFonts(href) {
  if (!href) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

// "Güncelle" sonrası adresteki ?v=… izini temizle
if (/[?&]v=/.test(location.search)) {
  const u = new URL(location.href);
  u.searchParams.delete('v');
  history.replaceState(null, '', u.pathname + u.search + u.hash);
}

async function boot() {
  let mod;
  if (game) {
    // oyun açılırken yeni yayın varsa önbelleği bir kez kendiliğinden temizle
    const v = await checkUpdate(1500);
    const key = 'oyun-guncel-' + (v && v.id);
    if (v && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      return hardRefresh();
    }
    document.title = game.title;
    loadFonts(game.fonts);
    mod = await game.load();
  } else {
    document.title = 'Oyun Salonu';
    loadFonts('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500&display=swap');
    mod = await import('./portal/Portal.jsx');
  }
  const App = mod.default;
  createRoot(document.getElementById('root')).render(<App />);
}
boot();

// PWA: yayın sürümünde service worker (vite-plugin-pwa)
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
