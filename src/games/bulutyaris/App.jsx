import { useCallback, useEffect, useRef, useState } from 'react';
import { Race, CAR_COLORS, LAPS } from './game/Race.js';
import * as S from './game/sfx.js';
import './yaris.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const readPrefs = () => { try { return JSON.parse(localStorage.getItem('by-prefs') || '{}'); } catch { return {}; } };

export default function App() {
  const cv = useRef(null);
  const game = useRef(null);
  const prefs = readPrefs();
  const [screen, setScreen] = useState('menu');
  const [color, setColor] = useState(Number.isInteger(prefs.color) ? prefs.color : 0);
  const [sound, setSound] = useState(prefs.sound !== false);
  const [h, setH] = useState(null);
  const [end, setEnd] = useState(null);
  const [how, setHow] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('by-prefs', JSON.stringify({ color, sound })); } catch { /* yok say */ }
    S.setSound(sound);
  }, [color, sound]);

  useEffect(() => {
    const g = new Race(cv.current, {
      touch: IS_TOUCH,
      onHud: (x) => setH(x),
      onEnd: (r) => { setEnd({ ...r, order: g.standings() }); setScreen('end'); },
    });
    game.current = g;
    if (TEST) window.__race = g;
    return () => g.dispose();
  }, []);

  const begin = useCallback(() => {
    setEnd(null);
    setH(null);
    game.current.start(CAR_COLORS[color]);
    setScreen('play');
  }, [color]);

  useEffect(() => {
    if (QS.has('quick')) setTimeout(() => begin(), 300);
  }, [begin]);

  // klavye
  useEffect(() => {
    const st = { l: 0, r: 0 };
    const upd = () => game.current?.setSteer(st.r - st.l);
    const key = (down) => (e) => {
      const g = game.current;
      if (!g) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { st.l = down ? 1 : 0; upd(); }
      else if (k === 'arrowright' || k === 'd') { st.r = down ? 1 : 0; upd(); }
      else if (k === ' ' || k === 'arrowup' || k === 'w') { g.setNitro(down); e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's' || k === 'shift') g.setBrake(down);
    };
    const d = key(true), u = key(false);
    addEventListener('keydown', d);
    addEventListener('keyup', u);
    return () => { removeEventListener('keydown', d); removeEventListener('keyup', u); };
  }, []);

  const hold = (fn) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); fn(true); },
    onPointerUp: () => fn(false),
    onPointerCancel: () => fn(false),
    onPointerLeave: () => fn(false),
    onContextMenu: (e) => e.preventDefault(),
  });
  const g = () => game.current;
  const playing = screen === 'play';

  return (
    <div className={'by' + (IS_TOUCH ? ' touch' : '')}>
      <canvas ref={cv} className="by-cv" />
      {playing && h && (
        <div className="by-hud">
          <div className="by-top">
            <div className="by-pill"><b>{h.rank}</b>/{h.total}<small>sıra</small></div>
            <div className="by-pill"><b>{h.lap}</b>/{h.laps}<small>tur</small></div>
          </div>
          {(h.combo || h.air > 0) && <div className="by-combo">{h.combo || `HAVADA +${h.air}`}</div>}
          {h.toast && <div className="by-toast">{h.toast}</div>}
          {h.count > 0 && <div className="by-count" key={h.count}>{h.count}</div>}
          {h.go && <div className="by-count go">BAŞLA!</div>}
          <div className="by-speed"><b>{h.speed}</b><small>km/s</small></div>
          <div className={'by-nitro' + (h.nitroOn ? ' on' : '')}><i style={{ width: h.nitro * 100 + '%' }} /><small>NİTRO</small></div>
        </div>
      )}
      {playing && (
        <>
          <div className="by-zone left" {...hold((v) => g()?.setSteer(v ? -1 : 0))} />
          <div className="by-zone right" {...hold((v) => g()?.setSteer(v ? 1 : 0))} />
          <button className="by-btn nitro" {...hold((v) => g()?.setNitro(v))}>NİTRO</button>
          <button className="by-btn brake" {...hold((v) => g()?.setBrake(v))}>FREN</button>
          {!IS_TOUCH && <div className="by-keys">← → direksiyon · Boşluk nitro · S fren</div>}
        </>
      )}
      {screen === 'menu' && (
        <div className="by-menu">
          <div className="by-logo"><small>BULUT ÜSTÜ</small><b>YARIŞ</b></div>
          <p className="by-sub">Bulutların üzerindeki yolda 6 araç, rampalardan uç, havada kal, nitroyu doldur.</p>
          <div className="by-colors">
            {CAR_COLORS.map((c, i) => <button key={c} className={color === i ? 'on' : ''} style={{ background: hex(c) }} onClick={() => setColor(i)} aria-label={'Renk ' + (i + 1)} />)}
          </div>
          <button className="by-go" onClick={begin}>YARIŞA BAŞLA</button>
          <div className="by-row">
            <button onClick={() => setHow(true)}>Nasıl oynanır</button>
            <button onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
            <a href="/">Ana sayfa</a>
          </div>
          <small className="by-fine">{LAPS} tur · bota karşı · online yakında</small>
        </div>
      )}
      {how && (
        <div className="by-modal" onClick={() => setHow(false)}>
          <div className="by-card" onClick={(e) => e.stopPropagation()}>
            <h3>Nasıl oynanır</h3>
            <ul>
              <li>Araba kendiliğinden gaza basar. Ekranın sol/sağ yarısına basılı tutarak yönlendir (bilgisayarda ok tuşları).</li>
              <li>Sarı-siyah rampaya hızlı gir. Yavaş girersen boşluğa düşersin.</li>
              <li>Havada ne kadar kalırsan o kadar puan ve nitro kazanırsın.</li>
              <li>Mavi oklu plaka hız verir. Nitro düğmesi (Boşluk) basılı tutuldukça hızlandırır.</li>
              <li>{LAPS} turu ilk bitiren kazanır.</li>
            </ul>
            <button className="by-go small" onClick={() => setHow(false)}>Tamam</button>
          </div>
        </div>
      )}
      {screen === 'end' && end && (
        <div className="by-menu end">
          <div className="by-logo"><small>{end.rank === 1 ? 'KAZANDIN' : 'YARIŞ BİTTİ'}</small><b>{end.rank}. SIRA</b></div>
          <div className="by-stats"><span>Süre <b>{fmt(end.time)}</b></span><span>Hava puanı <b>{end.score}</b></span></div>
          <ol className="by-order">{end.order.map((o, i) => <li key={i} className={o.me ? 'me' : ''}><b>{i + 1}</b>{o.name}</li>)}</ol>
          <button className="by-go" onClick={begin}>TEKRAR YARIŞ</button>
          <div className="by-row"><button onClick={() => { game.current.toMenu(); setScreen('menu'); }}>Menü</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
    </div>
  );
}
