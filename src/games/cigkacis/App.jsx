import { useEffect, useRef, useState } from 'react';
import { Run, COLS } from './Game.js';
import * as S from '../bulutyaris/game/sfx.js';
import './cigkacis.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const rp = () => { try { return JSON.parse(localStorage.getItem('ck-prefs') || '{}'); } catch { return {}; } };
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
  useEffect(() => { try { localStorage.setItem('ck-prefs', JSON.stringify({ nick, color, level, sound })); } catch { /* yok */ } S.setSound(sound); }, [nick, color, level, sound]);
  useEffect(() => {
    const g = new Run(cv.current, { touch: IS_TOUCH, onFrame: (x) => setH(x), onEnd: (r) => { setEnd(r); setScreen('end'); } });
    game.current = g; if (TEST) window.__ck = g;
    const kd = {}; const upd = () => { g.input.steer = (kd.ArrowRight || kd.d ? 1 : 0) - (kd.ArrowLeft || kd.a ? 1 : 0); g.input.jump = !!(kd[' '] || kd.ArrowUp || kd.w); };
    const k1 = (e) => { kd[e.key] = true; upd(); if (e.key === ' ') e.preventDefault(); }, k2 = (e) => { kd[e.key] = false; upd(); };
    addEventListener('keydown', k1); addEventListener('keyup', k2);
    return () => { removeEventListener('keydown', k1); removeEventListener('keyup', k2); g.destroy(); };
  }, []);
  const play = () => { S.unlock(); setEnd(null); game.current.start({ seed: 1 + Math.floor(Math.random() * 9999), nick: nick.trim() || 'Sen', color, level }); setScreen('play'); };
  useEffect(() => { if (QS.has('quick')) setTimeout(play, 300); /* eslint-disable-next-line */ }, []);
  const hold = (v) => ({ onPointerDown: (e) => { e.currentTarget.setPointerCapture(e.pointerId); game.current.input.steer = v; }, onPointerUp: () => { game.current.input.steer = 0; }, onPointerCancel: () => { game.current.input.steer = 0; } });
  return (
    <div className="ck">
      <canvas ref={cv} className="ck-cv" />
      {screen === 'play' && h && (
        <div className="ck-hud">
          <div className="ck-top"><div className="ck-pill"><small>SIRA</small><b>{h.rank}/4</b></div><div className="ck-pill"><b>{h.spd}</b><small>km/sa</small></div></div>
          <div className="ck-bar"><i className="av" style={{ left: h.av * 100 + '%' }} />{h.dots.map((d, i) => <i key={i} className={d.me ? 'me' : ''} style={{ left: d.p * 100 + '%', background: hex(COLS[d.color % 4]), opacity: d.dead ? 0.3 : 1 }} />)}</div>
          {h.count > 0 && <div className="ck-count">{h.count}</div>}
          {h.toast && <div className="ck-toast">{h.toast}</div>}
          {h.danger && h.state === 'play' && <div className="ck-danger">ÇIĞ YAKLAŞIYOR!<small>{h.gap} m</small></div>}
          {h.boost && <div className="ck-fx" />}
          {!IS_TOUCH && <div className="ck-keys">← → ya da A D: yönlen · BOŞLUK: zıpla</div>}
        </div>
      )}
      {screen === 'play' && IS_TOUCH && <>
        <div className="ck-zone l" {...hold(-1)} /><div className="ck-zone r" {...hold(1)} />
        <button className="ck-jump" onPointerDown={() => { game.current.input.jump = true; }} onPointerUp={() => { game.current.input.jump = false; }} onPointerCancel={() => { game.current.input.jump = false; }}>ZIPLA</button>
      </>}
      {screen === 'menu' && (
        <div className="ck-menu">
          <div className="ck-logo"><small>KIZAK YARIŞI</small><b>Çığ Kaçışı</b></div>
          <p className="ck-sub">Yamaçtan aşağı süzül, ağaçlardan kaç, rampalardan uç. Arkandan çığ geliyor, yakalanma!</p>
          <input className="ck-in" value={nick} maxLength={10} placeholder="Takma adın" onChange={(e) => setNick(e.target.value)} />
          <div className="ck-cols">{COLS.map((c, i) => <button key={i} className={i === color ? 'on' : ''} style={{ background: hex(c) }} onClick={() => setColor(i)} />)}</div>
          <div className="ck-chips">{['Kolay', 'Normal', 'Zor'].map((t, i) => <button key={t} className={i === level ? 'on' : ''} onClick={() => setLevel(i)}>{t}</button>)}</div>
          <button className="ck-go" onClick={play}>KAY!</button>
          <button className="ck-snd" onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
          <a className="ck-back" href="/">← Oyun salonu</a>
        </div>
      )}
      {screen === 'end' && end && (
        <div className="ck-menu">
          <div className="ck-logo"><small>{end.caught ? 'ÇIĞ SENİ YAKALADI' : 'YARIŞ BİTTİ'}</small><b>{end.rank === 1 ? 'BİRİNCİSİN!' : end.rank + '. oldun'}</b></div>
          <div className="ck-tbl">{end.rows.map((r, i) => <div key={i} className={r.me ? 'me' : ''}><span>{i + 1}</span><i style={{ background: hex(COLS[r.color % 4]) }} /><em>{r.name}</em><u>{r.fin ? fmt(r.fin) : r.dead ? 'çığa yakalandı' : r.d + ' m'}</u></div>)}</div>
          <button className="ck-go" onClick={play}>TEKRAR</button>
          <button className="ck-snd" onClick={() => setScreen('menu')}>Menü</button>
        </div>
      )}
    </div>
  );
}
