import { useEffect, useRef, useState } from 'react';
import './kizilag.css';
import { Engine, UPGRADES, stats } from './game/engine.js';
import { LEVELS } from './game/levels.js';
import { PROLOGUE, WHO } from './game/story.js';
import { drawSymbol, drawPerson } from './game/draw.js';

const KEY = 'kizilag-v1';
const fresh = () => ({ best: {}, up: {}, intel: [], seen: false, sfx: true });
const load = () => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return fresh(); } };
const store = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
const totalStars = (s) => Object.values(s.best).reduce((a, b) => a + b, 0);
const spent = (s) => UPGRADES.reduce((a, u) => a + u.costs.slice(0, s.up[u.id] || 0).reduce((x, y) => x + y, 0), 0);
const unlocked = (s) => Math.min(LEVELS.length, 1 + Object.keys(s.best).length);

function Symbol({ size = 160 }) {
  const r = useRef();
  useEffect(() => { const c = r.current.getContext('2d'); let id, t0 = performance.now(); const f = () => { const t = (performance.now() - t0) / 1000; c.clearRect(0, 0, size * 2, size * 2); c.save(); c.scale(2, 2); drawSymbol(c, size / 2, size / 2, size * 0.42, t, { glow: true, bg: '#0b0e18' }); c.restore(); id = requestAnimationFrame(f); }; f(); return () => cancelAnimationFrame(id); }, [size]);
  return <canvas ref={r} width={size * 2} height={size * 2} style={{ width: size, height: size }} />;
}
function Portrait({ who }) {
  const r = useRef();
  useEffect(() => { const c = r.current.getContext('2d'); c.clearRect(0, 0, 200, 240); if (who === 'narr') { drawSymbol(c, 100, 120, 70, 0, { glow: true }); return; } c.save(); drawPerson(c, { x: 100, y: 228, face: 1, kind: who, scale: 2.4, aim: 0, gun: false, t: 0 }); c.restore(); }, [who]);
  return <canvas ref={r} width={200} height={240} className="ka-portrait" />;
}

export default function App() {
  const [save, setSave] = useState(load);
  const [scr, setScr] = useState('menu');
  const [talk, setTalk] = useState(null);       // {lines,i,then}
  const [lv, setLv] = useState(0);
  const [res, setRes] = useState(null);
  const [hud, setHud] = useState(null);
  const [toast, setToast] = useState('');
  const [paused, setPaused] = useState(false);
  const [dossier, setDossier] = useState(false);
  const cv = useRef(), eng = useRef(), saveRef = useRef(save);
  saveRef.current = save;
  const upd = (fn) => setSave((s) => { const n = fn(JSON.parse(JSON.stringify(s))); store(n); return n; });

  useEffect(() => { document.title = 'Kızıl Ağ'; }, []);

  const say = (lines, then) => { setTalk({ lines, i: 0, then }); setScr('talk'); };
  const startLevel = (i) => { setLv(i); setRes(null); setPaused(false); setScr('play'); setTimeout(() => { eng.current && eng.current.load(LEVELS[i], saveRef.current); }, 30); };
  const playLevel = (i) => { const d = LEVELS[i]; if (d.intro) say(d.intro, () => startLevel(i)); else startLevel(i); };
  const begin = () => {
    const nxt = Math.min(unlocked(save), LEVELS.length) - 1;
    if (!save.seen) { upd((s) => { s.seen = true; return s; }); say(PROLOGUE, () => playLevel(0)); } else playLevel(nxt);
  };

  // oyun motoru
  useEffect(() => {
    if (scr !== 'play') return;
    const canvas = cv.current; const E = new Engine(canvas, {
      toast: (m) => { setToast(m); clearTimeout(E._tt); E._tt = setTimeout(() => setToast(''), 1600); },
      intel: (id) => upd((s) => { if (!s.intel.includes(id)) s.intel.push(id); return s; }),
      end: (r) => setRes(r),
    });
    E.sfx = saveRef.current.sfx; eng.current = E;
    E.load(LEVELS[lv], saveRef.current);
    const I = E.in;
    const kd = (e) => {
      const k = e.code;
      if (k === 'KeyA' || k === 'ArrowLeft') I.l = 1; else if (k === 'KeyD' || k === 'ArrowRight') I.r = 1;
      else if (k === 'Space' || k === 'KeyW' || k === 'ArrowUp') { if (!I.jumpHeld) I.jump = true; I.jumpHeld = true; e.preventDefault(); }
      else if (k === 'ShiftLeft' || k === 'ShiftRight' || k === 'KeyQ') I.focus = true;
      else if (k === 'KeyR') I.reload = true;
      else if (k === 'Escape' || k === 'KeyP') setPaused((p) => !p);
    };
    const ku = (e) => {
      const k = e.code;
      if (k === 'KeyA' || k === 'ArrowLeft') I.l = 0; else if (k === 'KeyD' || k === 'ArrowRight') I.r = 0;
      else if (k === 'Space' || k === 'KeyW' || k === 'ArrowUp') I.jumpHeld = false;
      else if (k === 'ShiftLeft' || k === 'ShiftRight' || k === 'KeyQ') I.focus = false;
    };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    const px = (e) => { const r = canvas.getBoundingClientRect(), d = canvas.width / r.width; return { x: (e.clientX - r.left) * d, y: (e.clientY - r.top) * d, d, rx: e.clientX - r.left, ry: e.clientY - r.top, w: r.width }; };
    let stick = null, aimId = null, aimStart = null;
    const pd = (e) => {
      const q = px(e);
      if (e.pointerType === 'mouse') { E.mouseAim = true; I.ax = q.x; I.ay = q.y; if (e.button === 0) I.fire = true; else if (e.button === 2) I.focus = true; return; }
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
      if (q.rx < q.w * 0.4 && stick == null) { stick = { id: e.pointerId, x: q.rx }; }
      else if (aimId == null) { aimId = e.pointerId; aimStart = { x: q.rx, y: q.ry }; I.focus = true; E.touchAim = true; setAim(q, e); }
    };
    const setAim = (q, e) => { const dx = aimStart.x - q.rx, dy = aimStart.y - q.ry, L = Math.hypot(dx, dy), s = E.view(), pxp = E.W / 2 + (E.p.x + 2 * E.p.face - E.cx) * s, pyp = E.H / 2 + ((E.p.y - 62) - (E.cy0 || 360)) * s; E.aimOk = L >= 22; if (E.aimOk) { I.ax = pxp + dx / L * 400; I.ay = pyp + dy / L * 400; } };
    const pm = (e) => {
      const q = px(e);
      if (e.pointerType === 'mouse') { E.mouseAim = true; I.ax = q.x; I.ay = q.y; return; }
      if (stick && e.pointerId === stick.id) { const dx = q.rx - stick.x; I.l = dx < -14 ? 1 : 0; I.r = dx > 14 ? 1 : 0; }
      else if (e.pointerId === aimId) setAim(q, e);
    };
    const pu = (e) => {
      if (e.pointerType === 'mouse') { if (e.button === 2) I.focus = false; return; }
      if (stick && e.pointerId === stick.id) { stick = null; I.l = I.r = 0; }
      else if (e.pointerId === aimId) { aimId = null; I.focus = false; E.touchAim = false; if (E.aimOk) I.fire = true; E.aimOk = false; }
    };
    canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu);
    const cm = (e) => e.preventDefault(); canvas.addEventListener('contextmenu', cm);
    const rs = () => E.resize(); window.addEventListener('resize', rs); rs();
    let last = performance.now(), id, hc = 0;
    const loop = (t) => { const dt = (t - last) / 1000; last = t; E.paused = pausedRef.current; E.step(dt); if ((hc += dt) > 0.08) { hc = 0; { const h = E.hud(), k = JSON.stringify(h); if (k !== E._hk) { E._hk = k; setHud(h); } } } id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    window.__ka = E;
    return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('resize', rs); eng.current = null; };
  }, [scr]);
  const pausedRef = useRef(false); pausedRef.current = paused;

  // sonuç kaydı
  useEffect(() => {
    if (!res) return;
    if (res.win) upd((s) => { s.best[LEVELS[lv].id] = Math.max(s.best[LEVELS[lv].id] || 0, res.stars); res.intel.forEach((i) => !s.intel.includes(i) && s.intel.push(i)); return s; });
  }, [res]);

  const onTalk = () => { if (!talk) return; if (talk.i + 1 < talk.lines.length) setTalk({ ...talk, i: talk.i + 1 }); else { const t = talk.then; setTalk(null); t && t(); } };
  const skipTalk = (e) => { e.stopPropagation(); const t = talk.then; setTalk(null); t && t(); };

  const avail = totalStars(save) - spent(save);
  const buy = (u) => upd((s) => { const l = s.up[u.id] || 0; if (l < u.costs.length && totalStars(s) - spent(s) >= u.costs[l]) s.up[u.id] = l + 1; return s; });
  const goMenu = () => { setScr('menu'); setRes(null); setPaused(false); };
  const afterWin = () => {
    const d = LEVELS[lv]; const next = () => (lv + 1 < LEVELS.length ? setScr('base') : goMenu());
    if (d.outro) say(d.outro, next); else next();
  };

  if (scr === 'talk' && talk) {
    const [who, text] = talk.lines[talk.i], w = WHO[who] || WHO.narr;
    return (
      <div className="ka ka-talk" onClick={onTalk}>
        <div className="ka-scene">{who === 'narr' && <div className="ka-big"><Symbol size={220} /></div>}</div>
        <div className="ka-box">
          {who !== 'narr' && <Portrait who={who} />}
          <div className="ka-txt"><b style={{ color: w.c }}>{w.n}</b><p style={{ color: who === 'narr' ? '#e8ecff' : '#fff', fontStyle: who === 'narr' ? 'italic' : 'normal' }}>{text}</p><i>dokun ▸</i></div>
        </div>
        <button className="ka-skip" onClick={skipTalk}>Atla ⏭</button>
      </div>
    );
  }

  if (scr === 'play') {
    const d = LEVELS[lv];
    return (
      <div className="ka ka-play">
        <canvas ref={cv} className="ka-cv" />
        {hud && (
          <div className="ka-hud">
            <div className="ka-hp">{Array.from({ length: hud.maxHp }).map((_, i) => <span key={i} className={i < hud.hp ? 'on' : ''}>♥</span>)}</div>
            <div className="ka-lvn">{d.id}. {d.name} · {hud.kills}/{hud.total}</div>
            <div className="ka-ammo">{hud.rel ? 'DOLUYOR…' : Array.from({ length: hud.mag }).map((_, i) => <i key={i} className={i < hud.ammo ? 'on' : ''} />)}</div>
            {hud.locked && <div className="ka-lock">Çıkış kilitli: {d.lock === 'boss' ? 'Yönetici\'yi indir' : 'Terminali vur'}</div>}
          </div>
        )}
        {toast && <div className="ka-toast">{toast}</div>}
        <button className="ka-pause" onClick={() => setPaused(true)}>❚❚</button>
        <button className="ka-jump" onPointerDown={(e) => { e.stopPropagation(); const I = eng.current.in; I.jump = true; I.jumpHeld = true; }} onPointerUp={() => { eng.current.in.jumpHeld = false; }} onPointerLeave={() => { eng.current && (eng.current.in.jumpHeld = false); }}>ZIPLA</button>
        <button className="ka-reload" onPointerDown={(e) => { e.stopPropagation(); eng.current.in.reload = true; }}>R</button>
        <div className="ka-tip">Sol: yürü · Sağ: sapanı geri çek = nişan + yavaş çekim · bırak = ateş</div>
        {paused && !res && (
          <div className="ka-ov"><h2>Duraklatıldı</h2>
            <button onClick={() => setPaused(false)}>Devam</button>
            <button onClick={() => startLevel(lv)}>Bölümü yeniden başlat</button>
            <button onClick={() => { const s = !save.sfx; upd((x) => { x.sfx = s; return x; }); if (eng.current) eng.current.sfx = s; }}>Ses: {save.sfx ? 'Açık' : 'Kapalı'}</button>
            <button onClick={goMenu}>Ana menü</button></div>
        )}
        {res && (
          <div className="ka-ov">
            <h2 style={{ color: res.win ? '#6bffa0' : '#ff5a6a' }}>{res.win ? 'Bölüm tamam' : 'Yakalandın'}</h2>
            {res.win && <div className="ka-stars">{[1, 2, 3].map((n) => <span key={n} className={n <= res.stars ? 'on' : ''}>★</span>)}</div>}
            <p className="ka-stat">{res.win ? <>Düşman {res.kills}/{res.total} · Sekme vuruşu {res.rico} · {Math.round(res.time)} sn{res.intel.length ? ' · belge ✔' : ''}</> : 'Odak ile sektir, korunmasız kalma.'}</p>
            {res.win && <p className="ka-star-hint">★ bitir · ★ en az {LEVELS[lv].needRico} sekme vuruşu · ★ hasar almadan</p>}
            {res.win ? <button className="pri" onClick={afterWin}>{lv + 1 < LEVELS.length ? 'Devam ▸' : 'Bitir'}</button> : <button className="pri" onClick={() => startLevel(lv)}>Tekrar dene</button>}
            {!res.win && <button onClick={() => setScr('base')}>Karargâh (yükselt)</button>}
            <button onClick={goMenu}>Ana menü</button>
          </div>
        )}
      </div>
    );
  }

  if (scr === 'base') {
    return (
      <div className="ka ka-menu">
        <h1>Karargâh</h1><p className="ka-sub">Yıldız: <b>{avail}</b> kullanılabilir</p>
        <div className="ka-list">
          {UPGRADES.map((u) => { const l = save.up[u.id] || 0, max = u.costs.length, cost = u.costs[l]; return (
            <div key={u.id} className="ka-up"><div><b>{u.name}</b><small>{u.desc}</small><div className="ka-pips">{u.costs.map((_, i) => <span key={i} className={i < l ? 'on' : ''} />)}</div></div>
              <button disabled={l >= max || avail < cost} onClick={() => buy(u)}>{l >= max ? 'MAX' : '★ ' + cost}</button></div>); })}
        </div>
        <button className="pri" onClick={() => playLevel(Math.min(unlocked(save), LEVELS.length) - 1)}>Göreve devam ▸</button>
        <button onClick={goMenu}>Ana menü</button>
      </div>
    );
  }

  if (scr === 'levels') {
    const u = unlocked(save);
    return (
      <div className="ka ka-menu"><h1>Bölümler</h1>
        <div className="ka-list">{LEVELS.map((d, i) => (
          <button key={d.id} className="ka-lv" disabled={i >= u} onClick={() => playLevel(i)}><b>{d.id}. {d.name}</b><small>{i >= u ? 'Kilitli' : d.place}</small><span>{[1, 2, 3].map((n) => <i key={n} className={n <= (save.best[d.id] || 0) ? 'on' : ''}>★</i>)}</span></button>))}</div>
        <button onClick={goMenu}>Geri</button></div>
    );
  }

  if (dossier) {
    const items = LEVELS.flatMap((d) => d.dossier || []);
    return (
      <div className="ka ka-menu"><h1>Kızıl Ağ Dosyası</h1><Symbol size={110} />
        <div className="ka-list">{items.map(([id, t, txt]) => save.intel.includes(id) ? <div key={id} className="ka-doc"><b>{t}</b><p>{txt}</p></div> : <div key={id} className="ka-doc lock"><b>{t}</b><p>Her bölümde saklı bir belge var.</p></div>)}</div>
        <button onClick={() => setDossier(false)}>Geri</button></div>
    );
  }

  return (
    <div className="ka ka-menu ka-home">
      <Symbol size={150} />
      <h1>KIZIL AĞ</h1>
      <p className="ka-sub">Sevgilini kurtar. Örgütü çöz. Her kurşun bir bulmaca.</p>
      <button className="pri" onClick={begin}>{save.seen ? 'Devam ▸' : 'Başla ▸'}</button>
      <button onClick={() => setScr('levels')}>Bölümler</button>
      <button onClick={() => setScr('base')}>Karargâh <small>★ {avail}</small></button>
      <button onClick={() => setDossier(true)}>Örgüt dosyası <small>{save.intel.length}/{LEVELS.length}</small></button>
      <p className="ka-how">PC: A/D yürü · Space zıpla · Fare nişan, tık ateş · Sağ tık/Shift basılı tut = yavaş çekim · R doldur<br />Telefon: sol yarı yürü · sağ yarıda sapan gibi geri çek = nişan+yavaş çekim, bırak = ateş<br />Mermi duvar ve metalden seker; kutuya çarpınca durur; cam kırılır; kırmızı varil patlar.</p>
    </div>
  );
}
