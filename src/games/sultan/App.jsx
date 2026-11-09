import { useEffect, useRef, useState } from 'react';
import './sultan.css';
import { B, T, GRID, LIMIT, RANKS, REQ_TXT, CHAPTERS, WHO, SEFER_NAMES, RES, cost, btime, bhp, prodRate, prodCap, armyCapOf, tStat, genVillage, seferLoot, newVillage } from './data.js';
import { drawScene, drawBattle, fitView, toGrid, createBattle, deploy, stepBattle, canDeploy } from './world.js';
import { cloud, cloudErr, withTimeout } from '../../engine/cloud.js';

const KEY = 'sultan-v1';
const QS = new URLSearchParams(location.search);
const now = () => Date.now();
const clone = (o) => JSON.parse(JSON.stringify(o));
const fmt = (n) => Math.floor(n).toLocaleString('tr-TR');
const dur = (s) => { s = Math.max(0, Math.ceil(s)); if (s < 60) return s + ' sn'; if (s < 3600) return Math.floor(s / 60) + ' dk ' + (s % 60 ? (s % 60) + ' sn' : ''); return Math.floor(s / 3600) + ' sa ' + Math.floor((s % 3600) / 60) + ' dk'; };
const gemFor = (sec) => Math.max(1, Math.ceil(sec / 120));

function newSave(name) {
  return { v: 1, name, rank: 0, res: { a: 600, o: 600, y: 400 }, gems: 30, bs: newVillage().map((b) => ({ ...b, t: now(), busy: null })), nid: 10, army: { piyade: 10 }, queue: [], sefer: {}, stats: { egit: 10, yagma: 0, savun: 0 }, tro: 0, seen: {}, clan: null, news: [] };
}
const loadSave = () => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 1 ? s : null; } catch { return null; } };

// ---------- türetilmiş değerler ----------
const konakLv = (s) => (s.bs.find((b) => b.k === 'konak') || { lv: 1 }).lv;
const capOf = (s) => 1000 * konakLv(s) + s.bs.filter((b) => b.k === 'ambar' && b.lv > 0).reduce((a, b) => a + B.ambar.cap * b.lv, 0);
const armyCap = (s) => s.bs.filter((b) => b.k === 'ordugah' && b.lv > 0).reduce((a, b) => a + armyCapOf(b.lv), 0);
const armyUsed = (s) => Object.entries(s.army).reduce((a, [k, n]) => a + n * T[k].sz, 0) + s.queue.reduce((a, q) => a + T[q.k].sz, 0);
const kislaLv = (s) => Math.max(0, ...s.bs.filter((b) => b.k === 'kisla').map((b) => b.lv));
const smithLv = (s) => Math.max(0, ...s.bs.filter((b) => b.k === 'demirci').map((b) => b.lv));
const builders = (s) => 1 + (s.bs.some((b) => b.k === 'usta' && b.lv > 0) ? 1 : 0);
const busyCount = (s) => s.bs.filter((b) => b.busy).length;
const countOf = (s, k) => s.bs.filter((b) => b.k === k).length;
const seferWon = (s) => Object.values(s.sefer).filter((x) => x >= 1).length;
const starsTotal = (s) => Object.values(s.sefer).reduce((a, b) => a + b, 0);
const pending = (b) => (B[b.k].prod && b.lv > 0 && !b.busy ? Math.min(prodCap(b.k, b.lv), (prodRate(b.k, b.lv) * (now() - b.t)) / 3600000) : 0);
function reqVal(s, k) { return k === 'konak' ? konakLv(s) : k === 'sefer' ? seferWon(s) : k === 'egit' ? s.stats.egit : k === 'yagma' ? s.stats.yagma : k === 'kule' ? s.bs.filter((b) => b.k === 'kule' && b.lv > 0).length : k === 'yildiz' ? starsTotal(s) : 0; }

function tickSave(s) {
  const t = now(); let changed = false; const done = [];
  for (const b of s.bs) if (b.busy && b.busy.until <= t) { b.lv = b.busy.to; b.busy = null; b.t = t; changed = true; done.push(b); }
  while (s.queue.length && s.queue[0].until <= t) { const q = s.queue.shift(); s.army[q.k] = (s.army[q.k] || 0) + 1; s.stats.egit++; changed = true; }
  return { changed, done };
}

// ---------- küçük bileşenler ----------
function Face({ who, size = 54 }) {
  const c = WHO[who] || WHO.narr;
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="29" fill={c.c} />
      <circle cx="30" cy="34" r="16" fill={who === 'karahan' ? '#c9a27e' : '#f2c9a0'} />
      {who === 'alper' && <><path d="M12 28 Q30 4 48 28 L44 24 Q30 12 16 24Z" fill="#c0c0c8" /><path d="M22 44 Q30 50 38 44" stroke="#5a3d24" strokeWidth="4" fill="none" /></>}
      {who === 'sevda' && <><path d="M12 36 Q10 10 30 12 Q50 10 48 36 L42 30 Q30 20 18 30Z" fill="#3a2a22" /><circle cx="30" cy="12" r="4" fill="#ffd23f" /></>}
      {who === 'karahan' && <><path d="M14 26 L18 8 L24 18 L30 6 L36 18 L42 8 L46 26Z" fill="#ffd23f" /><path d="M20 44 Q30 54 40 44 L36 50 Q30 56 24 50Z" fill="#1a1a1a" /></>}
      <circle cx="24" cy="33" r="2.4" fill="#222" /><circle cx="36" cy="33" r="2.4" fill="#222" />
      {who === 'karahan' ? <path d="M20 28 L27 31 M40 28 L33 31" stroke="#222" strokeWidth="2.5" /> : <path d="M25 41 Q30 44 35 41" stroke="#222" strokeWidth="2" fill="none" />}
    </svg>
  );
}
function Res({ k, v, cap }) { return <span className={'sl-res r-' + k}><i />{fmt(v)}{cap ? <small>/{fmt(cap)}</small> : null}</span>; }
function Cost({ c, s }) { return <span className="sl-cost">{c.a > 0 && <span className={s && s.res.a < c.a ? 'no' : ''}><i className="ra" />{fmt(c.a)}</span>}{c.o > 0 && <span className={s && s.res.o < c.o ? 'no' : ''}><i className="ro" />{fmt(c.o)}</span>}{c.y > 0 && <span className={s && s.res.y < c.y ? 'no' : ''}><i className="ry" />{fmt(c.y)}</span>}</span>; }
function Stars({ n, size = 18 }) { return <span className="sl-stars">{[0, 1, 2].map((i) => <svg key={i} width={size} height={size} viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z" fill={i < n ? '#ffd23f' : '#4a3f7a'} stroke="#1c1442" strokeWidth="1" /></svg>)}</span>; }

// ---------- köy tuvali ----------
function Village({ save, sel, place, onTap, bad }) {
  const cv = useRef(null), V = useRef(null), sr = useRef({ save, sel, place }); sr.current = { save, sel, place };
  const ptrs = useRef(new Map()), drag = useRef(null);
  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d'); let raf;
    const loop = () => {
      const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); if (!V.current) V.current = fitView(w, h, 1.3); }
      if (!V.current) V.current = fitView(w, h, 1.3);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { save: s, sel: sl, place: pl } = sr.current, t = now();
      const list = s.bs.slice();
      if (pl && pl.at) list.push({ k: pl.k, lv: 1, x: pl.at[0], y: pl.at[1], ghost: true, id: -1 });
      drawScene(ctx, V.current, w, h, list, {
        bad: pl ? (gx, gy) => bad(gx, gy, pl) : null,
        decor: (b) => {
          if (b.ghost) return { ghost: true, sel: true };
          const o = { sel: sl === b.id, ghost: b.lv === 0 };
          if (b.busy) { const tot = b.busy.until - b.busy.start, left = (b.busy.until - t) / 1000; o.busy = dur(left); o.busyP = Math.min(1, 1 - (b.busy.until - t) / Math.max(1, tot)); }
          else if (B[b.k].prod && b.lv > 0) { const p = pending(b); if (p >= Math.max(10, prodCap(b.k, b.lv) * 0.15)) o.ready = B[b.k].prod; }
          if (b.k === 'kisla' && s.queue.length) { o.busy = T[s.queue[0].k].n + ' ' + dur((s.queue[0].until - t) / 1000); o.busyP = 0.5; }
          return o;
        },
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const wheel = (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.1 : 0.9); };
    c.addEventListener('wheel', wheel, { passive: false });
    return () => { cancelAnimationFrame(raf); c.removeEventListener('wheel', wheel); };
  }, []);
  const zoomAt = (x, y, f) => { const v = V.current; const nz = Math.max(0.35, Math.min(2.4, v.z * f)); const k = nz / v.z; v.ox = x - (x - v.ox) * k; v.oy = y - (y - v.oy) * k; v.z = nz; };
  const down = (e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yok */ } ptrs.current.set(e.pointerId, [e.nativeEvent.offsetX, e.nativeEvent.offsetY]); drag.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, moved: 0, pd: null }; };
  const move = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const p = [e.nativeEvent.offsetX, e.nativeEvent.offsetY], prev = ptrs.current.get(e.pointerId); ptrs.current.set(e.pointerId, p);
    const v = V.current; if (!v) return;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (drag.current.pd) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / drag.current.pd);
      drag.current.pd = d; drag.current.moved = 99; return;
    }
    const { place: pl } = sr.current;
    if (pl) { const [gx, gy] = toGrid(v, p[0], p[1]); onTap(gx, gy, 'hover'); drag.current.moved += Math.hypot(p[0] - prev[0], p[1] - prev[1]); return; }
    v.ox += p[0] - prev[0]; v.oy += p[1] - prev[1]; drag.current.moved += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
  };
  const up = (e) => {
    ptrs.current.delete(e.pointerId);
    const d = drag.current; if (!d) return;
    if (d.moved < 10 || (sr.current.place && d.moved < 400)) { const [gx, gy] = toGrid(V.current, e.nativeEvent.offsetX, e.nativeEvent.offsetY); onTap(gx, gy, 'tap'); }
    if (!ptrs.current.size) drag.current = null;
  };
  return <canvas ref={cv} className="sl-cv" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={(e) => ptrs.current.delete(e.pointerId)} />;
}

// ---------- savaş ekranı ----------
function Battle({ layout, army, smith, title, loot, onEnd }) {
  const cv = useRef(null), V = useRef(null), st = useRef(null);
  const [hud, setHud] = useState({ t: 180, pct: 0, stars: 0, army: { ...army } });
  const [pickT, setPickT] = useState(Object.keys(army).find((k) => army[k] > 0) || null);
  const pk = useRef(pickT); pk.current = pickT;
  const [speed, setSpeed] = useState(1); const sp = useRef(1); sp.current = speed;
  const [done, setDone] = useState(null);
  useEffect(() => {
    const s = createBattle(layout, army, smith);
    st.current = s; if (QS.has('test')) window.__slb = s;
    s.onEnd = (x) => setTimeout(() => setDone({ stars: x.stars, pct: x.pct }), 700);
    const c = cv.current, ctx = c.getContext('2d'); let raf, last = performance.now(), lh = '';
    const loop = (tm) => {
      const dt = Math.min(0.05, (tm - last) / 1000); last = tm;
      for (let i = 0; i < sp.current; i++) stepBattle(s, dt);
      const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); V.current = fitView(w, h, 1.22); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBattle(ctx, V.current, w, h, s, { showBad: !s.started || pk.current });
      const k = [Math.ceil(s.dur - s.t), s.pct, s.stars, JSON.stringify(s.army)].join('|');
      if (k !== lh) { lh = k; setHud({ t: s.dur - s.t, pct: s.pct, stars: s.stars, army: { ...s.army } }); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const dragging = useRef(null);
  const drop = (e) => {
    const s = st.current, k = pk.current; if (!s || !k || !V.current) return;
    const r = cv.current.getBoundingClientRect(); const [gx, gy] = toGrid(V.current, e.clientX - r.left, e.clientY - r.top);
    if (!canDeploy(s, gx, gy)) { dragging.current && (dragging.current.bad = true); return; }
    if (deploy(s, k, gx, gy)) { if (!s.army[k]) { const nk = Object.keys(s.army).find((x) => s.army[x] > 0); setPickT(nk || null); } }
  };
  const down = (e) => { dragging.current = { t: 0 }; drop(e); };
  const move = (e) => { if (!dragging.current) return; dragging.current.t++; if (dragging.current.t % 4 === 0) drop(e); };
  const up = () => { dragging.current = null; };
  const finish = () => { const s = st.current; if (s && !s.over) { s.over = true; setDone({ stars: s.stars, pct: s.pct }); } };
  return (
    <div className="sl-battle">
      <div className="sl-btop">
        <div><b>{title}</b><small>Ganimet: <Cost c={{ a: Math.round(loot.a * hud.pct / 100), o: Math.round(loot.o * hud.pct / 100), y: Math.round(loot.y * hud.pct / 100) }} /></small></div>
        <div className="sl-bpct"><Stars n={hud.stars} /><b>%{hud.pct}</b><small>{dur(hud.t)}</small></div>
      </div>
      <canvas ref={cv} className="sl-cv" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      {!st.current?.started && <div className="sl-bhint">Bir asker seç, kırmızı olmayan bir yere dokun ya da sürükle.</div>}
      <div className="sl-bbar">
        {Object.entries(hud.army).filter(([, n]) => n >= 0).map(([k, n]) => (
          <button key={k} className={'sl-troop' + (pickT === k ? ' on' : '') + (!n ? ' empty' : '')} onClick={() => setPickT(k)} disabled={!n}>
            <i style={{ background: T[k].col }} /><b>{T[k].n}</b><small>x{n}</small>
          </button>
        ))}
        <button className="sl-sp" onClick={() => setSpeed(speed === 1 ? 2 : 1)}>x{speed}</button>
        <button className="sl-end" onClick={finish}>Bitir</button>
      </div>
      {done && (
        <div className="sl-modal"><div className="sl-mcard center">
          <h2>{done.stars ? 'Zafer!' : 'Yenilgi'}</h2>
          <Stars n={done.stars} size={44} />
          <p>Yıkım: %{done.pct}</p>
          <Cost c={{ a: Math.round(loot.a * done.pct / 100), o: Math.round(loot.o * done.pct / 100), y: Math.round(loot.y * done.pct / 100) }} />
          <button className="pri big" onClick={() => onEnd({ ...done, left: { ...st.current.army } })}>Köye dön</button>
        </div></div>
      )}
    </div>
  );
}

// ---------- ana uygulama ----------
export default function App() {
  const [save, setSave] = useState(loadSave);
  const S = useRef(save); S.current = save;
  const [scr, setScr] = useState(save ? 'village' : 'start');
  const [sel, setSel] = useState(null);
  const [place, setPlace] = useState(null);
  const [panel, setPanel] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [toast, setToast] = useState(null);
  const [battle, setBattle] = useState(null);
  const [nm, setNm] = useState('');
  const [clanUI, setClanUI] = useState({ st: 'idle', list: [], msgs: [], input: '', name: '' });
  const [raid, setRaid] = useState(null);
  const [, force] = useState(0);
  useEffect(() => { document.title = 'Sultanlık Yolu'; }, []);

  const persist = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* dolu */ } };
  const say = (x) => { setToast(x); clearTimeout(say.t); say.t = setTimeout(() => setToast(null), 2600); };
  const mut = (fn) => { const s = clone(S.current); const r = fn(s); persist(s); S.current = s; setSave(s); upload(s); return r; };

  // zamanlayıcı
  useEffect(() => {
    if (!save) return undefined;
    const id = setInterval(() => {
      const s = clone(S.current); const r = tickSave(s);
      if (r.changed) { persist(s); S.current = s; setSave(s); r.done.forEach((b) => say(`${B[b.k].n} ${b.lv}. seviye hazır!`)); upload(s); }
      else force((x) => x + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [!!save]);

  // bulut: köyü yükle, savunma raporlarını al
  const upTimer = useRef(null);
  const upload = (s) => {
    clearTimeout(upTimer.current);
    upTimer.current = setTimeout(async () => {
      try {
        const F = await withTimeout(cloud(), 8000);
        const lay = s.bs.filter((b) => b.lv > 0).map((b) => ({ k: b.k, lv: b.lv, x: b.x, y: b.y }));
        await F.set(`sultan/players/${F.uid}`, { n: s.name.slice(0, 20), rank: s.rank, kl: konakLv(s), tro: s.tro, lay: JSON.stringify(lay), res: { a: Math.floor(s.res.a * 0.25), o: Math.floor(s.res.o * 0.25), y: Math.floor(s.res.y * 0.25) }, clan: s.clan ? s.clan.n : '', t: Date.now() });
        if (s.clan) F.set(`sultan/clans/${s.clan.id}/m/${F.uid}`, { n: s.name.slice(0, 20), rank: s.rank, tro: s.tro }).catch(() => {});
      } catch { /* çevrimdışı */ }
    }, 2500);
  };
  useEffect(() => {
    if (!save) return;
    (async () => {
      try {
        const F = await withTimeout(cloud(), 8000);
        const logs = await F.get(`sultan/logs/${F.uid}`);
        if (logs) {
          const list = Object.values(logs);
          let lost = { a: 0, o: 0, y: 0 };
          mut((s) => { for (const l of list) for (const k of ['a', 'o', 'y']) { const v = Math.min(s.res[k], l.loot?.[k] || 0); s.res[k] -= v; lost[k] += v; } s.tro = Math.max(0, s.tro - list.reduce((a, l) => a + (l.stars || 0) * 6, 0)); s.stats.savun += list.length; });
          await F.remove(`sultan/logs/${F.uid}`);
          setPanel({ k: 'defrep', list, lost });
        }
        upload(S.current);
      } catch { /* çevrimdışı */ }
    })();
    // günlük hediye
    const today = new Date().toDateString();
    if (S.current && S.current.daily !== today) {
      const first = !S.current.daily;
      mut((sv) => { sv.daily = today; if (!first) { sv.gems += 5; const c = capOf(sv); sv.res.a = Math.min(c, sv.res.a + 300); sv.res.o = Math.min(c, sv.res.o + 300); sv.res.y = Math.min(c, sv.res.y + 200); } });
      if (!first) setTimeout(() => say('Günlük hediye: 5 elmas, 300 altın, 300 odun, 200 yemek'), 800);
    }
  }, [!!save]);

  // ---------- başlangıç ----------
  if (scr === 'start' || !save) {
    return (
      <div className="sl sl-start">
        <div className="sl-logo">SULTANLIK<br /><span>YOLU</span></div>
        <p className="sl-sub">Çırak olarak başla, köyünü büyüt, ordunu kur. Kara Han'ı yen ve Gökyurt'un sultanı ol.</p>
        <div className="sl-card">
          <label>Adın</label>
          <input value={nm} maxLength={16} onChange={(e) => setNm(e.target.value)} placeholder="ör. Bayram" />
          <button className="pri big" disabled={nm.trim().length < 2} onClick={() => { const s = newSave(nm.trim()); persist(s); setSave(s); setScr('village'); setDlg({ lines: CHAPTERS[0].intro, k: 'c0i' }); }}>Başla</button>
        </div>
        {toast && <div className="sl-toast">{toast}</div>}
      </div>
    );
  }

  const s = save, cap = capOf(s), kl = konakLv(s), ac = armyCap(s), au = armyUsed(s);
  const can = (c) => s.res.a >= (c.a || 0) && s.res.o >= (c.o || 0) && s.res.y >= (c.y || 0);
  const occupied = (sv, ignoreId) => { const g = Array.from({ length: GRID }, () => Array(GRID).fill(0)); for (const b of sv.bs) { if (b.id === ignoreId) continue; const z = B[b.k].sz; for (let i = 0; i < z; i++) for (let j = 0; j < z; j++) if (g[b.y + j]) g[b.y + j][b.x + i] = 1; } return g; };
  const fits = (k, x, y, ignoreId) => { const z = B[k].sz; if (x < 0 || y < 0 || x + z > GRID || y + z > GRID) return false; const g = occupied(S.current, ignoreId); for (let i = 0; i < z; i++) for (let j = 0; j < z; j++) if (g[y + j][x + i]) return false; return true; };
  const freeSpot = (k) => { const c = GRID / 2; let best = null, bd = 1e9; for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (fits(k, x, y)) { const d = Math.hypot(x - c + 1, y - c + 1) + (k === 'sur' ? 0 : Math.random() * 0.01); if (d < bd) { bd = d; best = [x, y]; } } return best; };
  const badCell = (gx, gy, pl) => { if (!pl || !pl.at) return false; const z = B[pl.k].sz; return gx >= pl.at[0] && gx < pl.at[0] + z && gy >= pl.at[1] && gy < pl.at[1] + z && !fits(pl.k, pl.at[0], pl.at[1], pl.move); };

  const onTap = (gx, gy, kind) => {
    if (place) {
      const z = B[place.k].sz, x = Math.round(gx - z / 2), y = Math.round(gy - z / 2);
      setPlace((p) => ({ ...p, at: [x, y] }));
      return;
    }
    if (kind !== 'tap') return;
    const b = s.bs.find((q) => gx >= q.x && gx < q.x + B[q.k].sz && gy >= q.y && gy < q.y + B[q.k].sz);
    if (!b) { setSel(null); setPanel(null); return; }
    if (B[b.k].prod && pending(b) >= 1) { collect(b.id); return; }
    setSel(b.id); setPanel({ k: 'bld', id: b.id });
  };
  const collect = (id) => {
    mut((x) => {
      const b = x.bs.find((q) => q.id === id), r = B[b.k].prod, amt = Math.floor(pending(b)), room = capOf(x) - x.res[r];
      const take = Math.max(0, Math.min(amt, room));
      x.res[r] += take; const rest = amt - take;
      b.t = now() - (rest / prodRate(b.k, b.lv)) * 3600000;
      if (rest > 0) setTimeout(() => say('Depo dolu! Ambar yap ya da geliştir.'), 0);
    });
  };
  const confirmPlace = () => {
    if (!place || !place.at) return;
    const [x, y] = place.at;
    if (!fits(place.k, x, y, place.move)) return say('Buraya sığmıyor.');
    if (place.move) { mut((sv) => { const b = sv.bs.find((q) => q.id === place.move); b.x = x; b.y = y; }); setPlace(null); return; }
    const c = cost(place.k, 1);
    if (!can(c)) return say('Kaynak yetmiyor.');
    if (busyCount(s) >= builders(s) && place.k !== 'sur') return say('Tüm ustalar meşgul.');
    mut((sv) => {
      sv.res.a -= c.a; sv.res.o -= c.o;
      const id = sv.nid++, tt = btime(place.k, 1);
      const nb = { id, k: place.k, lv: 0, x, y, t: now(), busy: { start: now(), until: now() + tt * 1000, to: 1 } };
      if (place.k === 'sur') { nb.lv = 1; nb.busy = null; }
      sv.bs.push(nb);
    });
    if (place.k === 'sur' && countOf(S.current, 'sur') < LIMIT.sur[kl - 1]) { setPlace({ k: 'sur', at: [x + 1, y] }); return; }
    setPlace(null); SFX();
  };
  const upgrade = (id) => {
    const b = s.bs.find((q) => q.id === id), nl = b.lv + 1, c = cost(b.k, nl);
    if (nl > B[b.k].max) return;
    if (b.k !== 'konak' && nl > kl + (b.k === 'sur' ? 0 : 0) && nl > kl) return say(`Önce Konak ${nl}. seviye olmalı.`);
    if (!can(c)) return say('Kaynak yetmiyor.');
    if (busyCount(s) >= builders(s) && b.k !== 'sur') return say('Tüm ustalar meşgul.');
    mut((sv) => { const q = sv.bs.find((x) => x.id === id); sv.res.a -= c.a; sv.res.o -= c.o; if (q.k === 'sur') { q.lv = nl; return; } const tt = btime(q.k, nl); q.busy = { start: now(), until: now() + tt * 1000, to: nl }; });
    SFX();
  };
  const speedup = (id) => {
    const b = s.bs.find((q) => q.id === id); if (!b.busy) return;
    const g = gemFor((b.busy.until - now()) / 1000);
    if (s.gems < g) return say('Elmas yetmiyor.');
    mut((sv) => { const q = sv.bs.find((x) => x.id === id); sv.gems -= g; q.busy.until = now(); tickSave(sv); });
  };
  const train = (k) => {
    const t = T[k];
    if (t.kisla > kislaLv(s)) return say(`Kışla ${t.kisla}. seviye gerekli.`);
    if (au + t.sz > ac) return say('Ordugâh dolu. Yeni ordugâh yap ya da geliştir.');
    if (s.res.y < t.cost) return say('Yemek yetmiyor.');
    mut((sv) => { sv.res.y -= t.cost; const last = sv.queue.length ? sv.queue[sv.queue.length - 1].until : now(); sv.queue.push({ k, until: Math.max(last, now()) + t.t * 1000 }); });
  };
  const finishQueue = () => {
    if (!s.queue.length) return;
    const g = gemFor((s.queue[s.queue.length - 1].until - now()) / 1000);
    if (s.gems < g) return say('Elmas yetmiyor.');
    mut((sv) => { sv.gems -= g; sv.queue.forEach((q) => (q.until = now())); tickSave(sv); });
  };
  function SFX() { try { const A = new (window.AudioContext || window.webkitAudioContext)(); const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 520; o.type = 'triangle'; g.gain.value = 0.06; g.gain.exponentialRampToValueAtTime(0.001, A.currentTime + 0.2); o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + 0.2); } catch { /* ses yok */ } }

  // ---------- sefer ----------
  const openSefer = (i) => {
    const ch = Math.floor(i / 6);
    if (!s.seen['c' + ch + 'i']) { mut((sv) => { sv.seen['c' + ch + 'i'] = 1; }); setDlg({ lines: CHAPTERS[ch].intro }); }
    setPanel({ k: 'sefer', i });
  };
  const startBattle = (cfg) => {
    const total = Object.values(s.army).reduce((a, b) => a + b, 0);
    if (!total) return say('Ordun boş. Kışlada asker eğit.');
    setBattle({ ...cfg, army: { ...s.army }, smith: smithLv(s) });
    setPanel(null); setScr('battle');
  };
  const endBattle = (r) => {
    const cfg = battle;
    const got = { a: Math.round(cfg.loot.a * r.pct / 100), o: Math.round(cfg.loot.o * r.pct / 100), y: Math.round(cfg.loot.y * r.pct / 100) };
    let outro = null, gem = 0;
    mut((sv) => {
      sv.army = r.left; // kullanılan askerler gider
      const c = capOf(sv);
      for (const k of ['a', 'o', 'y']) sv.res[k] = Math.min(c, sv.res[k] + got[k]);
      if (cfg.kind === 'sefer') {
        const prev = sv.sefer[cfg.i] || 0;
        if (r.stars > prev) { gem = r.stars - prev; sv.gems += gem; sv.sefer[cfg.i] = r.stars; }
        if (r.stars >= 1 && prev === 0 && cfg.i % 6 === 5) outro = CHAPTERS[Math.floor(cfg.i / 6)].outro;
        sv.news.unshift(`${SEFER_NAMES[cfg.i]}: ${r.stars} yıldız, %${r.pct}`);
      } else if (cfg.kind === 'yagma') {
        if (r.stars >= 1) { sv.stats.yagma++; sv.tro += r.stars * 10; } else sv.tro = Math.max(0, sv.tro - 8);
        sv.news.unshift(`${cfg.title}: ${r.stars} yıldız, kupa ${r.stars ? '+' + r.stars * 10 : '-8'}`);
      }
      sv.news = sv.news.slice(0, 30);
    });
    if (cfg.kind === 'yagma' && cfg.uid) {
      (async () => {
        try {
          const F = await withTimeout(cloud(), 8000);
          await F.push(`sultan/logs/${cfg.uid}`, { by: s.name, stars: r.stars, pct: r.pct, loot: got, t: Date.now() });
          if (S.current.clan && r.stars) { const cur = (await F.get(`sultan/clans/${S.current.clan.id}/score`)) || 0; await F.set(`sultan/clans/${S.current.clan.id}/score`, cur + r.stars); }
        } catch { /* çevrimdışı */ }
      })();
    }
    setBattle(null); setScr('village');
    if (outro) setTimeout(() => setDlg({ lines: outro }), 200);
    if (gem) say(`+${gem} elmas`);
  };

  // ---------- yağma ----------
  const findRaid = async (skip) => {
    if (skip) { if (s.res.a < 50) return say('50 altın gerekli.'); mut((sv) => { sv.res.a -= 50; }); }
    setRaid({ st: 'loading' }); setPanel({ k: 'raid' });
    const bot = () => {
      const p = Math.max(1, Math.min(30, kl * 3 + s.rank + Math.floor(Math.random() * 5) - 2));
      const names = ['Yağmacı Kamp', 'Kara Han\'ın Gözcüleri', 'Haydut İni', 'Kaçakçı Köyü', 'Asi Bey\'in Obası'];
      return { name: names[Math.floor(Math.random() * names.length)], kl: Math.min(8, 1 + Math.floor(p / 4)), lay: genVillage(p, Math.floor(Math.random() * 1e6)), loot: { a: 120 * p + 200, o: 120 * p + 200, y: 80 * p + 150 }, bot: true, tro: p * 12 };
    };
    try {
      const F = await withTimeout(cloud(), 6000);
      const list = (await withTimeout(F.top('sultan/players', 'tro', 60), 6000)).filter((p) => p.id !== F.uid && p.lay && Date.now() - (p.t || 0) < 21 * 864e5);
      const near = list.filter((p) => Math.abs((p.kl || 1) - kl) <= 2);
      const pool = near.length ? near : list;
      if (pool.length && Math.random() < 0.85) {
        const p = pool[Math.floor(Math.random() * pool.length)];
        setRaid({ st: 'ok', name: p.n, kl: p.kl, rank: p.rank, lay: JSON.parse(p.lay), loot: { a: p.res?.a || 0, o: p.res?.o || 0, y: p.res?.y || 0 }, uid: p.id, tro: p.tro, clan: p.clan });
        return;
      }
      setRaid({ st: 'ok', ...bot() });
    } catch { setRaid({ st: 'ok', ...bot(), off: true }); }
  };

  // ---------- klan ----------
  const loadClans = async () => {
    setClanUI((c) => ({ ...c, st: 'loading' }));
    try {
      const F = await withTimeout(cloud(), 8000);
      if (S.current.clan) {
        const cl = await F.get(`sultan/clans/${S.current.clan.id}`);
        if (!cl) { mut((sv) => { sv.clan = null; }); return loadClans(); }
        const msgs = await F.get(`sultan/chat/${S.current.clan.id}`);
        setClanUI((c) => ({ ...c, st: 'in', clan: cl, msgs: msgs ? Object.values(msgs).sort((a, b) => a.t - b.t).slice(-40) : [] }));
        if (!loadClans.sub) { loadClans.sub = F.onChild(`sultan/chat/${S.current.clan.id}`, (k, v) => setClanUI((c) => (c.msgs.some((m) => m.t === v.t && m.x === v.x) ? c : { ...c, msgs: [...c.msgs, v].slice(-40) }))); }
      } else {
        const list = await F.top('sultan/clans', 'score', 30);
        setClanUI((c) => ({ ...c, st: 'list', list }));
      }
    } catch (e) { setClanUI((c) => ({ ...c, st: 'err', msg: cloudErr(e) })); }
  };
  const createClan = async (name) => {
    if (name.trim().length < 3) return say('Klan adı en az 3 harf.');
    if (s.res.a < 1000) return say('Klan kurmak 1.000 altın.');
    try {
      const F = await withTimeout(cloud(), 8000);
      const id = 'c' + Date.now().toString(36);
      await F.set(`sultan/clans/${id}`, { n: name.trim().slice(0, 20), lead: F.uid, score: 0, t: Date.now(), m: { [F.uid]: { n: s.name, rank: s.rank, tro: s.tro } } });
      mut((sv) => { sv.res.a -= 1000; sv.clan = { id, n: name.trim().slice(0, 20) }; });
      loadClans();
    } catch (e) { say(cloudErr(e)); }
  };
  const joinClan = async (c) => {
    try {
      const F = await withTimeout(cloud(), 8000);
      const n = c.m ? Object.keys(c.m).length : 0; if (n >= 30) return say('Klan dolu.');
      await F.set(`sultan/clans/${c.id}/m/${F.uid}`, { n: s.name, rank: s.rank, tro: s.tro });
      await F.push(`sultan/chat/${c.id}`, { n: 'Klan', x: `${s.name} klana katıldı!`, t: Date.now() });
      mut((sv) => { sv.clan = { id: c.id, n: c.n }; });
      loadClans();
    } catch (e) { say(cloudErr(e)); }
  };
  const leaveClan = async () => {
    try { const F = await withTimeout(cloud(), 8000); await F.remove(`sultan/clans/${s.clan.id}/m/${F.uid}`); } catch { /* yok */ }
    loadClans.sub && loadClans.sub(); loadClans.sub = null;
    mut((sv) => { sv.clan = null; }); setClanUI({ st: 'idle', list: [], msgs: [], input: '', name: '' }); loadClans();
  };
  const sendMsg = async () => {
    const x = clanUI.input.trim(); if (!x) return;
    setClanUI((c) => ({ ...c, input: '' }));
    try { const F = await withTimeout(cloud(), 8000); await F.push(`sultan/chat/${s.clan.id}`, { n: s.name, r: s.rank, x: x.slice(0, 140), t: Date.now() }); } catch (e) { say(cloudErr(e)); }
  };

  // ---------- rütbe ----------
  const next = RANKS[s.rank + 1];
  const rankReady = next && next.req.every(([k, v]) => reqVal(s, k) >= v);
  const promote = () => {
    if (!rankReady) return;
    mut((sv) => { sv.rank++; sv.gems += next.gem; sv.news.unshift(`Terfi! Yeni rütben: ${next.n}`); });
    setDlg({ lines: [[s.rank + 1 >= 9 ? 'sevda' : 'alper', `Tebrikler! Artık ${next.n}sın. ${next.d}`]], big: next.n });
  };

  // ipucu satırı
  const hint = (() => {
    if (!s.bs.some((b) => b.k === 'oduncu')) return 'İnşa ▸ Oduncu yap: binalar için odun lazım.';
    if (!s.bs.some((b) => b.k === 'maden')) return 'İnşa ▸ Altın madeni yap.';
    if (!seferWon(s)) return 'Sefer ▸ "Değirmen yolu"na saldır. Ordunda 10 piyade var.';
    if (rankReady) return `Terfi zamanı! Rütbe ▸ ${next.n}`;
    if (next) { const r = next.req.find(([k, v]) => reqVal(s, k) < v); if (r) return `Sonraki rütbe (${next.n}): ${REQ_TXT[r[0]](r[1])}`; }
    return 'Gökyurt senin. Klanınla yağmalara devam et!';
  })();

  // ---------- savaş ekranı ----------
  if (scr === 'battle' && battle) return <Battle layout={battle.lay} army={battle.army} smith={battle.smith} title={battle.title} loot={battle.loot} onEnd={endBattle} />;

  const selB = panel && panel.k === 'bld' ? s.bs.find((b) => b.id === panel.id) : null;

  return (
    <div className="sl">
      <div className="sl-top">
        <Res k="a" v={s.res.a} cap={cap} /><Res k="o" v={s.res.o} cap={cap} /><Res k="y" v={s.res.y} cap={cap} />
        <span className="sl-res r-g"><i />{s.gems}</span>
      </div>
      <div className="sl-rankbar" onClick={() => setPanel({ k: 'rank' })}>
        <b>{RANKS[s.rank].n}</b><span>{s.name}</span><span className="sl-tro">Kupa {s.tro}</span><span className="sl-bld">Usta {builders(s) - busyCount(s)}/{builders(s)}</span>
      </div>
      <div className="sl-hint">{hint}</div>
      <Village save={s} sel={sel} place={place} onTap={onTap} bad={badCell} />
      {place ? (
        <div className="sl-placebar">
          <span>{place.move ? 'Taşı' : B[place.k].n}: yer seç</span>
          <button className="pri" onClick={confirmPlace}>Tamam</button>
          <button onClick={() => setPlace(null)}>Vazgeç</button>
        </div>
      ) : (
        <nav className="sl-nav">
          <button onClick={() => setPanel({ k: 'build' })}><Ic k="build" />İnşa</button>
          <button onClick={() => setPanel({ k: 'army' })}><Ic k="army" />Ordu<small>{au}/{ac}</small></button>
          <button className="big" onClick={() => setPanel({ k: 'map' })}><Ic k="map" />Sefer</button>
          <button onClick={() => findRaid(false)}><Ic k="raid" />Yağma</button>
          <button onClick={() => { setPanel({ k: 'clan' }); loadClans(); }}><Ic k="clan" />Klan</button>
        </nav>
      )}

      {selB && (
        <div className="sl-sheet">
          <div className="sl-sh-h"><b>{B[selB.k].n}</b><span>{selB.lv ? selB.lv + '. seviye' : 'Yapılıyor'}</span><button className="x" onClick={() => { setPanel(null); setSel(null); }}>×</button></div>
          <p className="sl-d">{B[selB.k].d}</p>
          <div className="sl-info">
            <span>Can {bhp(selB.k, Math.max(1, selB.lv))}</span>
            {B[selB.k].prod && <span>Üretim {prodRate(selB.k, Math.max(1, selB.lv))}/saat · biriken {fmt(pending(selB))}</span>}
            {selB.k === 'ambar' && <span>Depo +{fmt(B.ambar.cap * selB.lv)}</span>}
            {selB.k === 'ordugah' && <span>Ordu +{armyCapOf(selB.lv)}</span>}
            {B[selB.k].def && <span>Menzil {B[selB.k].def.r} · güç x{(1 + 0.3 * (selB.lv - 1)).toFixed(1)}</span>}
            {selB.k === 'demirci' && <span>Askerler +%{selB.lv * 15} can ve hasar</span>}
            {selB.k === 'kisla' && <span>Açılan: {Object.values(T).filter((t) => t.kisla <= selB.lv).map((t) => t.n).join(', ')}</span>}
          </div>
          {selB.busy ? (
            <div className="sl-row"><span>Bitiş: {dur((selB.busy.until - now()) / 1000)}</span><button className="gem" onClick={() => speedup(selB.id)}>Hızlandır · {gemFor((selB.busy.until - now()) / 1000)} elmas</button></div>
          ) : selB.lv < B[selB.k].max ? (
            <div className="sl-row"><span>{selB.lv + 1}. seviye: <Cost c={cost(selB.k, selB.lv + 1)} s={s} /> · {dur(btime(selB.k, selB.lv + 1))}</span><button className="pri" onClick={() => upgrade(selB.id)}>Geliştir</button></div>
          ) : <p className="sl-d">En üst seviyede.</p>}
          <div className="sl-row">
            {B[selB.k].prod && <button onClick={() => collect(selB.id)}>Topla</button>}
            {selB.k === 'kisla' && <button onClick={() => setPanel({ k: 'army' })}>Asker eğit</button>}
            <button onClick={() => { setPlace({ k: selB.k, move: selB.id, at: [selB.x, selB.y] }); setPanel(null); }}>Taşı</button>
          </div>
        </div>
      )}

      {panel && panel.k === 'build' && (
        <div className="sl-modal" onClick={() => setPanel(null)}><div className="sl-mcard" onClick={(e) => e.stopPropagation()}>
          <h2>İnşa et</h2>
          <div className="sl-grid">
            {Object.keys(B).map((k) => {
              const lim = LIMIT[k][kl - 1], n = countOf(s, k), c = cost(k, 1);
              return (
                <button key={k} className="sl-bcard" disabled={n >= lim} onClick={() => { setPanel(null); setSel(null); setPlace({ k, at: freeSpot(k) }); }}>
                  <b>{B[k].n}</b><small>{n}/{lim}{lim === 0 ? ` · Konak ${LIMIT[k].findIndex((x) => x > 0) + 1} gerekli` : ''}</small><Cost c={c} s={s} />
                </button>
              );
            })}
          </div>
          <p className="sl-d">Binayı seç, köyde bir yere dokun, sonra Tamam'a bas. Konak geliştikçe daha fazla bina açılır.</p>
        </div></div>
      )}

      {panel && panel.k === 'army' && (
        <div className="sl-modal" onClick={() => setPanel(null)}><div className="sl-mcard" onClick={(e) => e.stopPropagation()}>
          <div className="sl-sh-h"><h2>Ordu</h2><span>{au}/{ac} yer</span></div>
          {Object.entries(T).map(([k, t]) => {
            const st = tStat(k, smithLv(s)), lock = t.kisla > kislaLv(s);
            return (
              <div key={k} className={'sl-trow' + (lock ? ' lock' : '')}>
                <i style={{ background: t.col }} />
                <div><b>{t.n} <small>x{s.army[k] || 0}</small></b><small>{lock ? `Kışla ${t.kisla}. seviye gerekli` : `${t.d} Can ${st.hp}, hasar ${Math.round(st.dps)}/sn, yer ${t.sz}`}</small></div>
                <button disabled={lock} onClick={() => train(k)}><i className="ry" />{t.cost}<small>{t.t} sn</small></button>
              </div>
            );
          })}
          {s.queue.length > 0 && <div className="sl-row"><span>Sırada {s.queue.length} asker · {dur((s.queue[s.queue.length - 1].until - now()) / 1000)}</span><button className="gem" onClick={finishQueue}>Bitir · {gemFor((s.queue[s.queue.length - 1].until - now()) / 1000)} elmas</button></div>}
          <p className="sl-d">Savaşta sahaya sürdüğün askerler geri dönmez; sürmediklerin ordunda kalır.</p>
        </div></div>
      )}

      {panel && panel.k === 'map' && (
        <div className="sl-modal" onClick={() => setPanel(null)}><div className="sl-mcard tall" onClick={(e) => e.stopPropagation()}>
          <h2>Sefer haritası</h2>
          {CHAPTERS.map((c, ci) => (
            <div key={ci} className="sl-chap">
              <h3>{ci + 1}. {c.n}</h3>
              <div className="sl-path">
                {Array.from({ length: 6 }).map((_, j) => {
                  const i = ci * 6 + j, st = s.sefer[i] || 0, open = i === 0 || (s.sefer[i - 1] || 0) >= 1;
                  return (
                    <button key={i} className={'sl-node' + (open ? '' : ' lock') + (j === 5 ? ' boss' : '') + (st ? ' won' : '')} disabled={!open} onClick={() => openSefer(i)} style={{ marginTop: (j % 2) * 18 }}>
                      <b>{i + 1}</b><Stars n={st} size={11} /><small>{SEFER_NAMES[i]}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div></div>
      )}

      {panel && panel.k === 'sefer' && (() => {
        const i = panel.i, st = s.sefer[i] || 0, L = seferLoot(i), loot = st ? { a: Math.round(L.a * 0.3), o: Math.round(L.o * 0.3), y: Math.round(L.y * 0.3) } : L;
        const lay = genVillage(i + 1, i + 1);
        return (
          <div className="sl-modal" onClick={() => setPanel({ k: 'map' })}><div className="sl-mcard" onClick={(e) => e.stopPropagation()}>
            <h2>{i + 1}. {SEFER_NAMES[i]}</h2>
            <Stars n={st} size={28} />
            <p className="sl-d">{CHAPTERS[Math.floor(i / 6)].n}{i % 6 === 5 ? ' · Bölüm sonu kalesi' : ''}. Savunma: {lay.filter((b) => b.k === 'kule').length} kule, {lay.filter((b) => b.k === 'top').length} top, {lay.filter((b) => b.k === 'sur').length} sur.</p>
            <div className="sl-row"><span>Ganimet{st ? ' (tekrar: %30)' : ''}:</span><Cost c={loot} /></div>
            <div className="sl-row"><span>Ordun: {Object.entries(s.army).filter(([, n]) => n).map(([k, n]) => `${n} ${T[k].n}`).join(', ') || 'boş'}</span></div>
            <button className="pri big" onClick={() => startBattle({ kind: 'sefer', i, lay, loot, title: SEFER_NAMES[i] })}>Saldır</button>
            <button onClick={() => setPanel({ k: 'map' })}>Haritaya dön</button>
          </div></div>
        );
      })()}

      {panel && panel.k === 'raid' && raid && (
        <div className="sl-modal" onClick={() => setPanel(null)}><div className="sl-mcard" onClick={(e) => e.stopPropagation()}>
          <h2>Yağma</h2>
          {raid.st === 'loading' ? <p>Rakip aranıyor…</p> : (
            <>
              <div className="sl-raidh"><b>{raid.name}</b><small>{raid.bot ? 'Yapay zekâ kampı' : `${RANKS[raid.rank || 0].n} · Konak ${raid.kl}${raid.clan ? ' · ' + raid.clan : ''}`} · kupa {raid.tro || 0}</small></div>
              {raid.off && <p className="sl-d">Çevrimdışısın; yapay zekâ kampına saldırıyorsun.</p>}
              <div className="sl-row"><span>Alınabilir ganimet:</span><Cost c={raid.loot} /></div>
              <p className="sl-d">Kazanırsan yıldız başına 10 kupa. Gerçek oyunculardan aldığın ganimet onların deposundan düşer.</p>
              <button className="pri big" onClick={() => startBattle({ kind: 'yagma', lay: raid.lay, loot: raid.loot, title: raid.name, uid: raid.uid })}>Saldır</button>
              <button onClick={() => findRaid(true)}>Sonraki rakip (50 altın)</button>
            </>
          )}
        </div></div>
      )}

      {panel && panel.k === 'clan' && (
        <div className="sl-modal" onClick={() => setPanel(null)}><div className="sl-mcard tall" onClick={(e) => e.stopPropagation()}>
          <h2>Klan</h2>
          {clanUI.st === 'loading' && <p>Yükleniyor…</p>}
          {clanUI.st === 'err' && <p className="sl-warn">{clanUI.msg}</p>}
          {clanUI.st === 'list' && (
            <>
              <div className="sl-row"><input value={clanUI.name} maxLength={20} onChange={(e) => setClanUI((c) => ({ ...c, name: e.target.value }))} placeholder="Yeni klan adı" /><button className="pri" onClick={() => createClan(clanUI.name)}>Kur · 1.000</button></div>
              <h3>Klanlar</h3>
              {clanUI.list.length ? clanUI.list.map((c) => (
                <div key={c.id} className="sl-clanrow"><b>{c.n}</b><small>{c.m ? Object.keys(c.m).length : 0}/30 üye · puan {c.score || 0}</small><button onClick={() => joinClan(c)}>Katıl</button></div>
              )) : <p className="sl-d">Henüz klan yok. İlkini sen kur, arkadaşlarını çağır.</p>}
            </>
          )}
          {clanUI.st === 'in' && clanUI.clan && (
            <>
              <div className="sl-raidh"><b>{clanUI.clan.n}</b><small>Klan puanı {clanUI.clan.score || 0} · yağmalarda kazandığınız her yıldız puan olur</small></div>
              <div className="sl-members">{Object.entries(clanUI.clan.m || {}).sort((a, b) => (b[1].tro || 0) - (a[1].tro || 0)).map(([id, m]) => <span key={id}><b>{m.n}</b><small>{RANKS[m.rank || 0].n} · {m.tro || 0}</small></span>)}</div>
              <div className="sl-chat">{clanUI.msgs.map((m, i) => <p key={i}><b>{m.n}:</b> {m.x}</p>)}{!clanUI.msgs.length && <p className="sl-d">Sohbet boş.</p>}</div>
              <div className="sl-row"><input value={clanUI.input} maxLength={140} onChange={(e) => setClanUI((c) => ({ ...c, input: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && sendMsg()} placeholder="Mesaj yaz" /><button className="pri" onClick={sendMsg}>Gönder</button></div>
              <button className="danger" onClick={leaveClan}>Klandan ayrıl</button>
            </>
          )}
        </div></div>
      )}

      {panel && panel.k === 'rank' && (
        <div className="sl-modal" onClick={() => setPanel(null)}><div className="sl-mcard tall" onClick={(e) => e.stopPropagation()}>
          <h2>Kariyer yolun</h2>
          {RANKS.map((r, i) => (
            <div key={i} className={'sl-rank' + (i === s.rank ? ' cur' : i < s.rank ? ' done' : '')}>
              <b>{r.n}</b>
              {i > s.rank && <small>{r.req.map(([k, v]) => <span key={k} className={reqVal(s, k) >= v ? 'ok' : ''}>{REQ_TXT[k](v)} ({Math.min(reqVal(s, k), v)}/{v})</span>)}</small>}
              {i === s.rank && <small>{r.d}</small>}
            </div>
          ))}
          {next && <button className="pri big" disabled={!rankReady} onClick={promote}>{rankReady ? `Terfi et: ${next.n}` : `Sıradaki: ${next.n}`}</button>}
          <h3>Son olaylar</h3>
          {s.news.slice(0, 8).map((n, i) => <p key={i} className="sl-d">{n}</p>)}
          <button className="danger sm" onClick={() => setPanel({ k: 'reset' })}>Oyunu sıfırla</button>
        </div></div>
      )}
      {panel && panel.k === 'reset' && (
        <div className="sl-modal"><div className="sl-mcard center"><h2>Emin misin?</h2><p>Köyün ve ilerlemen silinir.</p><button className="danger" onClick={() => { try { localStorage.removeItem(KEY); } catch { /* yok */ } setSave(null); setPanel(null); setScr('start'); }}>Sıfırla</button><button onClick={() => setPanel(null)}>Vazgeç</button></div></div>
      )}
      {panel && panel.k === 'defrep' && (
        <div className="sl-modal"><div className="sl-mcard"><h2>Savunma raporu</h2>
          {panel.list.map((l, i) => <p key={i}><b>{l.by}</b> köyüne saldırdı: {l.stars} yıldız, %{l.pct}</p>)}
          <div className="sl-row"><span>Kaybedilen:</span><Cost c={panel.lost} /></div>
          <p className="sl-d">Kule ve sur geliştir, konağı köyün ortasına al.</p>
          <button className="pri big" onClick={() => setPanel(null)}>Tamam</button></div></div>
      )}

      {dlg && (
        <div className="sl-dlg" onClick={() => { const rest = dlg.lines.slice(1); setDlg(rest.length ? { ...dlg, lines: rest } : null); }}>
          {dlg.big && <div className="sl-promo">{dlg.big}</div>}
          <div className="sl-dbox"><Face who={dlg.lines[0][0]} /><div><b style={{ color: WHO[dlg.lines[0][0]].c === '#222' ? '#ff8787' : '#ffd23f' }}>{WHO[dlg.lines[0][0]].n}</b><p>{dlg.lines[0][1]}</p><small>Devam için dokun</small></div></div>
        </div>
      )}
      {toast && <div className="sl-toast">{toast}</div>}
    </div>
  );
}

const IC = {
  build: 'M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6',
  army: 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  raid: 'M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 5',
  clan: 'M6 3v18M6 4h12l-3 4 3 4H6',
};
function Ic({ k }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC[k]} /></svg>; }
