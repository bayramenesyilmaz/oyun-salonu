import { useEffect, useRef, useState } from 'react';

// Mobil kontroller: sol taraf sanal joystick (yürü), sağ taraf sürükle (bak).
// Butonlar çoklu dokunmayı destekler: koşarken ateş edip nişan alabilirsin.
export default function TouchControls({ game, hud }) {
  const zone = useRef(null);
  const stick = useRef({ id: null, ox: 0, oy: 0 });
  const look = useRef({ id: null, x: 0, y: 0 });
  const [knob, setKnob] = useState(null);
  const [aim, setAim] = useState(false);
  const [crouch, setCrouch] = useState(false);
  const R = 56;

  useEffect(() => {
    const el = zone.current;
    const start = (e) => {
      for (const t of e.changedTouches) {
        const left = t.clientX < window.innerWidth * 0.42;
        if (left && stick.current.id === null) {
          stick.current = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          setKnob({ ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
        } else if (!left && look.current.id === null) look.current = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stick.current.id) {
          let dx = t.clientX - stick.current.ox, dy = t.clientY - stick.current.oy;
          const d = Math.hypot(dx, dy);
          if (d > R) {
            dx = (dx / d) * R;
            dy = (dy / d) * R;
          }
          game.setTouchMove(dx / R, dy / R);
          // joystick en üste itilirse otomatik koş
          game.holdKey('ShiftLeft', dy / R < -0.92);
          setKnob((k) => k && { ...k, dx, dy });
        } else if (t.identifier === look.current.id) {
          game.touchLook(t.clientX - look.current.x, t.clientY - look.current.y);
          look.current.x = t.clientX;
          look.current.y = t.clientY;
        }
      }
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stick.current.id) {
          stick.current.id = null;
          game.setTouchMove(0, 0);
          game.holdKey('ShiftLeft', false);
          setKnob(null);
        } else if (t.identifier === look.current.id) look.current.id = null;
      }
    };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
      game.setTouchMove(0, 0);
      game.setFire(false);
      game.setAim(false);
    };
  }, [game]);

  // Pointer olayları: dokunuşta tek kez tetiklenir. Ateş butonu basılıyken parmağı kaydırınca bakış da döner.
  const btn = (onDown, onUp, dragLook = false) => {
    let last = null;
    return {
      onPointerDown: (e) => {
        e.stopPropagation();
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yok say */ }
        last = { x: e.clientX, y: e.clientY };
        onDown && onDown();
      },
      onPointerMove: (e) => {
        if (!dragLook || !last) return;
        game.touchLook(e.clientX - last.x, e.clientY - last.y);
        last = { x: e.clientX, y: e.clientY };
      },
      onPointerUp: (e) => {
        e.stopPropagation();
        last = null;
        onUp && onUp();
      },
      onPointerCancel: () => {
        last = null;
        onUp && onUp();
      },
      onContextMenu: (e) => e.preventDefault(),
    };
  };
  const tap = (fn) => btn(fn, null);

  const toggleAim = () => {
    const n = !aim;
    setAim(n);
    game.setAim(n);
  };
  const toggleCrouch = () => {
    const n = !crouch;
    setCrouch(n);
    game.holdKey('KeyC', n);
  };

  const h = hud || {};
  const rifle = h.owned?.rifle;
  const bino = h.equipped === 'binoculars';
  return (
    <div className="touch-layer">
      <div ref={zone} className="touch-zone" />
      {knob ? (
        <div className="stick" style={{ left: knob.ox - R, top: knob.oy - R, width: R * 2, height: R * 2 }}>
          <div className="stick-knob" style={{ transform: `translate(${knob.dx}px, ${knob.dy}px)` }} />
        </div>
      ) : (
        <div className="stick ghost"><div className="stick-knob" /></div>
      )}

      <div className="tb-top">
        <button className="tbtn pill" {...tap(() => game.pressKey('Escape'))}>❚❚</button>
      </div>

      <div className="tb-right">
        {rifle && !bino && (
          <button className="tbtn fire" {...btn(() => game.setFire(true), () => game.setFire(false), true)}>ATEŞ</button>
        )}
        {rifle && (
          <button className={'tbtn aim' + (aim ? ' on' : '')} {...tap(toggleAim)}>{bino ? 'YAKINLAŞ' : 'NİŞAN'}</button>
        )}
        <button className={'tbtn act' + (h.prompt ? ' ready' : '')} {...tap(() => game.pressKey('KeyE'))}>E</button>
        {rifle && !bino && <button className="tbtn sm r" {...tap(() => game.pressKey('KeyR'))}>R</button>}
        <button className={'tbtn sm crouch' + (crouch ? ' on' : '')} {...tap(toggleCrouch)}>ÇÖMEL</button>
      </div>

      {rifle && (
        <div className="tb-row">
          <button className="tbtn pill" {...tap(() => { game.pressKey(bino ? 'Digit1' : 'Digit2'); setAim(false); game.setAim(false); })}>{bino ? 'TÜFEK' : 'DÜRBÜN'}</button>
          <button className={'tbtn pill' + (h.lamp ? ' on' : '')} {...tap(() => game.pressKey('KeyF'))}>FENER</button>
          <button className={'tbtn pill' + (h.focusActive ? ' on' : '')} {...tap(() => game.pressKey('KeyV'))}>ODAK</button>
          {h.squad && <button className="tbtn pill" {...tap(() => game.pressKey('KeyG'))}>{h.squad.order === 'follow' ? 'KEMAL: BEKLE' : 'KEMAL: GEL'}</button>}
          {h.squad && <button className="tbtn pill" {...tap(() => game.pressKey('KeyT'))}>{h.squad.free ? 'ATEŞİ KES' : 'ATEŞ SERBEST'}</button>}
        </div>
      )}
    </div>
  );
}
