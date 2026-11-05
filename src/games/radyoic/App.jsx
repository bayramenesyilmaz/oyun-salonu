import { useEffect, useRef, useState } from 'react';
import { drawPortrait } from '../../characters/rig.js';
import OnlineLobby from '../../engine/OnlineLobby.jsx';
import { Game } from './game/game.js';
import '../hirsiz/hs.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)));
const NICKS = ['Gölge', 'Tilki', 'Kedi', 'Pars', 'Baykuş', 'Sincap'];

function Portrait({ id }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    drawPortrait(c, id, 0.3, cv.width / 2, cv.height - 10, 0.62);
  }, [id]);
  return <canvas ref={ref} width={90} height={100} />;
}

export default function App() {
  const cv = useRef(null);
  const game = useRef(null);
  const cfg = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [role, setRole] = useState('arda');
  const [nick, setNick] = useState(() => NICKS[Math.floor(Math.random() * NICKS.length)]);
  const [phase, setPhase] = useState(null);
  const [paused, setPaused] = useState(false);
  const oda = (QS.get('oda') || '').toUpperCase();

  useEffect(() => {
    if (oda) setScreen('onl');
  }, [oda]);

  // test girişi: ?test&quick=arda&manual
  useEffect(() => {
    const q = QS.get('quick');
    if (!q) return;
    cfg.current = { mode: 'solo', role: q, manual: QS.has('manual') };
    setScreen('play');
  }, []);

  useEffect(() => {
    if (screen !== 'play' || !cv.current || !cfg.current) return;
    const g = new Game(cv.current, { ...cfg.current, cb: { onPhase: (p) => setPhase(p), onPause: () => setPaused((v) => !v) } });
    game.current = g;
    if (TEST) window.__ri = g;
    setPaused(false);
    return () => {
      g.dispose();
      game.current = null;
    };
  }, [screen]);

  const online = cfg.current?.mode === 'online';
  const startSolo = () => {
    cfg.current = { mode: 'solo', role };
    setPhase(null);
    setScreen('play');
  };
  const onStart = ({ net, host }) => {
    cfg.current = { mode: 'online', net, slot: host ? 0 : 1 };
    setPhase(null);
    setScreen('play');
  };
  const toMenu = () => {
    setScreen('menu');
    setPhase(null);
    setPaused(false);
  };
  const hold = (k) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      game.current?.touch(k, true);
      if (k === 'act') game.current?.tap();
    },
    onPointerUp: () => game.current?.touch(k, false),
    onPointerCancel: () => game.current?.touch(k, false),
    onLostPointerCapture: () => game.current?.touch(k, false),
  });

  if (screen === 'play') {
    const me = online ? (cfg.current.slot === 0 ? 'arda' : 'elif') : cfg.current.role;
    return (
      <div className={'hs-root' + (IS_TOUCH ? ' touch' : '')} onPointerDown={() => game.current?.dlg && game.current.tap()}>
        <canvas ref={cv} className="hs-canvas" />
        <button className="hs-pause" onClick={() => setPaused(true)} aria-label="Duraklat">
          ❚❚
        </button>
        {IS_TOUCH && phase && phase.phase !== 'done' && (
          <div className="hs-touch">
            <div className="hs-tl">
              <button {...hold('l')}>◀</button>
              <button {...hold('r')}>▶</button>
            </div>
            <div className="hs-tr">
              {me === 'elif' && <button {...hold('up')}>▲</button>}
              <button {...hold('j')}>Zıpla</button>
              <button {...hold('act')} className="a">
                {me === 'arda' ? 'Kılıç / Kol' : 'Ok / Kol'}
              </button>
            </div>
          </div>
        )}
        {!IS_TOUCH && phase && phase.phase === 'play' && (
          <div className="hs-keys">A D yürü · W / Boşluk zıpla · E: {me === 'arda' ? 'kılıç, kol' : 'ok at (W basılıyken yukarı), kol'} · Esc duraklat</div>
        )}
        {paused && (
          <div className="hs-modal">
            <div className="hs-card">
              <h2>Duraklatıldı</h2>
              <button className="hs-btn primary" onClick={() => setPaused(false)}>
                Devam et
              </button>
              <button className="hs-btn" onClick={toMenu}>
                {online ? 'Odadan çık' : 'Ana menü'}
              </button>
            </div>
          </div>
        )}
        {phase && phase.phase === 'done' && (
          <div className="hs-modal">
            <div className="hs-card">
              <small>{phase.msg}</small>
              <h2>{phase.msg === 'Bölüm 1 tamam' ? 'Köy kanalı bitti!' : 'Bölüm bitti'}</h2>
              <p style={{ margin: 0, color: '#cfc6ea', textAlign: 'center', maxWidth: 240 }}>Sıradaki kanal: Deniz feneri (yakında).</p>
              <button className="hs-btn primary" onClick={toMenu}>
                {online ? 'Odadan çık' : 'Ana menü'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hs-root menu">
      <div className="hs-menu">
        <a className="hs-back" href="/">
          ← Oyun Salonu
        </a>
        <h1>
          Radyonun <em>İçinde</em>
        </h1>
        {screen === 'onl' ? (
          <OnlineLobby game="radyoic" path="/radyoic" nick={nick} initialCode={oda} onStart={onStart} onBack={() => setScreen('menu')} />
        ) : (
          <>
            <p className="hs-lead">Arda ve Elif eski bir radyonun içine düştü. Birbirine iple bağlı, iki kişilik bir macera: bulmacaları birlikte çöz, horozdan kaç. Bölüm 1: Köy kanalı.</p>
            <label className="hs-field">
              Takma adın
              <input value={nick} maxLength={12} onChange={(e) => setNick(e.target.value)} />
            </label>
            <div className="hs-pick">
              {['arda', 'elif'].map((id) => (
                <button key={id} className={'hs-ch' + (role === id ? ' on' : '')} onClick={() => setRole(id)}>
                  <Portrait id={id} />
                  <span>{id === 'arda' ? 'Arda · kılıç' : 'Elif · ok'}</span>
                </button>
              ))}
            </div>
            <div className="hs-actions">
              <button className="hs-btn primary" onClick={startSolo}>
                Bot arkadaşla
              </button>
              <button className="hs-btn" onClick={() => setScreen('onl')}>
                Online · arkadaşınla (kurucu Arda)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
