import { useEffect, useRef, useState } from 'react';

// Mobil kontroller: sol yarı = sanal joystick (yürü), sağ yarı = sürükleyerek bak,
// sağ altta eylem butonları. Çoklu dokunma desteklenir.
export default function TouchControls({ game, prompt, hud }) {
  const zone = useRef(null);
  const stick = useRef({ id: null, ox: 0, oy: 0 });
  const look = useRef({ id: null, x: 0, y: 0 });
  const [knob, setKnob] = useState(null); // {ox, oy, dx, dy}
  const [crouch, setCrouch] = useState(false);
  const R = 56; // joystick yarıçapı (px)

  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const start = (e) => {
      for (const t of e.changedTouches) {
        const left = t.clientX < window.innerWidth * 0.45;
        if (left && stick.current.id === null) {
          stick.current = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          setKnob({ ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
        } else if (!left && look.current.id === null) {
          look.current = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
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
    };
  }, [game]);

  // Butonlar: dokunma olayı joystick/bakış alanına geçmesin
  // Pointer olayları dokunuşta tek kez tetiklenir (touch + taklit mouse çift basmasın)
  const tap = (fn) => ({
    onPointerDown: (e) => {
      e.stopPropagation();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yok say */ }
      fn(true);
    },
    onPointerUp: (e) => {
      e.stopPropagation();
      fn(false);
    },
    onPointerCancel: () => fn(false),
    onContextMenu: (e) => e.preventDefault(),
  });
  const once = (fn) => tap((down) => down && fn());

  const toggleCrouch = () => {
    const next = !crouch;
    setCrouch(next);
    game.holdKey('KeyC', next);
  };

  return (
    <div className="touch-layer">
      <div ref={zone} className="touch-zone" />
      {knob ? (
        <div className="stick" style={{ left: knob.ox - R, top: knob.oy - R, width: R * 2, height: R * 2 }}>
          <div className="stick-knob" style={{ transform: `translate(${knob.dx}px, ${knob.dy}px)` }} />
        </div>
      ) : (
        <div className="stick-hint">
          <div className="stick ghost"><div className="stick-knob" /></div>
        </div>
      )}

      <div className="tbtns top">
        <button className="tbtn small" {...once(() => game.pressKey('KeyJ'))}>Günlük</button>
        <button className="tbtn small" {...once(() => game.pressKey('Escape'))}>❚❚</button>
      </div>

      <div className="tbtns right">
        <button className={'tbtn act' + (prompt ? ' ready' : '')} {...once(() => game.pressKey('KeyE'))}>
          {prompt ? (hud.hidden ? 'Çık' : 'E') : 'E'}
        </button>
        <button className="tbtn" {...tap((d) => game.holdKey('ShiftLeft', d))}>Koş</button>
        <button className={'tbtn' + (crouch ? ' on' : '')} {...once(toggleCrouch)}>Çömel</button>
        <button className={'tbtn' + (hud.lantern ? ' on' : '')} {...once(() => game.pressKey('KeyF'))}>Fener</button>
      </div>
    </div>
  );
}
