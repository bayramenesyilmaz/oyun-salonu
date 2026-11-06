import { useEffect, useRef, useState } from 'react';
import OnlineLobby from '../../engine/OnlineLobby.jsx';
import { Game } from './game/Game.js';
import { CHAPTERS } from './game/levels.js';
import './hk.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
if (TEST) window.__HkClass = Game;
const IS_TOUCH = QS.has('touch') || (typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)));
const NICKS = ['Kaan', 'Tilki', 'Pars', 'Çakal', 'Şahin', 'Rüzgâr'];
const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem('hk-prefs') || '{}');
  } catch {
    return {};
  }
};
const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

function Stick({ onMove }) {
  const base = useRef(null);
  const id = useRef(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  const upd = (e) => {
    const r = base.current.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = r.width / 2, L = Math.hypot(dx, dy);
    if (L > m) {
      dx = (dx / L) * m;
      dy = (dy / L) * m;
    }
    setK({ x: dx, y: dy });
    onMove(dx / m, -dy / m);
  };
  const end = () => {
    id.current = null;
    setK({ x: 0, y: 0 });
    onMove(0, 0);
  };
  return (
    <div
      ref={base}
      className="hk-stick"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        id.current = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        upd(e);
      }}
      onPointerMove={(e) => id.current === e.pointerId && upd(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <i style={{ transform: `translate(${k.x}px, ${k.y}px)` }} />
    </div>
  );
}

export default function App() {
  const prefs = useRef(loadPrefs()).current;
  const cv = useRef(null);
  const game = useRef(null);
  const cfg = useRef(null);
  const look = useRef({});
  const [screen, setScreen] = useState('menu');
  const [nick, setNick] = useState(prefs.nick || NICKS[Math.floor(Math.random() * NICKS.length)]);
  const [chap, setChap] = useState(0);
  const [hud, setHud] = useState(null);
  const [locked, setLocked] = useState(false);
  const [page, setPage] = useState(0);
  const oda = (QS.get('oda') || '').toUpperCase();

  useEffect(() => {
    try {
      localStorage.setItem('hk-prefs', JSON.stringify({ nick }));
    } catch {}
  }, [nick]);
  useEffect(() => {
    if (oda) setScreen('onl');
  }, [oda]);
  useEffect(() => {
    const q = QS.get('quick');
    if (q == null) return;
    cfg.current = { mode: 'bot', chapter: Math.min(CHAPTERS.length - 1, Math.max(0, +q || 0)), nicks: ['Kaan'] };
    setScreen('play');
  }, []);
  useEffect(() => {
    if (screen !== 'play' || !cv.current || !cfg.current) return;
    const g = new Game(cv.current, {
      ...cfg.current,
      touch: IS_TOUCH,
      cb: { onHud: setHud, onLock: setLocked, onLeft: () => setHud((h) => (h ? { ...h, left: true } : h)), onChapter: () => setPage(0) },
    });
    game.current = g;
    if (TEST) window.__hk = g;
    return () => {
      g.dispose();
      game.current = null;
      setHud(null);
      setLocked(false);
    };
  }, [screen]);

  const solo = () => {
    cfg.current = { mode: 'bot', chapter: chap, nicks: [nick.trim() || 'Kaan'] };
    setScreen('play');
  };
  const onStart = ({ net, host, nicks }) => {
    cfg.current = { mode: 'online', net, host, nicks, chapter: chap };
    setScreen('play');
  };
  const toMenu = () => setScreen('menu');

  if (screen === 'play') {
    const g = game.current;
    const h = hud;
    const online = cfg.current?.mode === 'online';
    const lookStart = (e) => {
      look.current[e.pointerId] = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const lookMove = (e) => {
      const l = look.current[e.pointerId];
      if (!l) return;
      game.current?.look(e.clientX - l.x, e.clientY - l.y);
      l.x = e.clientX;
      l.y = e.clientY;
    };
    const lookEnd = (e) => delete look.current[e.pointerId];
    const hold = (fn) => ({
      onPointerDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        fn();
      },
    });
    return (
      <div className={'hk-root play' + (IS_TOUCH ? ' touch' : '')}>
        <canvas ref={cv} className="hk-canvas" />
        {IS_TOUCH && <div className="hk-lookzone" onPointerDown={lookStart} onPointerMove={lookMove} onPointerUp={lookEnd} onPointerCancel={lookEnd} />}
        {h && !h.waiting && (
          <>
            <button className="hk-exit" onClick={toMenu} aria-label="Çık">
              ✕
            </button>
            <div className="hk-top">
              <b>{h.title}</b>
              <span>{fmt(h.t)}</span>
            </div>
            <div className="hk-goal">{h.goal}</div>
            <div className="hk-keys">
              {h.keys.map((k) => (
                <span key={k.id} className={k.have ? 'on' : ''} style={{ '--c': k.c }}>
                  {k.name}
                </span>
              ))}
              {h.plates[1] > 0 && (
                <span className={h.plates[0] === h.plates[1] ? 'on' : ''} style={{ '--c': '#ff4d5e' }}>
                  Plaka {h.plates[0]}/{h.plates[1]}
                </span>
              )}
            </div>
            {h.guardsAlert && h.ph === 1 && <div className="hk-alert" />}
            {h.toast && <div className="hk-toast">{h.toast}</div>}
            {h.caught > 0 && (
              <div className="hk-caught">
                <h2>Yakalandın!</h2>
                <p>{Math.ceil(h.caught)} sn · {h.partner} yanına gelirse kurtulursun</p>
              </div>
            )}
            {h.partnerCaught > 0 && h.caught <= 0 && <div className="hk-pc">{h.partner} yakalandı! Yanına git ({Math.ceil(h.partnerCaught)})</div>}
            {!IS_TOUCH && !locked && h.ph === 1 && <div className="hk-hint">Tıkla · WASD yürü · Fare bak · Boşluk zıpla · E taş at (gardiyanı uzaklaştırır)</div>}
            {IS_TOUCH && h.ph === 1 && (
              <div className="hk-touch">
                <Stick onMove={(x, y) => game.current?.setMove(x, y)} />
                <div className="hk-btns">
                  <button className="st" {...hold(() => game.current?.throwBtn())}>
                    Taş at
                  </button>
                  <button className="jp" {...hold(() => game.current?.jump())}>
                    Zıpla
                  </button>
                </div>
              </div>
            )}
            {h.ph === 0 && !h.left && (
              <div className="hk-modal">
                <div className="hk-card story">
                  <small>{h.title}</small>
                  <p className="tx">{h.intro[Math.min(page, h.intro.length - 1)]}</p>
                  <div className="dots">
                    {h.intro.map((_, i) => (
                      <i key={i} className={i === page ? 'on' : ''} />
                    ))}
                  </div>
                  {page < h.intro.length - 1 ? (
                    <button className="hk-btn primary" onClick={() => setPage(page + 1)}>
                      İleri
                    </button>
                  ) : (
                    <button className="hk-btn primary" onClick={() => g?.go()}>
                      {h.host || !online ? 'Başla' : 'Başla (kurucu da başlatabilir)'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {(h.ph === 2 || h.left) && (
              <div className="hk-modal">
                <div className="hk-card story">
                  {h.left ? (
                    <>
                      <small>Oyun yarıda kaldı</small>
                      <h2>Arkadaşın ayrıldı</h2>
                    </>
                  ) : (
                    <>
                      <small>
                        {h.title} tamamlandı · {fmt(h.t)}
                      </small>
                      <div className="stars">{'★'.repeat(h.stars)}{'☆'.repeat(3 - h.stars)}</div>
                      {h.outro.map((t, i) => (
                        <p className="tx" key={i}>
                          {t}
                        </p>
                      ))}
                      {!h.last &&
                        (h.host ? (
                          <button className="hk-btn primary" onClick={() => g?.nextChapter()}>
                            Sonraki bölüm
                          </button>
                        ) : (
                          <p className="hk-wait">Kurucunun sonraki bölümü başlatması bekleniyor…</p>
                        ))}
                      {h.host && (
                        <button className="hk-btn" onClick={() => g?.restart()}>
                          Bu bölümü tekrar oyna
                        </button>
                      )}
                    </>
                  )}
                  <button className="hk-btn" onClick={toMenu}>
                    {online ? 'Odadan çık' : 'Ana menü'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {(!h || h.waiting) && (
          <div className="hk-modal">
            <div className="hk-card">
              <h2>Bölüm bekleniyor…</h2>
              <button className="hk-btn" onClick={toMenu}>
                Çık
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hk-root menu">
      <div className="hk-menu">
        <a className="hk-back" href="/">
          ← Oyun Salonu
        </a>
        <h1>
          Hapisten <em>Kaçış</em>
        </h1>
        {screen === 'onl' ? (
          <OnlineLobby game="hkacis" path="/hkacis" nick={nick.trim() || 'Oyuncu'} initialCode={oda} onStart={onStart} onBack={() => setScreen('menu')} />
        ) : (
          <>
            <p className="hk-lead">Gece yarısı, Taşkale Hapishanesi. İki mahkûm, tek plan: birlikte çıkmak. Gardiyanları atlat, anahtarları bul, plakalara aynı anda bas.</p>
            <label className="hk-field">
              Takma adın
              <input value={nick} maxLength={12} onChange={(e) => setNick(e.target.value)} />
            </label>
            <div className="hk-chaps">
              {CHAPTERS.map((c, i) => (
                <button key={c.id} className={'hk-chap' + (chap === i ? ' on' : '')} onClick={() => setChap(i)}>
                  <b>{c.title}</b>
                  <small>{c.goal}</small>
                </button>
              ))}
            </div>
            <div className="hk-actions">
              <button className="hk-btn primary" onClick={solo}>
                Tek başına (bot arkadaşla)
              </button>
              <button className="hk-btn" onClick={() => setScreen('onl')}>
                Online · arkadaşınla
              </button>
            </div>
            <p className="hk-note">En çok keyif iki gerçek kişiyle. Bölümü oda kuran seçer. Bölüm 3 ve sonrası yakında.</p>
          </>
        )}
      </div>
    </div>
  );
}
