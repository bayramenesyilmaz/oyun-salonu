import { useEffect, useRef, useState } from 'react';
import { Glide, COLS } from './Game.js';
import * as S from '../bulutyaris/game/sfx.js';
import './kanat.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const rp = () => { try { return JSON.parse(localStorage.getItem('kn-prefs') || '{}'); } catch { return {}; } };
const fmt = (t) => t ? `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}` : '—';

export default function App() {
  const cv = useRef(null), game = useRef(null), pr = rp();
  const [screen, setScreen] = useState('menu');
  const [nick, setNick] = useState(pr.nick || '');
  const [color, setColor] = useState(pr.color ?? 0);
  const [level, setLevel] = useState(pr.level ?? 1);
  const [sound, setSound] = useState(pr.sound !== false);
  const [h, setH] = useState(null);
  const [end, setEnd] = useState(null);
  const stick = useRef({ id: null, ox: 0, oy: 0 });
  const [knob, setKnob] = useState(null);
  useEffect(() => { try { localStorage.setItem('kn-prefs', JSON.stringify({ nick, color, level, sound })); } catch { /* yok */ } S.setSound(sound); }, [nick, color, level, sound]);
  useEffect(() => {
    const g = new Glide(cv.current, { touch: IS_TOUCH, onFrame: (x) => setH(x), onEnd: (r) => { setEnd(r); setScreen('end'); } });
    game.current = g; if (TEST) window.__kn = g;
    const kd = {}; const upd = () => { g.input.x = (kd.ArrowRight || kd.d ? 1 : 0) - (kd.ArrowLeft || kd.a ? 1 : 0); g.input.y = (kd.ArrowUp || kd.w ? 1 : 0) - (kd.ArrowDown || kd.s ? 1 : 0); };
    const k1 = (e) => { kd[e.key] = true; upd(); }, k2 = (e) => { kd[e.key] = false; upd(); };
    addEventListener('keydown', k1); addEventListener('keyup', k2);
    return () => { removeEventListener('keydown', k1); removeEventListener('keyup', k2); g.destroy(); };
  }, []);
  const play = () => { S.unlock(); setEnd(null); game.current.start({ seed: 1 + Math.floor(Math.random() * 9999), nick: nick.trim() || 'Sen', color, level }); setScreen('play'); };
  useEffect(() => { if (QS.has('quick')) setTimeout(play, 300); /* eslint-disable-next-line */ }, []);
  const dn = (e) => { const s = stick.current; if (s.id !== null) return; s.id = e.pointerId; s.ox = e.clientX; s.oy = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }); };
  const mv = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy), R = 56; if (m > R) { dx = dx / m * R; dy = dy / m * R; } const g = game.current; g.input.x = dx / R; g.input.y = -dy / R; setKnob({ x: s.ox, y: s.oy, dx, dy }); };
  const up = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; s.id = null; game.current.input.x = 0; game.current.input.y = 0; setKnob(null); };
  return (
    <div className="kn">
      <canvas ref={cv} className="kn-cv" />
      {screen === 'play' && h && (
        <div className="kn-hud">
          <div className="kn-top"><div className="kn-pill"><small>SIRA</small><b>{h.rank}/4</b></div><div className="kn-pill"><small>HALKA</small><b>{h.ring}/{h.total}</b></div><div className="kn-pill"><b>{h.spd}</b><small>km/sa</small></div><div className="kn-pill"><b>{h.alt}</b><small>m</small></div></div>
          <div className="kn-arrow" style={{ transform: `translateX(-50%) rotate(${h.ang}rad)` }}>▲</div>
          <div className="kn-dist">{h.dist} m</div>
          {h.count > 0 && <div className="kn-count">{h.count}</div>}
          {h.toast && <div className="kn-toast">{h.toast}</div>}
          {h.boost && <div className="kn-fx" />}
          {!IS_TOUCH && <div className="kn-keys">← → yönlen · ↑ burun yukarı · ↓ dalış (hızlanır)</div>}
        </div>
      )}
      {screen === 'play' && IS_TOUCH && <>
        <div className="kn-zone" onPointerDown={dn} onPointerMove={mv} onPointerUp={up} onPointerCancel={up} />
        {knob && <div className="kn-knob" style={{ left: knob.x - 52, top: knob.y - 52 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
      </>}
      {screen === 'menu' && (
        <div className="kn-menu">
          <div className="kn-logo"><small>SÜZÜLME YARIŞI</small><b>Kanat Yarışı</b></div>
          <p className="kn-sub">Adaların üstünde süzül, halkalardan geç, dalışla hızlan. Altın halka sana ekstra hız verir.</p>
          <input className="kn-in" value={nick} maxLength={10} placeholder="Takma adın" onChange={(e) => setNick(e.target.value)} />
          <div className="kn-cols">{COLS.map((c, i) => <button key={i} className={i === color ? 'on' : ''} style={{ background: hex(c) }} onClick={() => setColor(i)} />)}</div>
          <div className="kn-chips">{['Kolay', 'Normal', 'Zor'].map((t, i) => <button key={t} className={i === level ? 'on' : ''} onClick={() => setLevel(i)}>{t}</button>)}</div>
          <button className="kn-go" onClick={play}>UÇ!</button>
          <button className="kn-snd" onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
          <a className="kn-back" href="/">← Oyun salonu</a>
        </div>
      )}
      {screen === 'end' && end && (
        <div className="kn-menu">
          <div className="kn-logo"><small>YARIŞ BİTTİ</small><b>{end.rank === 1 ? 'BİRİNCİSİN!' : end.rank + '. oldun'}</b></div>
          <div className="kn-tbl">{end.rows.map((r, i) => <div key={i} className={r.me ? 'me' : ''}><span>{i + 1}</span><i style={{ background: hex(COLS[r.color % 4]) }} /><em>{r.name}</em><u>{r.fin ? fmt(r.fin) : r.rings + ' halka'}</u></div>)}</div>
          <button className="kn-go" onClick={play}>TEKRAR</button>
          <button className="kn-snd" onClick={() => setScreen('menu')}>Menü</button>
        </div>
      )}
    </div>
  );
}
