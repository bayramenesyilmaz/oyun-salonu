import { useEffect, useRef, useState } from 'react';
import { World } from './Game.js';
import './testalani.css';

const QS = new URLSearchParams(location.search);
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);

export default function App() {
  const cv = useRef(null), gm = useRef(null), stick = useRef(null);
  const [h, setH] = useState(null);
  const [knob, setKnob] = useState(null);
  const [started, setStarted] = useState(QS.has('test'));

  useEffect(() => {
    const g = new World(cv.current, { onHud: setH, onDead: () => {} }); gm.current = g; window.__ta = g;
    const kd = {}; const upd = () => { g.in.mx = (kd.d || kd.ArrowRight ? 1 : 0) - (kd.a || kd.ArrowLeft ? 1 : 0); g.in.mz = (kd.s || kd.ArrowDown ? 1 : 0) - (kd.w || kd.ArrowUp ? 1 : 0); };
    const k1 = (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (k === ' ') { g.in.jump = true; e.preventDefault(); } else if (k === 'e') g.in.useP = true; else if (k === 'r') g.in.reload = true; else if (k === 'g') g.in.nade = true; else if (k === 'c') g.in.crouch = true; else if (k === 'q') g.in.swap = true; else if (k === '1' && g.p.w !== 0) g.setWeapon(0); else if (k === '2' && g.p.w !== 1) g.setWeapon(1); else if (k === 'f') g.in.fire = true; kd[k] = true; upd(); };
    const k2 = (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (k === ' ') g.in.jump = false; else if (k === 'r') g.in.reload = false; else if (k === 'f') g.in.fire = false; else if (k === 'c') g.in.crouch = false; kd[k] = false; upd(); };
    const mm = (e) => { if (document.pointerLockElement === cv.current) { g.p.yaw -= e.movementX * 0.0025; g.p.pitch = Math.max(-1.4, Math.min(1.4, g.p.pitch - e.movementY * 0.0025)); } };
    const md = (e) => { if (IS_TOUCH) return; if (document.pointerLockElement !== cv.current) cv.current.requestPointerLock && cv.current.requestPointerLock(); else if (e.button === 0) g.in.fire = true; };
    const mu = (e) => { if (e.button === 0) g.in.fire = false; };
    const rs = () => g.resize();
    addEventListener('keydown', k1); addEventListener('keyup', k2); addEventListener('mousemove', mm); cv.current.addEventListener('mousedown', md); addEventListener('mouseup', mu); addEventListener('resize', rs);
    return () => { g.destroy(); removeEventListener('keydown', k1); removeEventListener('keyup', k2); removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); removeEventListener('resize', rs); };
  }, []);

  // dokunmatik: sol yarı joystick, sağ yarı bakış
  const look = useRef({ id: null, x: 0, y: 0 });
  const onTS = (e) => { const g = gm.current; for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.45) { if (stick.current == null) { stick.current = { id: t.identifier, ox: t.clientX, oy: t.clientY }; setKnob({ x: t.clientX, y: t.clientY, dx: 0, dy: 0 }); } } else if (look.current.id == null) look.current = { id: t.identifier, x: t.clientX, y: t.clientY }; } };
  const onTM = (e) => { const g = gm.current; for (const t of e.changedTouches) { const s = stick.current; if (s && t.identifier === s.id) { let dx = t.clientX - s.ox, dy = t.clientY - s.oy; const L = Math.hypot(dx, dy), m = 50; if (L > m) { dx *= m / L; dy *= m / L; } g.in.mx = dx / m; g.in.mz = dy / m; setKnob({ x: s.ox, y: s.oy, dx, dy }); } if (t.identifier === look.current.id) { g.p.yaw -= (t.clientX - look.current.x) * 0.006; g.p.pitch = Math.max(-1.4, Math.min(1.4, g.p.pitch - (t.clientY - look.current.y) * 0.006)); look.current.x = t.clientX; look.current.y = t.clientY; } } };
  const onTE = (e) => { const g = gm.current; for (const t of e.changedTouches) { if (stick.current && t.identifier === stick.current.id) { stick.current = null; g.in.mx = 0; g.in.mz = 0; setKnob(null); } if (t.identifier === look.current.id) look.current = { id: null, x: 0, y: 0 }; } };
  const btn = (k, v) => ({ onTouchStart: (e) => { e.stopPropagation(); e.preventDefault(); if (k === 'useP' || k === 'nade' || k === 'reload' || k === 'swap') gm.current.in[k] = true; else gm.current.in[k] = v; }, onTouchEnd: (e) => { e.stopPropagation(); if (k !== 'useP' && k !== 'nade' && k !== 'swap') gm.current.in[k] = false; }, onMouseDown: () => { gm.current.in[k] = true; }, onMouseUp: () => { if (k !== 'useP' && k !== 'nade') gm.current.in[k] = false; } });

  return (
    <div className="ta" onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE}>
      <canvas ref={cv} />
      {h && <>
        <div className={'ta-dmg' + (h.dmg ? ' on' : '')} />
        <div className={'ta-cross' + (h.hit ? (h.head ? ' head' : ' hit') : '')} />
        <div className="ta-top"><a href="/">←</a><span>Öldürme {h.kills}</span><span>İtibar {h.rep}</span></div>
        <div className="ta-hp"><i style={{ width: h.hp + '%' }} /><b>{h.hp}</b></div>
        {h.car != null ? <div className="ta-ammo">🚗 {h.speed} km/sa · hasar {100 - h.car}%</div> : <div className="ta-ammo">{h.wname} · {h.rl ? 'Dolduruyor…' : `${h.ammo} / ${h.res}`} · 💣 {h.nades}</div>}
        {h.msg && <div className="ta-msg">{h.msg}</div>}
        {h.hint && <div className="ta-hint">{h.hint}</div>}
        {h.cave && <div className="ta-cave">Mağara</div>}
        {h.dead && <div className="ta-dead"><b>Öldün</b><button onClick={() => { gm.current.respawn(); }}>Yeniden başla</button></div>}
        {IS_TOUCH && !h.dead && <div className="ta-btns">
          <button className="fire" {...btn('fire', true)}>ATEŞ</button>
          <button {...btn('useP')}>KULLAN</button>
          <button {...btn('jump', true)}>ZIPLA</button>
          <button {...btn('nade')}>BOMBA</button>
          <button {...btn('reload')}>ŞARJÖR</button>
          <button {...btn('swap')}>SİLAH</button>
          <button {...btn('crouch', true)}>EĞİL</button>
        </div>}
        {knob && <div className="ta-knob" style={{ left: knob.x - 50, top: knob.y - 50 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
        {!started && <div className="ta-intro" onClick={() => setStarted(true)}><b>Test Alanı</b><p>Bina, mağara, orman, araç, vahşi hayvanlar, patlayan fıçılar.<br />{IS_TOUCH ? 'Sol: yürü · Sağ: bak' : 'WASD yürü · tıkla: fare kilidi · sol tık/F ateş · E kullan · G bomba · R şarjör'}</p><u>Başla</u></div>}
      </>}
    </div>
  );
}
