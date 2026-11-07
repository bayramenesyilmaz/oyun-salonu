import { useEffect, useRef, useState } from 'react';
import { Soup, COLS, radiusOf } from './Game.js';
import * as S from '../bulutyaris/game/sfx.js';
import './corba.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const rp = () => { try { return JSON.parse(localStorage.getItem('cs-prefs') || '{}'); } catch { return {}; } };

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

  useEffect(() => { try { localStorage.setItem('cs-prefs', JSON.stringify({ nick, color, level, sound })); } catch { /* yok */ } S.setSound(sound); }, [nick, color, level, sound]);
  useEffect(() => {
    const g = new Soup(cv.current, { onFrame: (x) => setH(x), onEnd: (r) => { setEnd(r); setScreen('end'); } });
    game.current = g; if (TEST) window.__cs = g;
    const kd = {}; const upd = () => { const x = (kd.ArrowRight || kd.d ? 1 : 0) - (kd.ArrowLeft || kd.a ? 1 : 0), y = (kd.ArrowDown || kd.s ? 1 : 0) - (kd.ArrowUp || kd.w ? 1 : 0); if (x || y) { g.input.x = x; g.input.y = y; g.input.has = true; } else if (!g._ptr) g.input.has = false; };
    const k1 = (e) => { if (e.key === ' ') { g.input.dash = true; e.preventDefault(); } kd[e.key] = true; upd(); };
    const k2 = (e) => { if (e.key === ' ') g.input.dash = false; kd[e.key] = false; upd(); };
    const mm = (e) => { if (IS_TOUCH || e.pointerType === 'touch') return; g._ptr = true; g.input.x = e.clientX - innerWidth / 2; g.input.y = e.clientY - innerHeight / 2; g.input.has = true; };
    addEventListener('keydown', k1); addEventListener('keyup', k2); addEventListener('pointermove', mm);
    return () => { removeEventListener('keydown', k1); removeEventListener('keyup', k2); removeEventListener('pointermove', mm); g.destroy(); };
  }, []);
  const play = () => { S.unlock(); setEnd(null); game.current.start({ nick: nick.trim() || 'Sen', color, level }); setScreen('play'); };
  useEffect(() => { if (QS.has('quick')) setTimeout(play, 300); /* eslint-disable-next-line */ }, []);

  const dn = (e) => { if (!IS_TOUCH && e.pointerType !== 'touch') return; const s = stick.current; if (s.id !== null) return; s.id = e.pointerId; s.ox = e.clientX; s.oy = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }); };
  const mv = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy), R = 52; if (m > R) { dx = dx / m * R; dy = dy / m * R; } const g = game.current; g.input.x = dx / R; g.input.y = dy / R; g.input.has = true; setKnob({ x: s.ox, y: s.oy, dx, dy }); };
  const up = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; s.id = null; game.current.input.has = false; setKnob(null); };

  return (
    <div className="cs">
      <canvas ref={cv} className="cs-cv" />
      {screen === 'play' && h && (
        <div className="cs-hud">
          <div className="cs-top"><div className="cs-pill"><small>KÜTLE</small><b>{h.mass}</b></div><div className="cs-pill"><small>SIRA</small><b>{h.rank}</b></div><div className="cs-pill"><b>{Math.floor(h.left / 60)}:{String(h.left % 60).padStart(2, '0')}</b></div></div>
          <div className="cs-lb">{h.lb.map((r, i) => <div key={i} className={r.me ? 'me' : ''}><i style={{ background: COLS[r.color % 8] }} />{r.name}<b>{r.mass}</b></div>)}</div>
          <div className="cs-feed">{h.feed.map((f, i) => <div key={i} className={f.me ? 'me' : ''}>{f.a} → {f.v}</div>)}</div>
          {h.toast && <div className="cs-toast">{h.toast}</div>}
          {h.dead && <div className="cs-dead">YUTULDUN<small>{Math.ceil(h.respawn)} sn sonra doğuyorsun</small></div>}
          {!IS_TOUCH && <div className="cs-keys">Fareyle yönlen · BOŞLUK: atılma</div>}
        </div>
      )}
      {screen === 'play' && IS_TOUCH && <>
        <div className="cs-zone" onPointerDown={dn} onPointerMove={mv} onPointerUp={up} onPointerCancel={up} />
        {knob && <div className="cs-knob" style={{ left: knob.x - 52, top: knob.y - 52 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
        <button className={'cs-dash' + (h?.dashReady ? ' rdy' : '')} onPointerDown={() => { game.current.input.dash = true; }} onPointerUp={() => { game.current.input.dash = false; }} onPointerCancel={() => { game.current.input.dash = false; }}>ATIL</button>
      </>}
      {screen === 'menu' && (
        <div className="cs-menu">
          <div className="cs-logo"><small>YUT VE BÜYÜ</small><b>Çorba Savaşı</b></div>
          <p className="cs-sub">Çorbada mantı ol: malzeme ye, küçükleri yut, büyüklerden kaç. Acı biberden uzak dur!</p>
          <input className="cs-in" value={nick} maxLength={10} placeholder="Takma adın" onChange={(e) => setNick(e.target.value)} />
          <div className="cs-cols">{COLS.map((c, i) => <button key={i} className={i === color ? 'on' : ''} style={{ background: c }} onClick={() => setColor(i)} />)}</div>
          <div className="cs-chips">{['Kolay', 'Normal', 'Zor'].map((t, i) => <button key={t} className={i === level ? 'on' : ''} onClick={() => setLevel(i)}>{t}</button>)}</div>
          <button className="cs-go" onClick={play}>ÇORBAYA ATLA</button>
          <button className="cs-snd" onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
          <a className="cs-back" href="/">← Oyun salonu</a>
        </div>
      )}
      {screen === 'end' && end && (
        <div className="cs-menu">
          <div className="cs-logo"><small>3 DAKİKA BİTTİ</small><b>{end.rank === 1 ? 'ÇORBANIN ŞEFİSİN!' : end.rank + '. oldun'}</b></div>
          <div className="cs-tbl">{end.rows.map((r, i) => <div key={i} className={r.me ? 'me' : ''}><span>{i + 1}</span><i style={{ background: COLS[r.color % 8] }} /><em>{r.name}</em><u>{r.kills} yutma</u><b>{r.mass}</b></div>)}</div>
          <button className="cs-go" onClick={play}>TEKRAR</button>
          <button className="cs-snd" onClick={() => setScreen('menu')}>Menü</button>
        </div>
      )}
    </div>
  );
}
