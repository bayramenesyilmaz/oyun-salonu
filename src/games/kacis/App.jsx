import { useEffect, useRef, useState } from 'react';
import { KGame } from './game/game.js';
import { NAMES, COLS } from './game/story.js';
import './kc.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)));

export default function App() {
  const cv = useRef(null);
  const game = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [hud, setHud] = useState(null);
  const [sub, setSub] = useState(null);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const joy = useRef(null);
  const lookId = useRef(null);

  useEffect(() => {
    if (QS.has('quick')) setScreen('play');
  }, []);

  useEffect(() => {
    if (screen !== 'play' || !cv.current) return;
    let g = null;
    let off = false;
    KGame.create(cv.current, { manual: QS.has('manual'), cb: { onHud: setHud, onSub: (s) => setSub(s ? { ...s } : null), onPause: () => setPaused(true), onDone: () => setDone(true) } })
      .then((x) => {
        if (off) return x.dispose();
        g = x;
        game.current = x;
        if (TEST) window.__ka = x;
        if (!IS_TOUCH && !QS.has('quick')) x.lockPointer();
      })
      .catch((e) => setErr(String(e && e.message ? e.message : e)));
    return () => {
      off = true;
      g?.dispose();
      game.current = null;
    };
  }, [screen]);

  const resume = () => {
    setPaused(false);
    if (game.current) {
      game.current.paused = false;
      if (!IS_TOUCH) game.current.lockPointer();
    }
  };
  useEffect(() => {
    if (game.current) game.current.paused = paused;
  }, [paused]);
  const toMenu = () => {
    setScreen('menu');
    setPaused(false);
    setDone(false);
    setHud(null);
    setSub(null);
  };

  const onJoy = (e) => {
    const g = game.current;
    if (!g) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const th = 14;
    g.k.f = dy < -th ? 1 : 0;
    g.k.b = dy > th ? 1 : 0;
    g.k.l = dx < -th ? 1 : 0;
    g.k.r = dx > th ? 1 : 0;
    joy.current = { x: dx, y: dy };
    setJoyPos({ x: Math.max(-40, Math.min(40, dx)), y: Math.max(-40, Math.min(40, dy)) });
  };
  const [joyPos, setJoyPos] = useState({ x: 0, y: 0 });
  const endJoy = () => {
    const g = game.current;
    if (g) g.k.f = g.k.b = g.k.l = g.k.r = 0;
    setJoyPos({ x: 0, y: 0 });
  };
  const hold = (k) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      game.current?.touch(k, 1);
    },
    onPointerUp: () => game.current?.touch(k, 0),
    onPointerCancel: () => game.current?.touch(k, 0),
  });
  const lookDown = (e) => {
    lookId.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const lookMove = (e) => {
    const l = lookId.current;
    if (!l || l.id !== e.pointerId) return;
    game.current?.look((e.clientX - l.x) * 1.6, (e.clientY - l.y) * 1.6);
    l.x = e.clientX;
    l.y = e.clientY;
  };

  if (screen === 'play') {
    return (
      <div className={'kc-root' + (IS_TOUCH ? ' touch' : '')}>
        <canvas ref={cv} className="kc-canvas" onClick={() => !IS_TOUCH && !paused && game.current?.lockPointer()} />
        {err && (
          <div className="kc-modal">
            <div className="kc-card">
              <h2>Sahne açılamadı</h2>
              <p>{err}</p>
              <button className="kc-btn" onClick={toMenu}>Geri</button>
            </div>
          </div>
        )}
        {!game.current && !err && <div className="kc-loading">Yükleniyor…</div>}
        {hud && (
          <>
            <div className="kc-obj">
              <small>Görev</small>
              {hud.obj}
            </div>
            <div className="kc-cross" />
            {hud.prompt && <div className="kc-prompt">{hud.prompt}</div>}
            {hud.lock > 0 && hud.lock < 1 && <div className="kc-lock"><i style={{ width: hud.lock * 100 + '%' }} /></div>}
            <div className={'kc-eye' + (hud.meter > 0.05 ? ' on' : '')} style={{ opacity: Math.min(1, hud.meter * 2) }}>
              <i style={{ width: hud.meter * 100 + '%' }} />
              <span>FARK EDİLİYORSUN</span>
            </div>
            {hud.crouch ? <div className="kc-state">Çömelik</div> : null}
            <div className="kc-red" style={{ opacity: hud.caught ? 0.9 : hud.meter * 0.55 }} />
          </>
        )}
        {sub && (
          <div className="kc-sub">
            <b style={{ color: COLS[sub.s] }}>{NAMES[sub.s]}</b> {sub.t}
          </div>
        )}
        <button className="kc-pause" onClick={() => { setPaused(true); document.exitPointerLock?.(); }} aria-label="Duraklat">❚❚</button>
        {IS_TOUCH && hud && (
          <>
            <div className="kc-lookpad" onPointerDown={lookDown} onPointerMove={lookMove} onPointerUp={() => (lookId.current = null)} onPointerCancel={() => (lookId.current = null)} />
            <div className="kc-joy" onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); onJoy(e); }} onPointerMove={(e) => e.buttons && onJoy(e)} onPointerUp={endJoy} onPointerCancel={endJoy}>
              <i style={{ transform: `translate(${joyPos.x}px,${joyPos.y}px)` }} />
            </div>
            <div className="kc-btns">
              <button {...hold('crouch')}>Çömel</button>
              <button {...hold('run')}>Koş</button>
              <button {...hold('act')} className="a">E</button>
            </div>
          </>
        )}
        {!IS_TOUCH && hud && !paused && <div className="kc-keys">WASD yürü · fare bak · Shift koş (ses çıkarır) · C çömel · E etkileşim · Esc duraklat</div>}
        {paused && (
          <div className="kc-modal">
            <div className="kc-card">
              <h2>Duraklatıldı</h2>
              <button className="kc-btn primary" onClick={resume}>Devam et</button>
              <button className="kc-btn" onClick={toMenu}>Ana menü</button>
            </div>
          </div>
        )}
        {done && (
          <div className="kc-modal">
            <div className="kc-card">
              <small>Bölüm 1</small>
              <h2>Hücreden çıktın!</h2>
              <p>Sıradaki bölüm: Revir (yakında). Anahtar kartı orada.</p>
              <button className="kc-btn primary" onClick={toMenu}>Ana menü</button>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="kc-root menu">
      <div className="kc-menu">
        <a className="kc-back" href="/">← Oyun Salonu</a>
        <h1>Taşkale<em>Kaçış</em></h1>
        <p className="kc-lead">Elektrikler kesildi, kilitler boşta. Deniz hücresinden sessizce çıkıp gardiyana yakalanmadan kaçış yoluna ulaşmalı. Birinci şahıs gizlilik. Bölüm 1: Hücre.</p>
        <button className="kc-btn primary" onClick={() => setScreen('play')}>Başla</button>
        <small className="kc-note">Bilgisayarda en iyi çalışır (klavye + fare). Telefonda ağır olabilir. Arkadaşla oynama sonraki bölümlerle gelecek.</small>
      </div>
    </div>
  );
}
