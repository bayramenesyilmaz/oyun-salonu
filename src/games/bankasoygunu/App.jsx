import { useEffect, useRef, useState } from 'react';
import { Bank } from './Game.js';
import '../testalani/testalani.css';
import './bank.css';

const QS = new URLSearchParams(location.search);
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);

export default function App() {
  const cv = useRef(null), gm = useRef(null), stick = useRef(null), look = useRef({ id: null, x: 0, y: 0 });
  const [h, setH] = useState(null), [knob, setKnob] = useState(null), [started, setStarted] = useState(QS.has('test')), [end, setEnd] = useState(null);
  useEffect(() => {
    const g = new Bank(cv.current, { onHud: setH, onEnd: setEnd }); gm.current = g; window.__bk = g;
    const kd = {}; const upd = () => { g.in.mx = (kd.d || kd.ArrowRight ? 1 : 0) - (kd.a || kd.ArrowLeft ? 1 : 0); g.in.mz = (kd.s || kd.ArrowDown ? 1 : 0) - (kd.w || kd.ArrowUp ? 1 : 0); };
    const k1 = (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (k === ' ') { g.in.jump = true; e.preventDefault(); } else if (k === 'e') g.in.useP = true; else if (k === 'r') g.in.reload = true; else if (k === 'g') g.in.nade = true; else if (k === 'c') g.in.crouch = true; else if (k === 'q') g.in.swap = true; else if (k === '1' && g.p.w !== 0) g.setWeapon(0); else if (k === '2' && g.p.w !== 1) g.setWeapon(1); else if (k === 'f') g.in.fire = true; kd[k] = true; upd(); };
    const k2 = (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (k === ' ') g.in.jump = false; else if (k === 'r') g.in.reload = false; else if (k === 'f') g.in.fire = false; else if (k === 'c') g.in.crouch = false; kd[k] = false; upd(); };
    const mm = (e) => { if (document.pointerLockElement === cv.current) { g.p.yaw -= e.movementX * 0.0025; g.p.pitch = Math.max(-1.4, Math.min(1.4, g.p.pitch - e.movementY * 0.0025)); } };
    const md = (e) => { if (IS_TOUCH) return; if (document.pointerLockElement !== cv.current) cv.current.requestPointerLock && cv.current.requestPointerLock(); else if (e.button === 0) g.in.fire = true; };
    const mu = (e) => { if (e.button === 0) g.in.fire = false; }; const rs = () => g.resize();
    addEventListener('keydown', k1); addEventListener('keyup', k2); addEventListener('mousemove', mm); cv.current.addEventListener('mousedown', md); addEventListener('mouseup', mu); addEventListener('resize', rs);
    return () => { g.destroy(); removeEventListener('keydown', k1); removeEventListener('keyup', k2); removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); removeEventListener('resize', rs); };
  }, []);
  const onTS = (e) => { for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.45) { if (stick.current == null) { stick.current = { id: t.identifier, ox: t.clientX, oy: t.clientY }; setKnob({ x: t.clientX, y: t.clientY, dx: 0, dy: 0 }); } } else if (look.current.id == null) look.current = { id: t.identifier, x: t.clientX, y: t.clientY }; } };
  const onTM = (e) => { const g = gm.current; for (const t of e.changedTouches) { const s = stick.current; if (s && t.identifier === s.id) { let dx = t.clientX - s.ox, dy = t.clientY - s.oy; const L = Math.hypot(dx, dy), m = 50; if (L > m) { dx *= m / L; dy *= m / L; } g.in.mx = dx / m; g.in.mz = dy / m; setKnob({ x: s.ox, y: s.oy, dx, dy }); } if (t.identifier === look.current.id) { g.p.yaw -= (t.clientX - look.current.x) * 0.006; g.p.pitch = Math.max(-1.4, Math.min(1.4, g.p.pitch - (t.clientY - look.current.y) * 0.006)); look.current.x = t.clientX; look.current.y = t.clientY; } } };
  const onTE = (e) => { const g = gm.current; for (const t of e.changedTouches) { if (stick.current && t.identifier === stick.current.id) { stick.current = null; g.in.mx = 0; g.in.mz = 0; setKnob(null); } if (t.identifier === look.current.id) look.current = { id: null, x: 0, y: 0 }; } };
  const tap = (k) => ['useP', 'nade', 'reload', 'swap'].includes(k);
  const btn = (k, v) => ({ onTouchStart: (e) => { e.stopPropagation(); e.preventDefault(); gm.current.in[k] = tap(k) ? true : v; }, onTouchEnd: (e) => { e.stopPropagation(); if (!tap(k)) gm.current.in[k] = false; }, onMouseDown: () => { gm.current.in[k] = true; }, onMouseUp: () => { if (!tap(k)) gm.current.in[k] = false; } });
  const mm = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  return (
    <div className="ta bk" onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE}>
      <canvas ref={cv} />
      {h && <>
        <div className={'ta-dmg' + (h.dmg ? ' on' : '')} />{h.alarm && <div className="bk-alarm" />}
        <div className={'ta-cross' + (h.hit ? (h.head ? ' head' : ' hit') : '')} />
        <div className="ta-top"><a href="/">←</a><span>⏱ {mm(h.time)}</span><span>Kalan düşman {h.left}</span><span>İtibar {h.rep}</span></div>
        <div className="bk-obj">{h.obj.map((o, i) => <div key={i} className={o.d ? 'd' : ''}>{o.d ? '✓' : '○'} {o.t}</div>)}</div>
        <div className={'bk-eye' + (h.alertNow ? ' red' : '')}><i style={{ width: (h.alertNow ? 100 : h.aw * 100) + '%' }} /><b>{h.alertNow ? 'ALARM' : h.aw > 0.05 ? 'Fark ediliyorsun' : h.crouch ? 'Gizlisin' : 'Sessiz'}</b></div>
        <div className="ta-hp"><i style={{ width: h.hp + '%' }} /><b>{h.hp}</b></div>
        <div className="ta-ammo" style={{ top: 'auto', bottom: IS_TOUCH ? 190 : 16 }}>{h.wname} · {h.rl ? 'Dolduruyor…' : `${h.ammo} / ${h.res}`} · 💣 {h.nades}</div>
        {h.msg && <div className="ta-msg">{h.msg}</div>}{h.hint && <div className="ta-hint">{h.hint}</div>}
        {h.dead && <div className="ta-dead"><b>Yakalandın</b><button onClick={() => gm.current.respawn()}>Yeniden dene</button></div>}
        {IS_TOUCH && !h.dead && <div className="ta-btns">
          <button className="fire" {...btn('fire', true)}>ATEŞ</button><button {...btn('useP')}>KULLAN</button><button {...btn('jump', true)}>ZIPLA</button>
          <button {...btn('swap')}>SİLAH</button><button {...btn('crouch', true)}>EĞİL</button><button {...btn('reload')}>ŞARJÖR</button><button {...btn('nade')}>BOMBA</button>
        </div>}
        {knob && <div className="ta-knob" style={{ left: knob.x - 50, top: knob.y - 50 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
        {end && <div className="ta-intro"><b>Görev tamam — {end.rank}</b><p>Skor {end.score}/100 · Süre {mm(end.time)}<br />Kurtulan rehine {end.saved}/6 · Sessiz etkisiz {end.takedowns} · {end.alarm ? 'Alarm çaldı' : 'Alarm çalmadı'}<br />İtibar {end.rep} · Ölen sivil {end.civ}</p><u onClick={() => location.reload()}>Tekrar oyna</u></div>}
        {!started && <div className="ta-intro" onClick={() => setStarted(true)}><b>Banka Baskını</b><p>Gece 02:10. Şehir Merkez Bankası'nı silahlı bir grup bastı, 6 kişi rehine. Polis çevreyi sardı ama içeri girmeye cesaret edemiyor. Sen, ekibin tek ajanısın.<br /><br />Sessiz kal: susturuculu tabanca, arkadan sessiz etkisiz, eğilerek yürü. Alarm çalarsa soyguncular rehineleri vurmaya başlar.<br /><br />{IS_TOUCH ? 'Sol: yürü · Sağ: bak' : 'WASD yürü · C eğil · Q silah · E kullan · R şarjör · G bomba'}</p><u>Başla</u></div>}
      </>}
    </div>
  );
}
