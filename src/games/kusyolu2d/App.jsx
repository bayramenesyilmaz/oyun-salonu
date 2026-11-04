import { useEffect, useRef, useState } from 'react';
import { Game } from './game/engine.js';
import { CHAPTERS2D } from './game/story.js';
import './k2d.css';

const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  if (/[?&]touch\b/.test(location.search)) return true;
  if (/[?&]mouse\b/.test(location.search)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();
const TEST = /[?&]test\b/.test(typeof location !== 'undefined' ? location.search : '');
const SCENE_NAMES = { roof: 'Çatı', stairs: 'Apartman', street: 'Sokak', arsa: 'Arsa', gece: 'Kaçış', depo: 'Depo', hurdalik: 'Hurdalık', cati2: 'Kaan’ın çatısı', kokpit: 'Kokpit', kalkis: 'Kalkış', bosluk: 'Boşluk', inis: 'İniş', ay: 'Ay' };

const DONE_TEXT = {
  1: 'Kor artık depoda, güvende. Kimse görmedi… sanırım.',
  2: 'Leylek hazır. Herkes yerinde, kemerler bağlı.',
  3: 'Ay’dasınız ve önünüzde bir Kapı var. Kapıların ardındaki gezegenler sıradaki bölümlerde.',
};

export default function App() {
  const cv = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [sub, setSub] = useState(null);
  const [obj, setObj] = useState('');
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(null);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('kusyolu2d-mute') === '1';
    } catch {
      return false;
    }
  });
  const [save, setSave] = useState(() => Game.loadSave());
  const [choice, setChoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [card, setCard] = useState(null);

  useEffect(() => {
    const g = (game.current = new Game(
      cv.current,
      {
        sub: setSub,
        objective: setObj,
        choice: setChoice,
        card: setCard,
        msg: (m) => {
          setToast({ ...m, k: Math.random() });
          clearTimeout(window.__k2toast);
          window.__k2toast = setTimeout(() => setToast(null), 5200);
        },
        onPause: () => setPaused((p) => !p),
        chapterEnd: (n) => {
          setDone(n);
          setSave(Game.loadSave());
        },
      },
      { test: TEST },
    ));
    g.isTouch = IS_TOUCH;
    return () => g.dispose();
  }, []);

  useEffect(() => {
    const g = game.current;
    if (!g) return;
    g.paused = paused || phase !== 'play';
    if (g.bank && g.bank.ready) g.voiceOn = !muted;
    g.sfx.setMuted(muted);
    try {
      localStorage.setItem('kusyolu2d-mute', muted ? '1' : '0');
    } catch {}
  }, [paused, phase, muted]);

  const start = (scene, flags) => {
    const g = game.current;
    g.sfx.unlock();
    setDone(null);
    setPaused(false);
    setPhase('play');
    g.paused = false;
    g.startAt(scene, flags);
  };

  const toMenu = () => {
    const g = game.current;
    g.sfx.stopLoops();
    g.paused = true;
    setPaused(false);
    setPhase('menu');
    setSub(null);
    setObj('');
    setSave(Game.loadSave());
  };

  const hold = (k) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      game.current.touch[k] = true;
    },
    onPointerUp: () => (game.current.touch[k] = false),
    onPointerCancel: () => (game.current.touch[k] = false),
    onLostPointerCapture: () => (game.current.touch[k] = false),
  });

  const canContinue = save && save.scene;

  return (
    <div className={'k2-root' + (IS_TOUCH ? ' touch' : '')}>
      <canvas
        ref={cv}
        className="k2-canvas"
        onPointerDown={() => {
          if (phase === 'play' && !paused) game.current.act();
        }}
      />

      {phase === 'play' && !done && (
        <>
          {obj && (
            <div className="k2-obj">
              <span>Görev</span>
              {obj}
            </div>
          )}
          <button className="k2-pausebtn" onClick={() => setPaused(true)} aria-label="Duraklat">
            ❚❚
          </button>
          {sub && (
            <div className="k2-sub">
              {sub.name && <b style={{ color: sub.color }}>{sub.name}</b>}
              <span>{sub.text}</span>
            </div>
          )}
          {toast && (
            <div className="k2-toast" key={toast.k}>
              <b>{toast.from}</b>
              {toast.t}
            </div>
          )}
          {choice && (
            <div className="k2-choice">
              <p>{choice.prompt}</p>
              {choice.options.map((o) => (
                <button key={o.id} className="k2-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => choice.pick(o.id)}>
                  {o.text}
                </button>
              ))}
            </div>
          )}
          {IS_TOUCH && (
            <div className="k2-touch">
              <div className="k2-dpad">
                <button {...hold('left')} aria-label="Sol">
                  ◀
                </button>
                <button {...hold('right')} aria-label="Sağ">
                  ▶
                </button>
              </div>
              <div className="k2-vpad">
                <button {...hold('up')} aria-label="Yukarı">
                  ▲
                </button>
                <button {...hold('down')} aria-label="Aşağı">
                  ▼
                </button>
              </div>
              <button
                className="k2-act"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  game.current.touch.act = true;
                  game.current.act();
                }}
                onPointerUp={() => (game.current.touch.act = false)}
                onPointerCancel={() => (game.current.touch.act = false)}
                onPointerLeave={() => (game.current.touch.act = false)}
              >
                ●
              </button>
            </div>
          )}
          {!IS_TOUCH && <div className="k2-keys">A / D yürü · W / S yukarı, eğil · E konuş, kullan · Esc duraklat</div>}
        </>
      )}

      {card && (
        <div className="k2-timecard">
          <h2>{card.title}</h2>
          {card.sub && <p>{card.sub}</p>}
        </div>
      )}
      {paused && phase === 'play' && (
        <div className="k2-modal">
          <div className="k2-card">
            <h2>Duraklatıldı</h2>
            <button className="k2-btn primary" onClick={() => setPaused(false)}>
              Devam et
            </button>
            <button className="k2-btn" onClick={() => setMuted((m) => !m)}>
              Ses: {muted ? 'kapalı' : 'açık'}
            </button>
            <button className="k2-btn" onClick={toMenu}>
              Ana menü
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="k2-modal">
          <div className="k2-card">
            <small>Bölüm {done} tamamlandı</small>
            <h2>{CHAPTERS2D[done - 1].title}</h2>
            <p>{DONE_TEXT[done]}</p>
            {CHAPTERS2D[done] && CHAPTERS2D[done].ready ? (
              <button className="k2-btn primary" onClick={() => start(CHAPTERS2D[done].start)}>
                Sonraki bölüm: {CHAPTERS2D[done].title}
              </button>
            ) : (
              <p>
                <b>{CHAPTERS2D[done] ? CHAPTERS2D[done].title : ''}</b> yakında geliyor.
              </p>
            )}
            <button className="k2-btn" onClick={toMenu}>
              Ana menü
            </button>
          </div>
        </div>
      )}

      {phase === 'menu' && (
        <div className="k2-menu">
          <div className="k2-menu-in">
            <a className="k2-back" href="/">
              ← Oyun Salonu
            </a>
            <h1>
              Kuşyolu <em>2B</em>
            </h1>
            <p className="k2-lead">Beş arkadaş, bir göktaşı ve hurdadan bir uzay aracı. Hikâyenin tamamı, yandan bakışlı çizgi film olarak.</p>
            <div className="k2-actions">
              {canContinue && (
                <button className="k2-btn primary" onClick={() => start(save.scene, save.flags)}>
                  Devam et · {SCENE_NAMES[save.scene] || ''}
                </button>
              )}
              <button className={'k2-btn' + (canContinue ? '' : ' primary')} onClick={() => start('roof', {})}>
                {canContinue ? 'Baştan başla' : 'Başla'}
              </button>
            </div>
            <div className="k2-chapters">
              {CHAPTERS2D.map((c) => (
                <button key={c.id} className={'k2-ch' + (c.ready ? '' : ' locked')} disabled={!c.ready} onClick={() => c.ready && start(c.start)}>
                  <b>{c.id}</b>
                  <span>
                    {c.title}
                    <small>{c.ready ? c.place : 'Yakında · ' + c.place}</small>
                  </span>
                </button>
              ))}
            </div>
            <p className="k2-note">
              {IS_TOUCH ? 'Telefonu yan çevir. ◀ ▶ ile yürü, ● ile konuş ve kullan.' : 'A / D ya da oklarla yürü, E ile konuş ve kullan.'}
            </p>
          </div>
        </div>
      )}
      <div className="k2-rotate">Daha rahat oynamak için telefonu yan çevir.</div>
    </div>
  );
}
