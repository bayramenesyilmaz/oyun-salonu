import { useEffect, useRef, useState } from 'react';
import OnlineLobby from '../../engine/OnlineLobby.jsx';
import { Game, TEAM } from './game/Game.js';
import { MAPS } from './game/maps.js';
import './boya.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
if (TEST) window.__BsClass = Game;
const IS_TOUCH = QS.has('touch') || (typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)));
const NICKS = ['Tilki', 'Pars', 'Çakal', 'Şahin', 'Kaplan', 'Rüzgâr', 'Fındık', 'Zıpzıp'];
const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem('by-prefs') || '{}');
  } catch {
    return {};
  }
};
const fmt = (t) => {
  const s = Math.max(0, Math.ceil(t));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

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
      className="by-stick"
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
  const [mapIdx, setMapIdx] = useState(Number.isInteger(prefs.map) && MAPS[prefs.map] ? prefs.map : 0);
  const [hud, setHud] = useState(null);
  const [locked, setLocked] = useState(false);
  const oda = (QS.get('oda') || '').toUpperCase();

  useEffect(() => {
    try {
      localStorage.setItem('by-prefs', JSON.stringify({ nick, map: mapIdx }));
    } catch {}
  }, [nick, mapIdx]);
  useEffect(() => {
    if (oda) setScreen('onl');
  }, [oda]);
  useEffect(() => {
    const q = QS.get('quick');
    if (q == null) return;
    cfg.current = { mode: 'bot', map: Math.min(2, Math.max(0, +q || 0)), nicks: ['Sen'] };
    setScreen('play');
  }, []);
  useEffect(() => {
    if (screen !== 'play' || !cv.current || !cfg.current) return;
    const g = new Game(cv.current, {
      ...cfg.current,
      touch: IS_TOUCH,
      cb: { onHud: setHud, onLock: setLocked, onLeft: () => setHud((h) => (h ? { ...h, left: true } : h)) },
    });
    game.current = g;
    if (TEST) window.__bs = g;
    return () => {
      g.dispose();
      game.current = null;
      setHud(null);
      setLocked(false);
    };
  }, [screen]);

  const start = (online) => {
    if (online) return setScreen('onl');
    cfg.current = { mode: 'bot', map: mapIdx, nicks: [nick.trim() || 'Sen'] };
    setScreen('play');
  };
  const onStart = ({ net, host, nicks }) => {
    cfg.current = { mode: 'online', net, host, nicks, map: host ? mapIdx : null };
    setScreen('play');
  };
  const toMenu = () => setScreen('menu');

  if (screen === 'play') {
    const g = game.current;
    const online = cfg.current?.mode === 'online';
    const h = hud;
    const sorted = h ? [...h.ps].sort((a, b) => b.s - a.s) : [];
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
        fn(true);
      },
      onPointerUp: () => fn(false),
      onPointerCancel: () => fn(false),
      onLostPointerCapture: () => fn(false),
    });
    return (
      <div className={'by-root play' + (IS_TOUCH ? ' touch' : '')}>
        <canvas ref={cv} className="by-canvas" />
        {IS_TOUCH && <div className="by-lookzone" onPointerDown={lookStart} onPointerMove={lookMove} onPointerUp={lookEnd} onPointerCancel={lookEnd} />}
        {h && !h.waiting && (
          <>
            <div className="by-top">
              <span className="by-sc red">{h.sc[0]}</span>
              <span className="by-time">{h.ph === 0 ? 'Hazır' : fmt(h.t)}</span>
              <span className="by-sc blue">{h.sc[1]}</span>
            </div>
            <div className="by-feed">
              {h.feed.map((f, i) => (
                <div key={i + f.at}>
                  <b style={{ color: TEAM[f.ta].css }}>{f.a}</b> boyadı <b style={{ color: TEAM[f.tb].css }}>{f.b}</b>
                </div>
              ))}
            </div>
            <div className="by-board">
              {sorted.map((p, i) => (
                <div key={i} className={p.me ? 'me' : ''}>
                  <span style={{ color: TEAM[p.team].css }}>{p.n}</span>
                  <b>{p.s}</b>
                </div>
              ))}
            </div>
            <div className="by-cross" />
            {h.hits > 0 && <div key={h.hits} className="by-hitm" />}
            <div className="by-team" style={{ background: TEAM[h.team].css }}>
              {TEAM[h.team].name} takım
            </div>
            <div className="by-ammo">
              {h.reload >= 0 ? <span className="rl">Dolduruluyor…</span> : <><b>{h.ammo}</b> / {h.mag}</>}
              <div className="bar">
                <i style={{ width: (h.reload >= 0 ? h.reload : h.ammo / h.mag) * 100 + '%' }} />
              </div>
            </div>
            {h.out > 0 && h.ph === 1 && (
              <div className="by-out">
                <h2>Boyandın!</h2>
                <p>{Math.ceil(h.out)} sn sonra geri döneceksin</p>
              </div>
            )}
            {h.ph === 0 && <div className="by-count">{h.t > 0.9 ? Math.ceil(h.t - 0.5) : 'Başla!'}</div>}
            {!IS_TOUCH && !locked && h.ph !== 2 && <div className="by-hint">Oynamak için ekrana tıkla · WASD yürü · Boşluk zıpla · R doldur · Esc duraklat</div>}
            {IS_TOUCH && h.ph !== 2 && (
              <div className="by-touch">
                <Stick onMove={(x, y) => game.current?.setMove(x, y)} />
                <div className="by-btns">
                  <button className="rl" {...hold((v) => v && game.current?.doReload())}>R</button>
                  <button className="jp" {...hold((v) => v && game.current?.jump())}>Zıpla</button>
                  <button className="fr" {...hold((v) => game.current?.setFire(v))}>Ateş</button>
                </div>
              </div>
            )}
            <button className="by-exit" onClick={toMenu} aria-label="Çık">
              ✕
            </button>
            {(h.ph === 2 || h.left) && (
              <div className="by-modal">
                <div className="by-card">
                  {h.left ? (
                    <>
                      <small>Maç yarıda kaldı</small>
                      <h2>Arkadaşın ayrıldı</h2>
                    </>
                  ) : (
                    <>
                      <small>Süre bitti · {h.sc[0]} - {h.sc[1]}</small>
                      <h2 style={{ color: h.winner < 0 ? '#fff' : TEAM[h.winner].css }}>{h.winner < 0 ? 'Berabere!' : TEAM[h.winner].name + ' takım kazandı!'}</h2>
                      <div className="by-final">
                        {sorted.map((p, i) => (
                          <div key={i} className={p.me ? 'me' : ''}>
                            <span style={{ color: TEAM[p.team].css }}>{p.n}</span>
                            <b>{p.s}</b>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {!h.left && (h.host ? (
                    <button className="by-btn primary" onClick={() => g?.rematch()}>
                      Tekrar oyna
                    </button>
                  ) : (
                    <p className="by-wait">Kurucunun yeni maçı başlatması bekleniyor…</p>
                  ))}
                  <button className="by-btn" onClick={toMenu}>
                    {online ? 'Odadan çık' : 'Ana menü'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {(!h || h.waiting) && <div className="by-modal"><div className="by-card"><h2>Harita bekleniyor…</h2><button className="by-btn" onClick={toMenu}>Çık</button></div></div>}
      </div>
    );
  }

  return (
    <div className="by-root menu">
      <div className="by-menu">
        <a className="by-back" href="/">
          ← Oyun Salonu
        </a>
        <h1>
          Boya <em>Savaşı</em>
        </h1>
        {screen === 'onl' ? (
          <OnlineLobby game="boya" path="/boya" nick={nick.trim() || 'Oyuncu'} initialCode={oda} onStart={onStart} onBack={() => setScreen('menu')} />
        ) : (
          <>
            <p className="by-lead">Kırmızı ve mavi takım, 2'ye 2. Her boya isabeti takımına 1 puan. 2,5 dakika sonra en çok puanlı takım kazanır.</p>
            <label className="by-field">
              Takma adın
              <input value={nick} maxLength={12} onChange={(e) => setNick(e.target.value)} />
            </label>
            <div className="by-maps">
              {MAPS.map((m, i) => (
                <button key={m.id} className={'by-map' + (mapIdx === i ? ' on' : '')} style={{ '--sky': m.sky, '--gr': m.g1 }} onClick={() => setMapIdx(i)}>
                  <span className="pv" />
                  <b>{m.name}</b>
                  <small>{m.desc}</small>
                </button>
              ))}
            </div>
            <div className="by-actions">
              <button className="by-btn primary" onClick={() => start(false)}>
                Bota karşı
              </button>
              <button className="by-btn" onClick={() => start(true)}>
                Online · arkadaşınla
              </button>
            </div>
            <p className="by-note">Online'da iki kişi oynar, kalan iki oyuncu bot olur. Haritayı oda kuran seçer.</p>
          </>
        )}
      </div>
    </div>
  );
}
