import { useEffect, useRef, useState } from 'react';

// Sol yarı: sanal joystick (sonuna kadar itince koşar). Sağ yarı: kamerayı sürükle.
// Sağ altta büyük, renkli eylem butonları.
export default function TouchControls({ game, prompt }) {
  const zone = useRef(null);
  const stick = useRef({ id: null, ox: 0, oy: 0 });
  const look = useRef({ id: null, x: 0, y: 0 });
  const [knob, setKnob] = useState(null);
  const R = 58;

  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const start = (e) => {
      for (const t of e.changedTouches) {
        const left = t.clientX < window.innerWidth * 0.45;
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

  const once = (code) => ({
    onPointerDown: (e) => {
      e.stopPropagation();
      e.preventDefault();
      game.pressKey(code);
    },
    onContextMenu: (e) => e.preventDefault(),
  });

  return (
    <div className="k-touch">
      <div ref={zone} className="k-tzone" />
      {knob ? (
        <div className="k-stick" style={{ left: knob.ox - R, top: knob.oy - R, width: R * 2, height: R * 2 }}>
          <div className="k-knob" style={{ transform: `translate(${knob.dx}px, ${knob.dy}px)` }} />
        </div>
      ) : (
        <div className="k-stick ghost" style={{ left: 40, bottom: 40, width: R * 2, height: R * 2 }}>
          <div className="k-knob" />
        </div>
      )}
      <div className="k-tbtns">
        <button className="k-tb butt" {...once('KeyF')}>KAFA</button>
        <button className="k-tb jump" {...once('Space')}>ZIPLA</button>
        <button className={'k-tb grab' + (prompt ? ' ready' : '')} {...once('KeyE')}>{prompt && prompt.startsWith('Korkuluğa') ? 'GİYDİR' : prompt === 'Bırak' ? 'BIRAK' : 'AL'}</button>
        <button className="k-tb bleat" {...once('KeyQ')}>MEE</button>
      </div>
    </div>
  );
}
