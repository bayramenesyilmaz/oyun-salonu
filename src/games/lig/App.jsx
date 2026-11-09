import { useEffect, useMemo, useRef, useState } from 'react';
import './lig.css';
import { createMatch, step, simulate, draw, snapshot, FORMS, TACTICS, W, H } from './match.js';
import {
  COLORS, POS, LEAGUES, FACILITIES, ACH, ovr, value, wage, newSave, newSeason, findTeam, sortedTable, quickResult, refreshMarket, tick, trainCost, train, genPlayer, ri, pick, SPECIAL,
} from './data.js';
import { cloud, cloudErr, withTimeout } from '../../engine/cloud.js';

const KEY = 'lig-v1';
const QS = new URLSearchParams(location.search);
const loadSave = () => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 1 ? s : null; } catch { return null; } };
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const clone = (o) => JSON.parse(JSON.stringify(o));
const tier = (o) => (o >= 80 ? 'el' : o >= 70 ? 'au' : o >= 58 ? 'ag' : 'br');

// ---------- ses ----------
let AC = null, SND = true;
function beep(f, d, type = 'sine', v = 0.15, slide = 0) {
  if (!SND) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
  } catch { /* ses yok */ }
}
function crowd(d = 1.6, v = 0.12) {
  if (!SND) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const n = AC.sampleRate * d, buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / n);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6; g.gain.value = v; s.buffer = buf; s.connect(f); f.connect(g); g.connect(AC.destination); s.start();
  } catch { /* ses yok */ }
}
const SFX = { kick: (p) => beep(120 + p / 6, 0.08, 'triangle', 0.18, -60), whistle: () => { beep(2600, 0.25, 'sine', 0.08); setTimeout(() => beep(2600, 0.45, 'sine', 0.08), 300); }, goal: () => { crowd(2.4, 0.2); beep(523, 0.15, 'square', 0.06); setTimeout(() => beep(784, 0.3, 'square', 0.06), 150); }, tap: () => beep(660, 0.05, 'triangle', 0.06) };

// ---------- küçük bileşenler ----------
function Crest({ c1, c2, name, size = 44 }) {
  const ini = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" aria-hidden="true">
      <path d="M20 2 L37 8 L35 26 Q31 38 20 42 Q9 38 5 26 L3 8 Z" fill={c1} stroke="#fff" strokeWidth="2" />
      <path d="M20 2 L37 8 L35 26 Q31 38 20 42Z" fill={c2} opacity=".35" />
      <text x="20" y="27" textAnchor="middle" fontSize="13" fontWeight="800" fill={c2} stroke={c1} strokeWidth=".6" fontFamily="system-ui">{ini}</text>
    </svg>
  );
}
const ICONS = {
  kulup: 'M12 2 L21 6 L20 15 Q17 21 12 23 Q7 21 4 15 L3 6 Z',
  kadro: 'M8 7a3 3 0 1 0 0.01 0M16 7a3 3 0 1 0 0.01 0M2 20c0-4 3-6 6-6s6 2 6 6M12 20c0-4 3-6 6-6s5 2 5 6',
  transfer: 'M4 8h13l-4-4M20 16H7l4 4',
  lig: 'M7 3h10v5a5 5 0 0 1-10 0zM5 4H3v2a4 4 0 0 0 4 4M19 4h2v2a4 4 0 0 1-4 4M12 13v5M8 21h8',
  tesis: 'M3 21V9l9-6 9 6v12M9 21v-6h6v6',
  online: 'M12 3a9 9 0 1 0 0.01 0M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
};
function Icon({ k }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[k]} /></svg>; }
function Ovr({ p }) { const o = ovr(p); return <span className={'lg-ovr ' + tier(o)}>{o}</span>; }
function Bar({ v, c }) { return <span className="lg-bar"><i style={{ width: Math.max(0, Math.min(100, v)) + '%', background: c }} /></span>; }
function PlayerRow({ p, onClick, right, sel }) {
  return (
    <button className={'lg-prow' + (sel ? ' sel' : '') + (p.inj ? ' inj' : '')} onClick={onClick}>
      <Ovr p={p} />
      <span className="lg-pn"><b>{p.n}</b><small>{POS[p.pos]} · {p.age} yaş{p.inj ? ` · sakat ${p.inj} maç` : ''}</small></span>
      <span className="lg-pfit"><Bar v={p.fit} c={p.fit > 70 ? '#51cf66' : p.fit > 45 ? '#fcc419' : '#ff6b6b'} /><small>%{Math.round(p.fit)}</small></span>
      {right}
    </button>
  );
}

// ---------- maç ekranı ----------
function MatchView({ A, B, mode, half, onEnd, title, onReady, humanB, noPause }) {
  const cv = useRef(null), mref = useRef(null), stick = useRef({ id: null, ox: 0, oy: 0, x: 0, y: 0 });
  const [hud, setHud] = useState({ s: [0, 0], min: 0 });
  const [knob, setKnob] = useState(null);
  const [tac, setTac] = useState(A.tactic);
  const [paused, setPaused] = useState(false);
  const pausedR = useRef(false); pausedR.current = paused;
  useEffect(() => {
    const m = createMatch(A, B, { half, humanA: mode === 'play', humanB });
    mref.current = m;
    if (onReady) onReady(m);
    m.onKick = (p) => SFX.kick(p); m.onGoal = () => SFX.goal();
    SFX.whistle();
    const c = cv.current, ctx = c.getContext('2d');
    let raf, last = performance.now(), acc = 0, ended = false, lastHud = '';
    const keys = {};
    const kd = (e) => { keys[e.code] = 1; if (e.code === 'Space' || e.code === 'KeyK') { m.input[0].k = 1; e.preventDefault(); } if (e.code === 'KeyX' || e.code === 'KeyC' || e.code === 'KeyL') m.input[0].p = 1; if (e.code === 'KeyQ' || e.code === 'ShiftLeft') m.input[0].sw = 1; };
    const ku = (e) => { keys[e.code] = 0; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const speed = mode === 'watch' ? 4 : 1;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!pausedR.current) {
        const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
        const s = stick.current;
        m.input[0].x = s.id != null ? s.x : kx; m.input[0].y = s.id != null ? s.y : ky;
        acc += dt * speed;
        while (acc >= 1 / 60) { step(m, 1 / 60); acc -= 1 / 60; }
      }
      const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, w, h, snapshot(m), { teams: [A, B] }, {});
      const min = Math.min(90, Math.floor((m.t / (m.half * 2)) * 90));
      const hs = m.score.join('-') + min;
      if (hs !== lastHud) { lastHud = hs; setHud({ s: m.score.slice(), min }); }
      if (m.over && !ended) { ended = true; SFX.whistle(); setTimeout(() => onEnd(m), 900); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    if (QS.has('test')) window.__lgm = m;
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  }, []);
  const setT = (t) => { setTac(t); A.tactic = t; if (mref.current) mref.current.teams[0].tactic = t; };
  const finish = () => { const m = mref.current; if (!m) return; m.human[0] = null; const dt = 1 / 30; let g = 0; while (!m.over && g++ < 40000) step(m, dt); };
  const down = (e) => { const r = e.currentTarget.getBoundingClientRect(); stick.current = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, x: 0, y: 0 }; setKnob({ ox: stick.current.ox, oy: stick.current.oy, dx: 0, dy: 0 }); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yok */ } };
  const move = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; const r = e.currentTarget.getBoundingClientRect(); let dx = e.clientX - r.left - s.ox, dy = e.clientY - r.top - s.oy; const l = Math.hypot(dx, dy), mx = 46; if (l > mx) { dx *= mx / l; dy *= mx / l; } s.x = dx / mx; s.y = dy / mx; setKnob({ ox: s.ox, oy: s.oy, dx, dy }); };
  const up = (e) => { if (stick.current.id !== e.pointerId) return; stick.current = { id: null, x: 0, y: 0 }; setKnob(null); };
  const btn = (k) => (e) => { e.preventDefault(); const m = mref.current; if (m) m.input[0][k] = 1; };
  return (
    <div className="lg-match">
      <div className="lg-score">
        <span className="tm"><Crest {...A} size={26} /><b>{A.name}</b></span>
        <span className="sc">{hud.s[0]} - {hud.s[1]}<small>{hud.min}'</small></span>
        <span className="tm r"><b>{B.name}</b><Crest {...B} size={26} /></span>
      </div>
      {title && <div className="lg-mtitle">{title}</div>}
      <canvas ref={cv} className="lg-cv" />
      <div className="lg-mbar">
        {Object.entries(TACTICS).map(([k, t]) => <button key={k} className={tac === k ? 'on' : ''} onClick={() => setT(k)}>{t.n}</button>)}
        {!noPause && <button onClick={() => setPaused((p) => !p)}>{paused ? 'Devam' : 'Durdur'}</button>}
        {!noPause && <button onClick={finish}>Sonuca git</button>}
      </div>
      {mode === 'play' && (
        <div className="lg-ctrl">
          <div className="lg-stickzone" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {knob ? <><i className="base" style={{ left: knob.ox, top: knob.oy }} /><i className="knob" style={{ left: knob.ox + knob.dx, top: knob.oy + knob.dy }} /></> : <span>Sürükle: koş</span>}
          </div>
          <div className="lg-btns">
            <button className="sw" onPointerDown={btn('sw')}>Değiş</button>
            <button className="ps" onPointerDown={btn('p')}>Pas</button>
            <button className="sh" onPointerDown={btn('k')}>Şut</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- online canlı maç (konuk tarafı çizim) ----------
function LiveGuest({ room, meta, onEnd }) {
  const cv = useRef(null), stick = useRef({ id: null, x: 0, y: 0 }), cnt = useRef({ k: 0, p: 0, s: 0 });
  const [hud, setHud] = useState({ s: [0, 0], min: 0 });
  const [knob, setKnob] = useState(null);
  useEffect(() => {
    let S = null, raf, stop = false, lastSend = 0, lastIn = '';
    const keys = {};
    const send = (force) => {
      const s = stick.current; const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
      const x = s.id != null ? s.x : kx, y = s.id != null ? s.y : ky;
      const inp = { x: Math.round(-x * 100) / 100, y: Math.round(-y * 100) / 100, k: cnt.current.k, p: cnt.current.p, s: cnt.current.s };
      const js = JSON.stringify(inp); const now = performance.now();
      if (js !== lastIn && (force || now - lastSend > 60)) { lastIn = js; lastSend = now; room.F.set(`lig/rooms/${room.code}/in`, inp).catch(() => {}); }
    };
    const kd = (e) => { keys[e.code] = 1; if (e.code === 'Space') cnt.current.k++; if (e.code === 'KeyX' || e.code === 'KeyC') cnt.current.p++; if (e.code === 'KeyQ') cnt.current.s++; send(true); };
    const ku = (e) => { keys[e.code] = 0; send(true); };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    const un = room.F.on(`lig/rooms/${room.code}/st`, (v) => { if (v) S = v; });
    const c = cv.current, ctx = c.getContext('2d');
    let lh = '';
    const loop = () => {
      if (stop) return;
      send(false);
      const dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (S) {
        draw(ctx, w, h, S, meta, { flip: true, me: 1 });
        const min = Math.min(90, Math.floor((S.t / (S.half * 2)) * 90)); const k = S.s.join('-') + min;
        if (k !== lh) { lh = k; setHud({ s: S.s, min }); }
        if (S.o) { stop = true; setTimeout(() => onEnd(S), 900); return; }
      } else { ctx.fillStyle = '#2b1f5c'; ctx.fillRect(0, 0, w, h); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    stick.current.send = send;
    return () => { stop = true; cancelAnimationFrame(raf); un && un(); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  }, []);
  const down = (e) => { const r = e.currentTarget.getBoundingClientRect(); stick.current = { ...stick.current, id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, x: 0, y: 0 }; setKnob({ ox: stick.current.ox, oy: stick.current.oy, dx: 0, dy: 0 }); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yok */ } };
  const move = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; const r = e.currentTarget.getBoundingClientRect(); let dx = e.clientX - r.left - s.ox, dy = e.clientY - r.top - s.oy; const l = Math.hypot(dx, dy), mx = 46; if (l > mx) { dx *= mx / l; dy *= mx / l; } s.x = dx / mx; s.y = dy / mx; setKnob({ ox: s.ox, oy: s.oy, dx, dy }); };
  const up = (e) => { if (stick.current.id !== e.pointerId) return; stick.current = { ...stick.current, id: null, x: 0, y: 0 }; setKnob(null); };
  const btn = (k) => (e) => { e.preventDefault(); cnt.current[k]++; stick.current.send && stick.current.send(true); };
  const [A, B] = meta.teams;
  return (
    <div className="lg-match">
      <div className="lg-score">
        <span className="tm"><Crest {...B} size={26} /><b>{B.name}</b></span>
        <span className="sc">{hud.s[1]} - {hud.s[0]}<small>{hud.min}'</small></span>
        <span className="tm r"><b>{A.name}</b><Crest {...A} size={26} /></span>
      </div>
      <canvas ref={cv} className="lg-cv" />
      <div className="lg-ctrl">
        <div className="lg-stickzone" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {knob ? <><i className="base" style={{ left: knob.ox, top: knob.oy }} /><i className="knob" style={{ left: knob.ox + knob.dx, top: knob.oy + knob.dy }} /></> : <span>Sürükle: koş</span>}
        </div>
        <div className="lg-btns">
          <button className="sw" onPointerDown={btn('s')}>Değiş</button>
          <button className="ps" onPointerDown={btn('p')}>Pas</button>
          <button className="sh" onPointerDown={btn('k')}>Şut</button>
        </div>
      </div>
    </div>
  );
}

// motor için takım nesnesi
function engineTeam(T) {
  const ps = (T.start || []).map((id) => T.players.find((p) => p.id === id)).filter(Boolean);
  const bench = T.players.filter((p) => !ps.includes(p) && !p.inj);
  while (ps.length < 5 && bench.length) ps.push(bench.shift());
  // kaleci ilk sırada olmalı
  const gi = ps.findIndex((p) => p.pos === 'KL'); if (gi > 0) { const g = ps.splice(gi, 1)[0]; ps.unshift(g); }
  return { name: T.name, c1: T.c1, c2: T.c2, form: T.form, tactic: T.tactic, players: ps.map((p) => ({ ...p })) };
}

export default function App() {
  const [save, setSave] = useState(loadSave);
  const S = useRef(save); S.current = save;
  const [tab, setTab] = useState('kulup');
  const [scr, setScr] = useState(save ? 'hub' : 'start');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [match, setMatch] = useState(null);
  const [post, setPost] = useState(null);
  const [sel, setSel] = useState(null);
  const [online, setOnline] = useState({ st: 'idle', list: [], msg: '' });
  const [live, setLive] = useState(null);
  const [ligView, setLigView] = useState('tablo');
  const [roomCode, setRoomCode] = useState('');
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('lig-snd') !== '0'; } catch { return true; } });
  SND = sound;
  useEffect(() => { document.title = 'Lig Efsanesi'; }, []);
  useEffect(() => {
    if (!save) return;
    const s = clone(save); tick(s);
    const today = new Date().toDateString();
    if (s.daily !== today) { const first = !s.daily; s.daily = today; if (!first) { s.coins += 200; s.gems += 2; setTimeout(() => say('Günlük sponsor ödemesi: 200 para, 2 elmas'), 600); } }
    persist(s); setSave(s);
  }, []);
  useEffect(() => { const id = setInterval(() => { if (S.current && scr === 'hub') { const s = clone(S.current); tick(s); persist(s); setSave(s); } }, 60000); return () => clearInterval(id); }, [scr]);

  const persist = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* dolu */ } };
  const say = (x) => { setToast(x); clearTimeout(say.t); say.t = setTimeout(() => setToast(null), 2600); };
  const mut = (fn) => {
    const s = clone(S.current); const r = fn(s);
    for (const a of ACH) if (!s.ach[a.id] && a.ok(s)) { s.ach[a.id] = Date.now(); s.gems += a.g; setTimeout(() => say(`Başarım: ${a.n} (+${a.g} elmas)`), 300); }
    persist(s); S.current = s; setSave(s); return r;
  };

  // bulut senkron (metin)
  const sync = async (s) => {
    try {
      const F = await withTimeout(cloud(), 8000);
      const T = engineTeam(s.club);
      await F.set(`lig/teams/${F.uid}`, { name: s.club.name.slice(0, 28), c1: s.club.c1, c2: s.club.c2, lvl: s.season.lvl, league: s.season.league, pow: Math.round(T.players.reduce((a, p) => a + ovr(p), 0) / T.players.length), score: s.season.lvl * 1000 + s.trophies.length * 60 + s.stats.w, w: s.stats.w, d: s.stats.d, l: s.stats.l, tro: s.trophies.length, squad: JSON.stringify(T), t: Date.now() });
      await F.set(`lig/saves/${F.uid}`, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  };

  // ---------- başlangıç ----------
  const [cname, setCname] = useState('');
  const [ccol, setCcol] = useState(0);
  if (scr === 'start') {
    const restore = async () => {
      try { const F = await withTimeout(cloud(), 8000); const v = await F.get(`lig/saves/${F.uid}`); if (v) { const s = JSON.parse(v); persist(s); setSave(s); setScr('hub'); } else say('Bu cihazda bulut kaydı bulunamadı.'); } catch (e) { say(cloudErr(e)); }
    };
    return (
      <div className="lg lg-start">
        <div className="lg-logo">LİG<br /><span>EFSANESİ</span></div>
        <p className="lg-sub">Halı sahadan Süper Lig'e. Takımını kur, kadronu yönet, maçı istersen kendin oyna.</p>
        <div className="lg-card">
          <label>Kulüp adı</label>
          <input value={cname} maxLength={24} onChange={(e) => setCname(e.target.value)} placeholder="ör. Yıldıztepe Spor" />
          <label>Renkler</label>
          <div className="lg-cols">{COLORS.map((c, i) => <button key={i} className={ccol === i ? 'on' : ''} onClick={() => setCcol(i)} style={{ background: `linear-gradient(135deg, ${c[0]} 50%, ${c[1]} 50%)` }} aria-label={'Renk ' + (i + 1)} />)}</div>
          <div className="lg-prev"><Crest c1={COLORS[ccol][0]} c2={COLORS[ccol][1]} name={cname || 'Kulüp'} size={64} /><b>{cname || 'Kulübün'}</b></div>
          <button className="pri big" disabled={cname.trim().length < 3} onClick={() => { const s = newSave(cname.trim(), COLORS[ccol]); persist(s); setSave(s); setScr('hub'); setTimeout(() => setModal({ k: 'help' }), 300); }}>Kulübü kur</button>
        </div>
        <button className="lg-link" onClick={restore}>Bulut kaydımı geri yükle</button>
        {toast && <div className="lg-toast">{toast}</div>}
      </div>
    );
  }

  if (!save) return null;
  const club = save.club, season = save.season, L = LEAGUES[season.lvl];

  // ---------- sıradaki maç ----------
  const nextFixture = () => {
    const c = season.cup;
    if (!c.done && c.round < 3 && season.md === c.at[c.round] && c.alive.includes('me')) {
      const others = c.alive.filter((x) => x !== 'me');
      const opp = c.oppId && others.includes(c.oppId) ? c.oppId : others[0];
      return { kind: 'kupa', opp, home: c.round % 2 === 0, label: ['Kupa çeyrek final', 'Kupa yarı final', 'Kupa finali'][c.round] };
    }
    if (season.md >= season.fx.length) return null;
    const pair = season.fx[season.md].find((p) => p.includes('me'));
    return { kind: 'lig', opp: pair[0] === 'me' ? pair[1] : pair[0], home: pair[0] === 'me', label: `${season.league} · ${season.md + 1}. hafta` };
  };
  const fx = nextFixture();

  const startMatch = (mode, f = fx, oppTeam = null) => {
    const opp = oppTeam || findTeam(save, f.opp);
    const A = engineTeam(club), B = engineTeam(opp);
    if (A.players.length < 5) { say('Sahaya çıkacak 5 sağlam oyuncun yok. Transferden oyuncu al.'); return; }
    if (mode === 'instant') { const m = simulate(A, B, save.half); finishMatch(m, f, opp); return; }
    setMatch({ A, B, mode, f, opp });
    setScr('match');
  };

  const finishMatch = (m, f, opp) => {
    const res = { gf: m.score[0], ga: m.score[1], ev: m.ev, f, oppName: opp.name, opp, ps: m.ps.filter((p) => p.t === 0).map((p) => ({ id: p.a.id, n: p.a.n, goals: p.goals, ast: p.ast, fit: p.fit })), shots: m.stats.shots, poss: m.stats.poss, played: m.human[0] != null };
    let gain = 0, gemGain = 0;
    mut((s) => {
      const L2 = LEAGUES[s.season.lvl];
      const w = res.gf > res.ga, d = res.gf === res.ga;
      // oyuncu durumları
      for (const r of res.ps) {
        const p = s.club.players.find((x) => x.id === r.id); if (!p) continue;
        p.fit = Math.min(100, Math.max(20, r.fit) + 6); p.goals += r.goals; p.ast += r.ast; p.apps++;
        if (p.age <= 24 && ovr(p) < p.pot && Math.random() < 0.3 + (s.fac.saha || 0) * 0.05) { const k = pick(['hiz', 'sut', 'pas', 'def']); p[k] = Math.min(97, p[k] + 1); }
        if (Math.random() < 0.035 - (s.fac.saglik || 0) * 0.004) { p.inj = ri(1, 3); s.news.unshift({ t: Date.now(), x: `${p.n} sakatlandı, ${p.inj} maç yok.` }); }
      }
      for (const p of s.club.players) if (!res.ps.find((r) => r.id === p.id)) { p.fit = Math.min(100, p.fit + 15 + (s.fac.saglik || 0) * 3); if (p.inj && f.kind !== 'dostluk') p.inj--; }
      // istatistik
      if (f.kind !== 'dostluk') {
        s.stats.gf += res.gf; s.stats.ga += res.ga; s.stats[w ? 'w' : d ? 'd' : 'l']++;
        if (res.gf - res.ga >= 5) s.stats.bigWin = true;
      }
      if (res.played) s.stats.played++;
      // para
      const ticket = f.home ? Math.round(L2.fans * 0.05 * (1 + (s.fac.stad || 0) * 0.35)) : 0;
      const bonus = w ? L2.win : d ? Math.round(L2.win / 3) : 0;
      const wages = f.kind === 'dostluk' ? 0 : s.club.players.reduce((a, p) => a + wage(p), 0);
      gain = ticket + bonus - wages;
      if (f.kind === 'dostluk') { gain = w ? 150 : 60; s.stats.friendly++; if (f.fid) { s.fr = s.fr || {}; s.fr[f.fid] = new Date().toDateString(); } }
      if (f.kind === 'kupa') gain += w ? L2.win : 0;
      s.coins = Math.max(0, s.coins + gain);
      res.money = { ticket, bonus, wages, gain };
      const scorers = res.ev.filter((e) => e.t === 0).map((e) => e.n).join(', ');
      s.news.unshift({ t: Date.now(), x: `${f.label}: ${s.club.name} ${res.gf}-${res.ga} ${opp.name}${scorers ? '. Goller: ' + scorers : ''}` });
      s.news = s.news.slice(0, 40);
      if (f.kind === 'lig') {
        s.season.results.push({ md: s.season.md, a: f.home ? 'me' : f.opp, b: f.home ? f.opp : 'me', ga: f.home ? res.gf : res.ga, gb: f.home ? res.ga : res.gf });
        applyRes(s, f.home ? 'me' : f.opp, f.home ? f.opp : 'me', f.home ? res.gf : res.ga, f.home ? res.ga : res.gf);
        for (const [a, b] of s.season.fx[s.season.md]) {
          if (a === 'me' || b === 'me') continue;
          const ta = findTeam(s, a), tb = findTeam(s, b);
          const [x, y] = quickResult(powerOf(ta), powerOf(tb));
          s.season.results.push({ md: s.season.md, a, b, ga: x, gb: y }); applyRes(s, a, b, x, y);
        }
        s.season.md++;
        refreshMarket(s);
      } else if (f.kind === 'kupa') {
        const c = s.season.cup;
        let iWin = w; if (d) { iWin = Math.random() < 0.5 + (res.played ? 0.05 : 0); res.pens = iWin ? 'Penaltılarla kazandın!' : 'Penaltılarda kaybettin.'; }
        advanceCup(s, f.opp, iWin);
        if (iWin && c.round >= 3) { c.won = true; s.trophies.push({ k: 'kupa', n: 'Kupa', season: s.season.n, lvl: s.season.lvl }); s.gems += 10; gemGain += 10; s.coins += L2.prize; s.news.unshift({ t: Date.now(), x: `KUPA BİZİM! ${s.club.name} kupayı kaldırdı!` }); }
      }
      s.club.maxLvl = Math.max(s.club.maxLvl || 0, s.season.lvl);
    });
    res.gem = gemGain;
    setPost(res); setScr('post'); setMatch(null);
    sync(S.current);
  };

  const powerOf = (T) => { const ids = T.start; const ps = ids.map((id) => T.players.find((p) => p.id === id)).filter(Boolean); return ps.reduce((a, p) => a + ovr(p), 0) / Math.max(1, ps.length); };
  function applyRes(s, a, b, x, y) {
    const A = s.season.table[a], B = s.season.table[b]; if (!A || !B) return;
    A.p++; B.p++; A.gf += x; A.ga += y; B.gf += y; B.ga += x;
    if (x > y) { A.w++; B.l++; A.pts += 3; } else if (x < y) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
  }
  function advanceCup(s, opp, iWin) {
    const c = s.season.cup;
    const alive = c.alive.slice(), next = [];
    const pairs = [['me', opp]];
    const rest = alive.filter((x) => x !== 'me' && x !== opp);
    for (let i = 0; i < rest.length; i += 2) pairs.push([rest[i], rest[i + 1]]);
    for (const [a, b] of pairs) {
      if (!b) { next.push(a); continue; }
      let wnr;
      if (a === 'me') wnr = iWin ? 'me' : opp;
      else { const [x, y] = quickResult(powerOf(findTeam(s, a)), powerOf(findTeam(s, b)), 0); wnr = x > y ? a : x < y ? b : (Math.random() < 0.5 ? a : b); }
      next.push(wnr);
      c.log.push({ r: c.round, a, b, w: wnr });
    }
    c.alive = next; c.round++;
    if (c.round >= 3 || !next.includes('me')) {
      // kalan turları otomatik bitir
      while (c.alive.length > 1 && !c.alive.includes('me')) {
        const n2 = []; for (let i = 0; i < c.alive.length; i += 2) { const a = c.alive[i], b = c.alive[i + 1]; if (!b) { n2.push(a); continue; } const w2 = Math.random() < 0.5 ? a : b; c.log.push({ r: c.round, a, b, w: w2 }); n2.push(w2); }
        c.alive = n2; c.round++;
      }
      if (c.alive.length <= 1 || c.round >= 3) c.done = true;
    }
  }

  const endSeason = () => {
    let summary = null;
    mut((s) => {
      const tb = sortedTable(s), pos = tb.findIndex((r) => r.id === 'me') + 1, lvl = s.season.lvl, L2 = LEAGUES[lvl];
      let nl = lvl, txt;
      const prize = Math.round(L2.prize * (9 - pos) / 8);
      s.coins += prize; s.gems += 5;
      if (pos === 1) { s.trophies.push({ k: 'lig', n: L2.n + ' şampiyonluğu', season: s.season.n, lvl }); s.gems += 10; if (s.season.cup.won) s.stats.double = true; }
      if (pos <= 2 && lvl < LEAGUES.length - 1) { nl = lvl + 1; txt = `${pos}. oldun ve ${LEAGUES[nl].n}'ne yükseldin!`; }
      else if (pos >= 7 && lvl > 0) { nl = lvl - 1; txt = `${pos}. oldun ve ${LEAGUES[nl].n}'ne düştün.`; }
      else txt = pos === 1 ? `Şampiyon oldun! ${L2.n} zirvesi senin.` : `${pos}. sırada bitirdin, ${L2.n}'nde kalıyorsun.`;
      if (pos === 1 && lvl === LEAGUES.length - 1) txt = 'SÜPER LİG ŞAMPİYONU! Bir efsane doğdu.';
      // yaş ve gelişim
      const retired = [];
      for (const p of s.club.players) {
        p.age++; p.fit = 100; p.inj = 0;
        if (p.age <= 23 && ovr(p) < p.pot) { for (let i = 0; i < ri(2, 4); i++) { const k = pick(['hiz', 'sut', 'pas', 'def']); p[k] = Math.min(97, p[k] + 1); } }
        if (p.age >= 31) { for (let i = 0; i < ri(1, 3); i++) { const k = pick(['hiz', 'hiz', 'sut', 'def']); p[k] = Math.max(25, p[k] - 1); } }
        if (p.age >= 35 && Math.random() < 0.6) retired.push(p);
      }
      for (const p of retired) { s.club.players = s.club.players.filter((x) => x !== p); s.club.start = s.club.start.filter((id) => id !== p.id); s.news.unshift({ t: Date.now(), x: `${p.n} futbolu bıraktı. Teşekkürler!` }); }
      const yp = genPlayer(pick(['DF', 'OS', 'FV', 'OS']), LEAGUES[nl].lo - 6 + (s.fac.altyapi || 0) * 3, 17); yp.pot = Math.min(95, yp.pot + (s.fac.altyapi || 0) * 3 + 6); yp.num = 30 + ri(0, 9);
      if (s.club.players.length < 14) { s.club.players.push(yp); s.news.unshift({ t: Date.now(), x: `Altyapıdan ${yp.n} (${POS[yp.pos]}, 17 yaş) A takıma yükseldi.` }); }
      for (const p of s.club.players) if (s.club.start.length < 5 && !s.club.start.includes(p.id)) s.club.start.push(p.id);
      s.history.unshift({ n: s.season.n, league: L2.n, pos, cup: s.season.cup.won });
      summary = { pos, txt, prize, retired: retired.map((p) => p.n), youth: yp.n, up: nl > lvl, down: nl < lvl, champ: pos === 1 };
      s.season = newSeason(s, nl);
      s.club.maxLvl = Math.max(s.club.maxLvl || 0, nl);
      refreshMarket(s);
      s.news.unshift({ t: Date.now(), x: `${s.season.n}. sezon başladı: ${s.season.league}.` });
    });
    setModal({ k: 'season', d: summary });
    sync(S.current);
  };

  // ---------- maç / maç sonu ekranları ----------
  if (scr === 'match' && match) {
    return <MatchView A={match.A} B={match.B} mode={match.mode} half={save.half} title={match.f.label} onEnd={(m) => finishMatch(m, match.f, match.opp)} />;
  }
  if (scr === 'live' && live) {
    if (live.role === 'host') return <MatchView A={live.A} B={live.B} mode="play" humanB noPause half={live.half} title={'Canlı maç · ' + live.code} onReady={(m) => { live.ready && live.ready(m); }} onEnd={() => {}} />;
    return <LiveGuest room={live.room} meta={{ teams: [live.A, live.B] }} onEnd={(S2) => { setLive(null); setPost({ live: true, gf: S2.s[1], ga: S2.s[0], oppName: live.A.name, ev: [] }); setScr('post'); }} />;
  }
  if (scr === 'post' && post) {
    const w = post.gf > post.ga, d = post.gf === post.ga;
    return (
      <div className="lg lg-post">
        <div className={'lg-res ' + (w ? 'w' : d ? 'd' : 'l')}>{w ? 'Galibiyet!' : d ? 'Beraberlik' : 'Mağlubiyet'}</div>
        <div className="lg-bigscore"><span>{club.name}</span><b>{post.gf} - {post.ga}</b><span>{post.oppName}</span></div>
        {post.pens && <p className="lg-sub">{post.pens}</p>}
        {post.ev && post.ev.length > 0 && <div className="lg-card"><h3>Goller</h3>{post.ev.map((e, i) => <div key={i} className={'lg-ev ' + (e.t === 0 ? 'me' : '')}><b>{e.min}'</b> {e.n}{e.as ? <small> · asist {e.as}</small> : null}</div>)}</div>}
        {post.shots && <div className="lg-card lg-stats"><div><b>{post.shots[0]}</b><small>Şut</small><b>{post.shots[1]}</b></div><div><b>%{Math.round((post.poss[0] / Math.max(1, post.poss[0] + post.poss[1])) * 100)}</b><small>Topla oynama</small><b>%{Math.round((post.poss[1] / Math.max(1, post.poss[0] + post.poss[1])) * 100)}</b></div></div>}
        {post.money && <div className="lg-card"><h3>Kasa</h3><div className="lg-kv"><span>Bilet</span><b>+{fmt(post.money.ticket)}</b></div><div className="lg-kv"><span>Prim</span><b>+{fmt(post.money.bonus)}</b></div><div className="lg-kv"><span>Maaşlar</span><b>-{fmt(post.money.wages)}</b></div><div className="lg-kv tot"><span>Toplam</span><b>{post.money.gain >= 0 ? '+' : ''}{fmt(post.money.gain)}</b></div></div>}
        <button className="pri big" onClick={() => { setPost(null); setScr('hub'); setTab('kulup'); }}>Devam</button>
      </div>
    );
  }

  // ---------- sekmeler ----------
  const starters = club.start.map((id) => club.players.find((p) => p.id === id)).filter(Boolean);
  const bench = club.players.filter((p) => !club.start.includes(p.id));
  const teamPow = Math.round(starters.reduce((a, p) => a + ovr(p), 0) / Math.max(1, starters.length));
  const tb = sortedTable(save), myPos = tb.findIndex((r) => r.id === 'me') + 1;
  const seasonOver = !fx;

  const Kulup = () => {
    const opp = fx ? findTeam(save, fx.opp) : null;
    const oppPow = opp ? Math.round(powerOf(opp)) : 0;
    const tired = starters.filter((p) => p.fit < 60).length;
    return (
      <>
        <div className="lg-hero">
          <Crest {...club} size={56} />
          <div><b>{club.name}</b><small>{season.league} · {season.n}. sezon · {myPos}. sıra</small></div>
        </div>
        {fx ? (
          <div className="lg-card lg-next">
            <small>{fx.label}{fx.home ? ' · iç saha' : ' · deplasman'}</small>
            <div className="lg-vs"><span><Crest {...club} size={40} /><b>{club.name}</b><em>Güç {teamPow}</em></span><i>VS</i><span><Crest {...opp} size={40} /><b>{opp.name}</b><em>Güç {oppPow}</em></span></div>
            {tired > 0 && <p className="lg-warn">{tired} as oyuncunun kondisyonu düşük. Kadroda değişiklik yapabilir ya da biraz bekleyebilirsin (kondisyon gerçek zamanda dolar).</p>}
            <div className="lg-row3">
              <button className="pri" onClick={() => startMatch('play')}>Maçı oyna</button>
              <button onClick={() => startMatch('watch')}>İzle</button>
              <button onClick={() => startMatch('instant')}>Hemen sonuç</button>
            </div>
          </div>
        ) : (
          <div className="lg-card lg-next"><h3>Sezon bitti!</h3><p className="lg-sub">{myPos}. sırada bitirdin. Ödülleri al ve yeni sezona geç.</p><button className="pri big" onClick={endSeason}>Sezonu kapat</button></div>
        )}
        <div className="lg-card"><h3>Haberler</h3>{save.news.slice(0, 8).map((n, i) => <p key={i} className="lg-news">{n.x}</p>)}</div>
        <div className="lg-card"><h3>Kupalar ({save.trophies.length})</h3>{save.trophies.length ? save.trophies.map((t, i) => <span key={i} className="lg-tro">{t.n} · {t.season}. sezon</span>) : <p className="lg-sub">Henüz kupa yok. İlk hedef: Mahalle Ligi'nde ilk iki.</p>}</div>
        <div className="lg-card"><h3>Başarımlar</h3><div className="lg-ach">{ACH.map((a) => <span key={a.id} className={save.ach[a.id] ? 'ok' : ''} title={a.d}><b>{a.n}</b><small>{a.d} · {a.g} elmas</small></span>)}</div></div>
      </>
    );
  };

  const Kadro = () => {
    const form = FORMS[club.form];
    const slotPos = [[0.5, 0.05], ...form.map(([x, d]) => [x, 0.2 + d * 0.66])];
    const slotTap = (i) => {
      if (sel && sel.kind === 'bench') { const p = club.players.find((x) => x.id === sel.id); if (p.inj) { say('Sakat oyuncu oynayamaz.'); setSel(null); return; } mut((s) => { s.club.start[i] = sel.id; }); setSel(null); return; }
      if (sel && sel.kind === 'slot' && sel.i !== i) { mut((s) => { const st = s.club.start; [st[i], st[sel.i]] = [st[sel.i], st[i]]; }); setSel(null); return; }
      setSel(sel && sel.kind === 'slot' && sel.i === i ? null : { kind: 'slot', i });
    };
    return (
      <>
        <div className="lg-card">
          <div className="lg-rowsp"><h3>Diziliş</h3><span className="lg-pow">Güç {teamPow}</span></div>
          <div className="lg-chips">{Object.keys(FORMS).map((f) => <button key={f} className={club.form === f ? 'on' : ''} onClick={() => mut((s) => { s.club.form = f; })}>{f}</button>)}</div>
          <div className="lg-chips">{Object.entries(TACTICS).map(([k, t]) => <button key={k} className={club.tactic === k ? 'on' : ''} onClick={() => mut((s) => { s.club.tactic = k; })}>{t.n}</button>)}</div>
          <div className="lg-pitch">
            {slotPos.map(([x, d], i) => {
              const p = club.players.find((q) => q.id === club.start[i]);
              return (
                <button key={i} className={'lg-slot' + (sel && sel.kind === 'slot' && sel.i === i ? ' sel' : '') + (p && p.fit < 60 ? ' tired' : '')} style={{ left: x * 100 + '%', bottom: d * 100 + '%', '--c1': club.c1, '--c2': club.c2 }} onClick={() => slotTap(i)}>
                  <i>{p ? p.num || i + 1 : '?'}</i><b>{p ? p.n.split(' ')[0] : 'Boş'}</b><small>{p ? `${ovr(p)} · %${Math.round(p.fit)}` : ''}{i === 0 && p && p.pos !== 'KL' ? ' !' : ''}</small>
                </button>
              );
            })}
          </div>
          <p className="lg-hint">{sel ? (sel.kind === 'slot' ? 'Şimdi yedeklerden bir oyuncuya ya da başka bir mevkiye dokun.' : 'Şimdi sahadaki bir mevkiye dokun.') : 'Değiştirmek için sahadaki bir oyuncuya, sonra yedeğe dokun. Kaleci en alttaki yerde oynar.'}</p>
        </div>
        <div className="lg-card">
          <h3>Kadro ({club.players.length}/14)</h3>
          {club.players.map((p) => (
            <PlayerRow key={p.id} p={p} sel={sel && sel.kind === 'bench' && sel.id === p.id} onClick={() => { if (sel && sel.kind === 'slot') { if (p.inj) { say('Sakat oyuncu oynayamaz.'); return; } const cur = club.start.indexOf(p.id); mut((s) => { const st = s.club.start; if (cur >= 0) [st[cur], st[sel.i]] = [st[sel.i], st[cur]]; else st[sel.i] = p.id; }); setSel(null); } else setModal({ k: 'player', id: p.id }); }}
              right={club.start.includes(p.id) ? <span className="lg-tag">İlk 5</span> : <span className="lg-tag dim" onClick={(e) => { e.stopPropagation(); setSel({ kind: 'bench', id: p.id }); }}>Seç</span>} />
          ))}
        </div>
      </>
    );
  };

  const Transfer = () => (
    <>
      <div className="lg-card">
        <div className="lg-rowsp"><h3>Transfer pazarı</h3><button className="sm" onClick={() => { if (save.gems < 3) return say('3 elmas gerekli.'); mut((s) => { s.gems -= 3; refreshMarket(s); }); }}>Yenile (3 elmas)</button></div>
        <p className="lg-hint">Pazar her maç haftasından sonra yenilenir. Gözlemci ağını geliştirirsen daha iyi oyuncular gelir.</p>
        {save.market.map((p) => (
          <PlayerRow key={p.id} p={p} onClick={() => setModal({ k: 'player', id: p.id, market: true })} right={<span className="lg-price">{fmt(p.price)}</span>} />
        ))}
      </div>
    </>
  );

  const Lig = () => {
    const view = ligView, setView = setLigView;
    const c = season.cup;
    return (
      <>
        <div className="lg-chips">{[['tablo', 'Puan durumu'], ['fikstur', 'Fikstür'], ['kupa', 'Kupa'], ['gecmis', 'Geçmiş']].map(([k, n]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{n}</button>)}</div>
        {view === 'tablo' && (
          <div className="lg-card">
            <h3>{season.league} · {season.n}. sezon</h3>
            <div className="lg-table"><div className="hd"><span>#</span><span>Takım</span><span>O</span><span>A</span><span>P</span></div>
              {tb.map((r, i) => (
                <div key={r.id} className={(r.id === 'me' ? 'me ' : '') + (i < 2 && season.lvl < 6 ? 'up' : i >= 6 && season.lvl > 0 ? 'down' : '')}>
                  <span>{i + 1}</span><span className="tn"><Crest {...r.team} size={18} />{r.team.name}</span><span>{r.p}</span><span>{r.gf - r.ga}</span><b>{r.pts}</b>
                </div>
              ))}
            </div>
            <p className="lg-hint">İlk 2 üst lige çıkar{season.lvl > 0 ? ', son 2 düşer' : ''}.</p>
          </div>
        )}
        {view === 'fikstur' && (
          <div className="lg-card">
            {season.fx.map((rd, i) => (
              <div key={i} className={'lg-md' + (i === season.md ? ' cur' : '')}><small>{i + 1}. hafta</small>
                {rd.map(([a, b], j) => { const r = season.results.find((x) => x.md === i && x.a === a && x.b === b); return <div key={j} className={'lg-fx' + (a === 'me' || b === 'me' ? ' me' : '')}><span>{findTeam(save, a).name}</span><b>{r ? `${r.ga}-${r.gb}` : '-'}</b><span>{findTeam(save, b).name}</span></div>; })}
              </div>
            ))}
          </div>
        )}
        {view === 'kupa' && (
          <div className="lg-card">
            <h3>Kupa</h3>
            <p className="lg-hint">8 takım, tek maç eleme. Maçlar lig haftaları {c.at.map((x) => x + 1).join(', ')} öncesinde oynanır. Beraberlikte penaltı.</p>
            {['Çeyrek final', 'Yarı final', 'Final'].map((n, r) => (
              <div key={r} className="lg-md"><small>{n}</small>{c.log.filter((x) => x.r === r).map((x, i) => <div key={i} className={'lg-fx' + (x.a === 'me' || x.b === 'me' ? ' me' : '')}><span className={x.w === x.a ? 'win' : ''}>{findTeam(save, x.a).name}</span><b>vs</b><span className={x.w === x.b ? 'win' : ''}>{findTeam(save, x.b).name}</span></div>)}{!c.log.some((x) => x.r === r) && <p className="lg-sub">Oynanmadı</p>}</div>
            ))}
            {c.won && <p className="lg-good">Kupayı kazandın!</p>}
            {!c.alive.includes('me') && c.log.length > 0 && <p className="lg-sub">Kupadan elendin.</p>}
          </div>
        )}
        {view === 'gecmis' && (
          <div className="lg-card"><h3>Sezon geçmişi</h3>{save.history.length ? save.history.map((h, i) => <div key={i} className="lg-kv"><span>{h.n}. sezon · {h.league}</span><b>{h.pos}.{h.cup ? ' · Kupa' : ''}</b></div>) : <p className="lg-sub">İlk sezonun devam ediyor.</p>}
            <div className="lg-kv"><span>Toplam G-B-M</span><b>{save.stats.w}-{save.stats.d}-{save.stats.l}</b></div><div className="lg-kv"><span>Atılan / yenilen</span><b>{save.stats.gf} / {save.stats.ga}</b></div></div>
        )}
      </>
    );
  };

  const Tesis = () => (
    <>
      <div className="lg-card">
        <h3>Tesisler</h3>
        {Object.entries(FACILITIES).map(([k, f]) => {
          const lv = save.fac[k] || 0, c = Math.round(f.cost(lv));
          return (
            <div key={k} className="lg-fac">
              <div><b>{f.n}</b><small>{f.d}</small><span className="lg-lv">{Array.from({ length: f.max }).map((_, i) => <i key={i} className={i < lv ? 'on' : ''} />)}</span></div>
              <button disabled={lv >= f.max || save.coins < c} onClick={() => { mut((s) => { s.coins -= c; s.fac[k] = lv + 1; }); SFX.tap(); say(`${f.n} ${lv + 1}. seviye!`); }}>{lv >= f.max ? 'En üst' : fmt(c)}</button>
            </div>
          );
        })}
      </div>
      <div className="lg-card">
        <h3>Ayarlar</h3>
        <div className="lg-chips">{[[60, 'Kısa maç'], [120, 'Normal maç'], [180, 'Uzun maç']].map(([v, n]) => <button key={v} className={save.half === v ? 'on' : ''} onClick={() => mut((s) => { s.half = v; })}>{n}</button>)}</div>
        <div className="lg-chips"><button className={sound ? 'on' : ''} onClick={() => { const v = !sound; setSound(v); try { localStorage.setItem('lig-snd', v ? '1' : '0'); } catch { /* yok */ } }}>Ses: {sound ? 'Açık' : 'Kapalı'}</button><button onClick={() => setModal({ k: 'help' })}>Nasıl oynanır</button></div>
        <div className="lg-chips"><button onClick={async () => { say((await sync(S.current)) ? 'Buluta kaydedildi.' : 'Buluta bağlanılamadı, kayıt telefonda duruyor.'); }}>Buluta kaydet</button><button className="danger" onClick={() => setModal({ k: 'reset' })}>Kulübü sıfırla</button></div>
      </div>
    </>
  );

  const loadBoard = async () => {
    setOnline((o) => ({ ...o, st: 'loading', msg: '' }));
    try {
      const F = await withTimeout(cloud(), 9000);
      await sync(S.current);
      const list = await withTimeout(F.top('lig/teams', 'score', 40), 9000);
      setOnline({ st: 'ok', list, me: F.uid, msg: '' });
    } catch (e) { setOnline({ st: 'err', list: [], msg: cloudErr(e) }); }
  };
  const friendly = (row) => {
    const today = new Date().toDateString();
    if ((save.fr || {})[row.id] === today) return say('Bu takımla bugün zaten oynadın. Yarın tekrar.');
    let T; try { T = JSON.parse(row.squad); } catch { return say('Bu takımın kadrosu okunamadı.'); }
    T.players.forEach((p, i) => { p.id = p.id || 'x' + i; }); T.start = T.players.map((p) => p.id);
    setModal({ k: 'friendly', T, row });
  };

  // canlı oda
  const hostLive = async () => {
    try {
      const F = await withTimeout(cloud(), 9000);
      const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPRSTUVYZ23456789'[ri(0, 28)]).join('');
      const A = engineTeam(club);
      await F.set(`lig/rooms/${code}`, { host: F.uid, hteam: JSON.stringify(A), half: Math.min(save.half, 120), t: Date.now() });
      F.disconnectRemove(`lig/rooms/${code}`);
      setModal({ k: 'room', code, wait: true });
      const un = F.on(`lig/rooms/${code}/gteam`, (v) => {
        if (!v) return; un && un();
        const B = JSON.parse(v);
        setModal(null);
        startHostLoop(F, code, A, B);
      });
      hostLive.un = un;
    } catch (e) { say(cloudErr(e)); }
  };
  const startHostLoop = (F, code, A, B) => {
    const half = Math.min(save.half, 120);
    let m = null, last = { k: 0, p: 0, s: 0 }, un = null, pub = null;
    const ready = (mm) => {
      m = mm;
      un = F.on(`lig/rooms/${code}/in`, (v) => {
        if (!v || !m) return;
        m.input[1].x = v.x; m.input[1].y = v.y;
        if (v.k > last.k) m.input[1].k = 1; if (v.p > last.p) m.input[1].p = 1; if (v.s > last.s) m.input[1].sw = 1;
        last = v;
      });
      pub = setInterval(() => {
        F.set(`lig/rooms/${code}/st`, snapshot(m)).catch(() => {});
        if (m.over) {
          clearInterval(pub); un && un();
          setTimeout(() => { F.remove(`lig/rooms/${code}`).catch(() => {}); }, 4000);
          setLive(null); setPost({ live: true, gf: m.score[0], ga: m.score[1], oppName: B.name, ev: m.ev, shots: m.stats.shots, poss: m.stats.poss }); setScr('post');
        }
      }, 70);
    };
    setLive({ role: 'host', code, A, B, half, F, ready });
    setScr('live');
  };
  const joinLive = async (codeIn) => {
    const code = (codeIn || '').trim().toUpperCase();
    if (code.length < 4) return say('4 harfli kodu yaz.');
    try {
      const F = await withTimeout(cloud(), 9000);
      const r = await F.get(`lig/rooms/${code}`);
      if (!r || !r.hteam) return say('Oda bulunamadı.');
      if (r.gteam) return say('Bu odada maç başlamış.');
      const A = JSON.parse(r.hteam), B = engineTeam(club);
      await F.set(`lig/rooms/${code}/gteam`, JSON.stringify(B));
      setModal(null);
      setLive({ role: 'guest', code, A, B, room: { F, code } });
      setScr('live');
    } catch (e) { say(cloudErr(e)); }
  };

  const Online = () => {
    const code = roomCode, setCode = setRoomCode;
    if (online.st === 'idle') setTimeout(loadBoard, 0);
    return (
      <>
        <div className="lg-card">
          <h3>Arkadaşınla canlı maç</h3>
          <p className="lg-hint">İki telefon, iki takım. Biri oda kurar, diğeri 4 harfli kodu yazar. Herkes kendi takımının topa en yakın oyuncusunu yönetir.</p>
          <div className="lg-row2"><button className="pri" onClick={hostLive}>Oda kur</button><span className="lg-join"><input value={code} maxLength={4} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="KOD" /><button onClick={() => joinLive(code)}>Katıl</button></span></div>
        </div>
        <div className="lg-card">
          <div className="lg-rowsp"><h3>Dünya sıralaması</h3><button className="sm" onClick={loadBoard}>Yenile</button></div>
          {online.st === 'loading' && <p className="lg-sub">Yükleniyor…</p>}
          {online.st === 'err' && <p className="lg-warn">{online.msg}</p>}
          {online.list.map((r, i) => (
            <div key={r.id} className={'lg-board' + (r.id === online.me ? ' me' : '')}>
              <b>{i + 1}</b><Crest c1={r.c1} c2={r.c2} name={r.name} size={24} />
              <span><b>{r.name}</b><small>{r.league} · güç {r.pow} · {r.tro} kupa</small></span>
              {r.id !== online.me && <button className="sm" onClick={() => friendly(r)}>Maç yap</button>}
            </div>
          ))}
          {online.st === 'ok' && online.list.length <= 1 && <p className="lg-sub">Henüz başka takım yok. Arkadaşlarını davet et, sıralamada görünsünler.</p>}
          <p className="lg-hint">Dostluk maçında rakip takımı yapay zekâ yönetir. Her takımla günde bir kez oynayabilirsin.</p>
        </div>
      </>
    );
  };

  const P = modal && modal.k === 'player' ? (modal.market ? save.market : club.players).find((p) => p.id === modal.id) : null;

  return (
    <div className="lg">
      <div className="lg-top">
        <span className="lg-cur"><i className="coin" />{fmt(save.coins)}</span>
        <span className="lg-cur"><i className="gem" />{save.gems}</span>
        <span className="lg-lg">{season.league}</span>
      </div>
      <div className="lg-body">
        {tab === 'kulup' && Kulup()}
        {tab === 'kadro' && Kadro()}
        {tab === 'transfer' && Transfer()}
        {tab === 'lig' && Lig()}
        {tab === 'tesis' && Tesis()}
        {tab === 'online' && Online()}
      </div>
      <nav className="lg-nav">
        {[['kulup', 'Kulüp'], ['kadro', 'Kadro'], ['transfer', 'Transfer'], ['lig', 'Lig'], ['tesis', 'Tesis'], ['online', 'Online']].map(([k, n]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setSel(null); SFX.tap(); }}><Icon k={k} />{n}</button>
        ))}
      </nav>

      {P && (
        <div className="lg-modal" onClick={() => setModal(null)}>
          <div className="lg-mcard" onClick={(e) => e.stopPropagation()}>
            <div className="lg-pcard"><Ovr p={P} /><div><b>{P.n}</b><small>{POS[P.pos]} · {P.age} yaş · potansiyel {P.pot}</small><small>{SPECIAL[P.pos]} · maaş {wage(P)}/maç</small></div></div>
            {[['hiz', 'Hız'], ['sut', 'Şut'], ['pas', 'Pas'], ['def', P.pos === 'KL' ? 'Kalecilik' : 'Savunma']].map(([k, n]) => (
              <div key={k} className="lg-stat"><span>{n}</span><Bar v={P[k]} c="#7c6cf0" /><b>{P[k]}</b>{!modal.market && <button className="sm" onClick={() => { const r = mut((s) => train(s, s.club.players.find((x) => x.id === P.id), k)); if (r === 'cap') say('Bu oyuncu potansiyeline ulaştı.'); else if (!r) say('Yeterli para yok.'); else SFX.tap(); }}>+1 · {fmt(trainCost(save, P))}</button>}</div>
            ))}
            {!modal.market && <div className="lg-kv"><span>Kondisyon</span><b>%{Math.round(P.fit)}</b></div>}
            {!modal.market && <div className="lg-kv"><span>Maç / gol / asist</span><b>{P.apps} / {P.goals} / {P.ast}</b></div>}
            {modal.market ? (
              <button className="pri big" disabled={save.coins < P.price || club.players.length >= 14} onClick={() => { mut((s) => { const i = s.market.findIndex((x) => x.id === P.id); const p = s.market.splice(i, 1)[0]; s.coins -= p.price; p.num = [2, 3, 6, 7, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].find((n) => !s.club.players.some((q) => q.num === n)) || 99; delete p.price; s.club.players.push(p); s.news.unshift({ t: Date.now(), x: `${p.n} kadromuza katıldı!` }); }); setModal(null); SFX.goal(); say('Transfer tamam!'); }}>{club.players.length >= 14 ? 'Kadro dolu (14)' : `Satın al · ${fmt(P.price)}`}</button>
            ) : (
              <>
                {P.inj > 0 && save.gems >= 4 && <button onClick={() => mut((s) => { s.gems -= 4; s.club.players.find((x) => x.id === P.id).inj = 0; })}>Tedavi et (4 elmas)</button>}
                {P.fit < 95 && <button onClick={() => { if (save.gems < 2) return say('2 elmas gerekli.'); mut((s) => { s.gems -= 2; s.club.players.find((x) => x.id === P.id).fit = 100; }); }}>Kondisyonu doldur (2 elmas)</button>}
                <button className="danger" disabled={club.players.length <= 6} onClick={() => { const v = Math.round(value(P) * 0.8); mut((s) => { s.club.players = s.club.players.filter((x) => x.id !== P.id); s.club.start = s.club.start.filter((id) => id !== P.id); const b = s.club.players.find((x) => !s.club.start.includes(x.id) && !x.inj); if (b) s.club.start.push(b.id); s.coins += v; s.news.unshift({ t: Date.now(), x: `${P.n} satıldı (${fmt(v)}).` }); }); setModal(null); }}>Sat · {fmt(Math.round(value(P) * 0.8))}</button>
              </>
            )}
            <button onClick={() => setModal(null)}>Kapat</button>
          </div>
        </div>
      )}
      {modal && modal.k === 'season' && (
        <div className="lg-modal"><div className="lg-mcard">
          <h2>{modal.d.champ ? 'Şampiyon!' : modal.d.up ? 'Yükseldin!' : modal.d.down ? 'Küme düştün' : 'Sezon sonu'}</h2>
          <p>{modal.d.txt}</p>
          <div className="lg-kv"><span>Sezon ödülü</span><b>+{fmt(modal.d.prize)}</b></div>
          <div className="lg-kv"><span>Elmas</span><b>+{modal.d.champ ? 15 : 5}</b></div>
          {modal.d.retired.length > 0 && <p className="lg-sub">Emekli olanlar: {modal.d.retired.join(', ')}</p>}
          <p className="lg-sub">Altyapıdan yükselen: {modal.d.youth}</p>
          <button className="pri big" onClick={() => setModal(null)}>Yeni sezon</button>
        </div></div>
      )}
      {modal && modal.k === 'friendly' && (
        <div className="lg-modal" onClick={() => setModal(null)}><div className="lg-mcard" onClick={(e) => e.stopPropagation()}>
          <h2>Dostluk maçı</h2>
          <div className="lg-vs"><span><Crest {...club} size={40} /><b>{club.name}</b></span><i>VS</i><span><Crest c1={modal.T.c1} c2={modal.T.c2} name={modal.T.name} size={40} /><b>{modal.T.name}</b></span></div>
          <p className="lg-hint">Kazanırsan 150, kaybetsen de 60 para. Kondisyon düşer, lig puanı etkilenmez.</p>
          <div className="lg-row3">
            <button className="pri" onClick={() => { const f = { kind: 'dostluk', label: 'Dostluk maçı', home: true, fid: modal.row.id }; setModal(null); startMatch('play', f, modal.T); }}>Oyna</button>
            <button onClick={() => { const f = { kind: 'dostluk', label: 'Dostluk maçı', home: true, fid: modal.row.id }; setModal(null); startMatch('watch', f, modal.T); }}>İzle</button>
            <button onClick={() => { const f = { kind: 'dostluk', label: 'Dostluk maçı', home: true, fid: modal.row.id }; setModal(null); startMatch('instant', f, modal.T); }}>Sonuç</button>
          </div>
        </div></div>
      )}
      {modal && modal.k === 'room' && (
        <div className="lg-modal"><div className="lg-mcard">
          <h2>Oda kodu</h2><div className="lg-code">{modal.code}</div>
          <p className="lg-hint">Arkadaşın Online sekmesinde bu kodu yazsın. Bağlanınca maç başlar.</p>
          <button onClick={async () => { try { const F = await cloud(); hostLive.un && hostLive.un(); F.remove(`lig/rooms/${modal.code}`); } catch { /* yok */ } setModal(null); }}>Vazgeç</button>
        </div></div>
      )}
      {modal && modal.k === 'reset' && (
        <div className="lg-modal"><div className="lg-mcard">
          <h2>Emin misin?</h2><p>Kulübün, oyuncuların ve kupaların silinir.</p>
          <button className="danger" onClick={() => { try { localStorage.removeItem(KEY); } catch { /* yok */ } setSave(null); setModal(null); setScr('start'); }}>Evet, sıfırla</button>
          <button onClick={() => setModal(null)}>Vazgeç</button>
        </div></div>
      )}
      {modal && modal.k === 'help' && (
        <div className="lg-modal" onClick={() => setModal(null)}><div className="lg-mcard" onClick={(e) => e.stopPropagation()}>
          <h2>Nasıl oynanır</h2>
          <p><b>Hedef:</b> Mahalle Ligi'nden başlayıp 7 lig basamağını çıkarak Süper Lig şampiyonu olmak. Her sezon 14 lig maçı ve 3 turluk kupa var. İlk 2 yükselir.</p>
          <p><b>Maç:</b> 5'e 5 oynanır. "Maçı oyna" dersen topa en yakın oyuncunu sen yönetirsin: sol tarafta sürükleyerek koş, Şut ve Pas düğmeleri. Klavyede yön tuşları, Boşluk şut, X pas, Q oyuncu değiş. İstersen "İzle" ya da "Hemen sonuç".</p>
          <p><b>Kadro:</b> 5 kişilik ilk diziliş, diziliş şekli ve taktik senin. Yorgun oyuncu yavaşlar. Kondisyon gerçek zamanda dolar, yedekler maç dinlenerek toparlanır.</p>
          <p><b>Gelişim:</b> Antrenmanla özellik artır, genç oyuncular oynadıkça gelişir. Tesisler gelir ve gelişimi artırır. Maaşlar her maç ödenir.</p>
          <p><b>Online:</b> Takımın dünya sıralamasına yazılır, başka oyuncuların takımlarıyla dostluk maçı yapar, oda koduyla arkadaşınla canlı maç oynarsın.</p>
          <button className="pri big" onClick={() => setModal(null)}>Tamam</button>
        </div></div>
      )}
      {toast && <div className="lg-toast">{toast}</div>}
    </div>
  );
}
