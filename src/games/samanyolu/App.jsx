import { useEffect, useRef, useState } from 'react';
import { Voyage } from './game/Game.js';
import * as S from '../bulutyaris/game/sfx.js';
import './kusyolu.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const readPrefs = () => { try { return JSON.parse(localStorage.getItem('sy-prefs') || '{}'); } catch { return {}; } };

export default function App() {
  const cv = useRef(null), game = useRef(null);
  const prefs = readPrefs();
  const [screen, setScreen] = useState('menu');
  const [nick, setNick] = useState(prefs.nick || '');
  const [sound, setSound] = useState(prefs.sound !== false);
  const [h, setH] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [choice, setChoice] = useState(null);
  const [end, setEnd] = useState(null);
  const [how, setHow] = useState(false);
  const [save, setSave] = useState(Voyage.loadSave());
  const stick = useRef({ id: null, ox: 0, oy: 0 });
  const [knob, setKnob] = useState(null);
  const drag = useRef(null);

  useEffect(() => { try { localStorage.setItem('sy-prefs', JSON.stringify({ nick, sound })); } catch { /* yok say */ } S.setSound(sound); }, [nick, sound]);
  useEffect(() => {
    const g = new Voyage(cv.current, { touch: matchMedia('(pointer: coarse)').matches || QS.has('touch'), onHud: setH, onDialog: setDlg, onChoice: setChoice, onEnd: (fin, st) => { if (fin) { setEnd(st); setScreen('end'); } } });
    game.current = g;
    if (TEST) window.__sy = g;
    return () => g.dispose();
  }, []);
  const begin = (cont) => { setEnd(null); setH(null); setScreen('play'); game.current.start({ name: nick || (save?.name ?? ''), from: cont && save ? save.idx : 0 }); if (cont && save) { const g = game.current; g.frags = save.frags || 0; g.dust = save.dust || 0; g.tabs = save.tabs || 0; } };
  useEffect(() => { if (QS.has('quick')) setTimeout(() => begin(false), 300); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    const k = { l: 0, r: 0, u: 0, d: 0 };
    const upd = () => { const g = game.current; if (!g) return; g.setMove(k.r - k.l, k.u - k.d); g.keyX = k.r - k.l; g.keyY = k.u - k.d; };
    const key = (down) => (e) => {
      const g = game.current; if (!g) return; const c = e.key.toLowerCase();
      if (c === 'arrowleft' || c === 'a') k.l = down ? 1 : 0; else if (c === 'arrowright' || c === 'd') k.r = down ? 1 : 0;
      else if (c === 'arrowup' || c === 'w') k.u = down ? 1 : 0; else if (c === 'arrowdown' || c === 's') k.d = down ? 1 : 0;
      else if (c === ' ') { g.keyFire = down; if (down) { g.tap(); g.act(); } e.preventDefault(); } else if (c === 'enter' && down) { g.tap(); g.act(); }
      upd();
    };
    const d = key(true), u = key(false); addEventListener('keydown', d); addEventListener('keyup', u);
    return () => { removeEventListener('keydown', d); removeEventListener('keyup', u); };
  }, []);

  const R = 52;
  const sd = (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); stick.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }); };
  const sm = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy); if (m > R) { dx = dx / m * R; dy = dy / m * R; } game.current?.setMove(dx / R, -dy / R); setKnob({ x: s.ox, y: s.oy, dx, dy }); };
  const su = (e) => { if (stick.current.id === e.pointerId) { stick.current.id = null; game.current?.setMove(0, 0); setKnob(null); } };
  const dd = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
  const dm = (e) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; game.current?.steer(e.clientX - d.x, e.clientY - d.y); d.x = e.clientX; d.y = e.clientY; };
  const du = (e) => { if (drag.current?.id === e.pointerId) drag.current = null; };
  const fire = (v) => (e) => { e.preventDefault(); if (game.current) game.current.input.fire = v; };

  const cock = h?.mode === 'cockpit', walk = h?.mode === 'walk';
  const playing = screen === 'play' && h;
  return (
    <div className="ky">
      <canvas ref={cv} className="ky-cv" />
      <div className="ky-rot">Telefonu yan çevir ↻</div>
      {playing && (
        <>
          <div className="ky-hud">
            <div className="ky-top">
              {h.obj && <div className="ky-obj">{h.obj}</div>}
              <div className="ky-pills"><span>◆ {h.frags}/4</span><span>✦ {h.dust}</span></div>
            </div>
            {cock && <div className="ky-bars"><div className="ky-bar"><i style={{ width: `${(h.prog || 0) * 100}%` }} /></div><div className="ky-hull">{[0, 1, 2, 3, 4].map((i) => <b key={i} className={i < h.hull ? 'on' : ''} />)}</div></div>}
            {h.radio && <div className="ky-radio"><small>{h.radio.who}</small>{h.radio.text}</div>}
            {h.big && <div className="ky-big" key={h.big}>{h.big}</div>}
            {h.title && <div className="ky-title"><b>{h.title.big}</b><small>{h.title.sub}</small></div>}
            {h.hint && <div className="ky-hint">Ekranı sürükle: yönlendir · ATEŞ: kayaları kır</div>}
          </div>
          {cock && (
            <>
              <div className="ky-zone" onPointerDown={dd} onPointerMove={dm} onPointerUp={du} onPointerCancel={du} />
              <button className="ky-fire" onPointerDown={fire(true)} onPointerUp={fire(false)} onPointerLeave={fire(false)} onPointerCancel={fire(false)}>ATEŞ</button>
            </>
          )}
          {walk && !h.locked && (
            <>
              <div className="ky-zone stick" onPointerDown={sd} onPointerMove={sm} onPointerUp={su} onPointerCancel={su} />
              {knob && <div className="ky-knob" style={{ left: knob.x - 52, top: knob.y - 52 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
              {h.near && <button className="ky-use" onPointerDown={(e) => { e.preventDefault(); game.current?.act(); }}>{h.near}</button>}
            </>
          )}
          {dlg && (
            <div className="ky-dlg" onPointerDown={() => game.current?.tap()}>
              {dlg.who && <b>{dlg.who}</b>}<p className={dlg.who ? '' : 'nar'}>{dlg.text}</p><small>{dlg.i + 1 < dlg.n ? 'devam ▸' : 'tamam ▸'}</small>
            </div>
          )}
          {choice && (
            <div className="ky-choice"><p>{choice.q}</p>{choice.opts.map((o, i) => <button key={i} onClick={() => game.current?.pick(i)}>{o}</button>)}</div>
          )}
          <div className="ky-flash" style={{ opacity: h.flash }} />
          <div className="ky-fade" style={{ opacity: h.fade, background: h.fadeColor }} />
          {cock && h.hull < 5 && <div className="ky-red" />}
        </>
      )}
      {screen === 'menu' && (
        <div className="ky-menu">
          <div className="ky-logo"><small>HİKAYE · KEŞİF</small><b>SAMANYOLU</b><i>Kayıp Işık</i></div>
          <p className="ky-sub">Ailene veda et, Pırıl gemisiyle uzaya çık, asteroit kuşağını aş, buzdan gölgeye dört gezegende uzaylılarla tanış ve Samanyolu'nun ışığını geri getir. Yaklaşık 15–20 dakika, tek kişilik.</p>
          <label className="ky-name">Adın <input maxLength={12} value={nick} placeholder="Pilot" onChange={(e) => setNick(e.target.value)} /></label>
          <button className="ky-go" onClick={() => begin(false)}>YENİ YOLCULUK</button>
          {save && save.idx > 0 && <button className="ky-go alt" onClick={() => begin(true)}>DEVAM ET</button>}
          <div className="ky-row"><button onClick={() => setHow(true)}>Nasıl oynanır</button><button onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
      {how && (
        <div className="ky-modal" onClick={() => setHow(false)}><div className="ky-card" onClick={(e) => e.stopPropagation()}>
          <h3>Nasıl oynanır</h3>
          <ul>
            <li>Yürürken sol başparmakla hareket et. Beliren düğmeyle konuş, oku, gemiye bin.</li>
            <li>Kokpitte ekranı sürükleyerek gemiyi yönlendir, ATEŞ ile kayaları kır. Kalkan biterse gemi kendini onarır.</li>
            <li>Parlayan kristalleri topla, uzaylılarla konuş, yazıtları oku, yıldız tozlarını bul.</li>
            <li>İlerlemen her gezegende otomatik kaydedilir. Telefonu yatay tut.</li>
          </ul>
          <button className="ky-go small" onClick={() => setHow(false)}>Tamam</button>
        </div></div>
      )}
      {screen === 'end' && end && (
        <div className="ky-menu end">
          <div className="ky-logo"><small>YOLCULUK BİTTİ</small><b>SAMANYOLU YANDI</b></div>
          <p className="ky-sub">Yıldız parçası {end.frags}/4 · Yıldız tozu {end.dust}/24 · Yazıt {end.tabs}/8</p>
          <button className="ky-go" onClick={() => { Voyage.clearSave(); setSave(null); begin(false); }}>TEKRAR OYNA</button>
          <div className="ky-row"><button onClick={() => { game.current.quit(); setSave(Voyage.loadSave()); setScreen('menu'); }}>Menü</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
    </div>
  );
}
