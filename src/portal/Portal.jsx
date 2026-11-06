import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { VISIBLE as GAMES } from '../games.js';
import AdSlot from './AdSlot.jsx';
import { BUILT_AT, checkUpdate, fmtBuild, hardRefresh } from '../update.js';
import './portal.css';

// Türkçe harflere duyarsız arama: "kusyolu" yazan "Kuşyolu"yu bulur
const norm = (s) =>
  (s || '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c]);

const DAY = 86400000;
const isNew = (g) => !!g.news && !!g.updated && Date.now() - new Date(g.updated + 'T12:00:00').getTime() < 14 * DAY;
const fmtDay = (d) => new Date(d + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

function readLast() {
  try {
    return JSON.parse(localStorage.getItem('portal-son') || '{}');
  } catch {
    return {};
  }
}

export default function Portal() {
  const [installEvt, setInstallEvt] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Tümü');
  const [sort, setSort] = useState('yeni');
  const [upd, setUpd] = useState(null); // sunucudaki yeni sürüm
  const [busy, setBusy] = useState(false);
  // "Güncelle"den sonra sayfa yeniden açıldığında bilgi ver
  const [checked, setChecked] = useState(() => {
    try {
      const v = sessionStorage.getItem('portal-guncellendi');
      sessionStorage.removeItem('portal-guncellendi');
      return v;
    } catch {
      return null;
    }
  });
  const [last] = useState(readLast);
  const searchRef = useRef(null);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;

  useEffect(() => {
    const f = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  // açılışta, sekmeye dönüldüğünde ve birkaç dakikada bir yeni sürüm var mı bak
  useEffect(() => {
    let alive = true;
    const run = () => checkUpdate().then((v) => alive && v && setUpd(v));
    run();
    const id = setInterval(run, 5 * 60 * 1000);
    const vis = () => !document.hidden && run();
    document.addEventListener('visibilitychange', vis);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  // "/" ile aramaya odaklan
  useEffect(() => {
    const k = (e) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current && searchRef.current.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) setQ('');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try {
      await installEvt.userChoice;
    } catch {
      /* yok say */
    }
    setInstallEvt(null);
  };

  // Güncelle: yeni sürüm varsa hemen yükler; yoksa yine de önbelleği temizleyip tazeden açar
  const update = async () => {
    setBusy(true);
    const v = upd || (await checkUpdate());
    try {
      sessionStorage.setItem('portal-guncellendi', v ? 'yeni' : 'ayni');
    } catch { /* yok say */ }
    await hardRefresh();
  };

  const cats = useMemo(() => {
    const s = new Set();
    GAMES.forEach((g) => (g.cats || []).forEach((c) => s.add(c)));
    return ['Tümü', 'Yeni', ...[...s].sort((a, b) => a.localeCompare(b, 'tr'))];
  }, []);

  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    let out = GAMES.filter((g) => {
      if (cat === 'Yeni' && !isNew(g)) return false;
      if (cat !== 'Tümü' && cat !== 'Yeni' && !(g.cats || []).includes(cat)) return false;
      if (!words.length) return true;
      const hay = norm([g.title, g.tag, g.blurb, g.news, g.keywords, ...(g.cats || [])].join(' '));
      return words.every((w) => hay.includes(w));
    });
    if (sort === 'az') out = [...out].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    else if (sort === 'son') out = [...out].sort((a, b) => (last[b.id] || 0) - (last[a.id] || 0));
    else out = [...out].sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    return out;
  }, [q, cat, sort, last]);

  const news = GAMES.filter((g) => g.news && isNew(g)).sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 3);
  const lastId = Object.entries(last).sort((a, b) => b[1] - a[1])[0]?.[0];
  const lastGame = GAMES.find((g) => g.id === lastId);
  const remember = (id) => {
    try {
      localStorage.setItem('portal-son', JSON.stringify({ ...readLast(), [id]: Date.now() }));
    } catch { /* yok say */ }
  };

  return (
    <div className="portal">
      <header className="p-head">
        <div className="p-logo">
          <span className="p-mark" aria-hidden="true" />
          <span>OYUN SALONU</span>
        </div>
        <div className="p-actions">
          <span className="p-ver" title="Bu sayfanın yayın zamanı">Sürüm · {fmtBuild(BUILT_AT)}</span>
          <button className={'p-btn' + (upd ? ' hot' : '')} onClick={update} disabled={busy}>
            <span className={'p-ico' + (busy ? ' spin' : '')} aria-hidden="true">↻</span>
            {busy ? 'Güncelleniyor…' : upd ? 'Yeni sürüm · Güncelle' : 'Güncelle'}
          </button>
          {installEvt ? (
            <button className="p-btn ghost" onClick={install}>Uygulama olarak yükle</button>
          ) : ios && !standalone ? (
            <span className="p-hint">Paylaş → Ana Ekrana Ekle</span>
          ) : null}
        </div>
      </header>

      {upd && !busy && (
        <div className="p-banner" role="status">
          <span>Oyunların yeni sürümü yayında ({fmtBuild(upd.time)}).</span>
          <button onClick={update}>Şimdi güncelle</button>
        </div>
      )}
      {checked && !upd && (
        <div className="p-banner calm" role="status">
          {checked === 'yeni' ? 'Güncellendi. En yeni sürümdesin.' : 'Zaten en yeni sürümdesin. Önbellek temizlendi, her şey tazeden yüklendi.'}
          <button onClick={() => setChecked(null)}>Tamam</button>
        </div>
      )}

      <main>
        <section className="p-hero">
          <div>
            <h1>Tarayıcıda oynanan,<br />Anadolu'dan hikâyeler.</h1>
            <p className="p-lead">Kurulum yok, hesap yok. Bilgisayarda klavye ve fareyle, telefonda dokunmatik kontrollerle oyna.</p>
            {lastGame && (
              <a className="p-continue" href={'/' + lastGame.id} style={{ '--c': lastGame.color }} onClick={() => remember(lastGame.id)}>
                <img src={lastGame.icon} alt="" />
                <span><small>Kaldığın yerden</small>{lastGame.title}</span>
                <b>→</b>
              </a>
            )}
          </div>
          {news.length > 0 && (
            <aside className="p-news">
              <h3>Yenilikler</h3>
              {news.map((g) => (
                <a key={g.id} href={'/' + g.id} style={{ '--c': g.color }} onClick={() => remember(g.id)}>
                  <img src={g.icon} alt="" />
                  <span>
                    <b>{g.title}</b>
                    <em>{g.news}</em>
                  </span>
                  <time>{fmtDay(g.updated)}</time>
                </a>
              ))}
            </aside>
          )}
        </section>

        <section className="p-tools">
          <label className="p-search">
            <span aria-hidden="true">⌕</span>
            <input ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Oyun ara: korku, uzay, dedektif…" aria-label="Oyun ara" />
            {q ? (
              <button className="p-clear" onClick={() => setQ('')} aria-label="Aramayı temizle">×</button>
            ) : (
              <kbd>/</kbd>
            )}
          </label>
          <select className="p-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sırala">
            <option value="yeni">En son güncellenen</option>
            <option value="son">Son oynadığım</option>
            <option value="az">A → Z</option>
          </select>
        </section>
        <nav className="p-chips" aria-label="Kategoriler">
          {cats.map((c) => {
            const n = c === 'Tümü' ? GAMES.length : c === 'Yeni' ? GAMES.filter(isNew).length : GAMES.filter((g) => (g.cats || []).includes(c)).length;
            return (
              <button key={c} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>
                {c}
                <i>{n}</i>
              </button>
            );
          })}
        </nav>

        <AdSlot slot="portal-top" />
        {list.length === 0 ? (
          <div className="p-empty">
            <p>“{q}” için oyun bulunamadı.</p>
            <button onClick={() => { setQ(''); setCat('Tümü'); }}>Filtreleri temizle</button>
          </div>
        ) : (
          <div className="p-grid">
            {list.map((g, i) => (
              <Fragment key={g.id}>
              {i === 6 && <AdSlot slot="portal-feed" feed />}
              <a className="p-card" href={'/' + g.id} style={{ '--c': g.color }} onClick={() => remember(g.id)}>
                <div className="p-cover">
                  <img src={g.cover || g.icon} alt="" loading="lazy" />
                  {isNew(g) && <span className="p-badge">Yeni</span>}
                  {last[g.id] && <span className="p-badge dim">Oynadın</span>}
                </div>
                <div className="p-body">
                  <span className="p-tag">{g.tag}</span>
                  <h2>{g.title}</h2>
                  {g.news && isNew(g) && <span className="p-newsline">{g.news}</span>}
                  <p>{g.blurb}</p>
                  <div className="p-meta">
                    {g.length && <span>{g.length}</span>}
                    {g.updated && <span>Güncellendi: {fmtDay(g.updated)}</span>}
                  </div>
                  <span className="p-play">Oyna <b>→</b></span>
                </div>
              </a>
              </Fragment>
            ))}
          </div>
        )}
      </main>

      <AdSlot slot="portal-bottom" />
      <footer className="p-foot">
        <span>Tüm oyunlar ücretsiz ve açık kaynak araçlarla yapıldı. İlerlemen bu cihazda saklanır.</span>
        <span>Yeni bir şey görünmüyorsa üstteki “Güncelle” düğmesine bas.</span>
      </footer>
    </div>
  );
}
