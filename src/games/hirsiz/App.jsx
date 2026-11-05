import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, ROSTER } from '../../characters/roster.js';
import { drawPortrait } from '../../characters/rig.js';
import OnlineLobby from '../../engine/OnlineLobby.jsx';
import { Match } from './game/match.js';
import './hs.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)));
const NICKS = ['Gölge', 'Tilki', 'Kedi', 'Pars', 'Baykuş', 'Sincap', 'Çakal'];
const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem('hs-prefs') || '{}');
  } catch {
    return {};
  }
};

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
  const prefs = useRef(loadPrefs()).current;
  const cv = useRef(null);
  const match = useRef(null);
  const cfg = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [pick, setPick] = useState(prefs.pick && CHARACTERS[prefs.pick] ? prefs.pick : 'elif');
  const [nick, setNick] = useState(prefs.nick || NICKS[Math.floor(Math.random() * NICKS.length)]);
  const [phase, setPhase] = useState(null);
  const [paused, setPaused] = useState(false);
  const oda = (QS.get('oda') || '').toUpperCase();

  useEffect(() => {
    try {
      localStorage.setItem('hs-prefs', JSON.stringify({ nick, pick }));
    } catch {}
  }, [nick, pick]);

  useEffect(() => {
    if (oda) setScreen('onl');
  }, [oda]);

  // hızlı test girişi: ?test&quick=elif,kaan&p0bot&manual
  useEffect(() => {
    const q = QS.get('quick');
    if (!q) return;
    const [a, b] = q.split(',');
    cfg.current = { mode: 'bot', chars: [a || 'elif', b || 'kaan'], nicks: ['Sen', 'Bot'], p0bot: QS.has('p0bot'), manual: QS.has('manual') };
    setScreen('play');
  }, []);

  useEffect(() => {
    if (screen !== 'play' || !cv.current || !cfg.current) return;
    const m = new Match(cv.current, { ...cfg.current, cb: { onPhase: (p) => setPhase(p), onPause: () => setPaused((v) => !v) } });
    match.current = m;
    if (TEST) window.__hs = m;
    setPaused(false);
    return () => {
      m.dispose();
      match.current = null;
    };
  }, [screen]);

  const online = cfg.current?.mode === 'online';
  const startBot = () => {
    const others = ROSTER.filter((r) => r !== pick);
    cfg.current = { mode: 'bot', chars: [pick, others[Math.floor(Math.random() * others.length)]], nicks: [nick, 'Bot'] };
    setPhase(null);
    setScreen('play');
  };
  const onStart = ({ net, host, nicks }) => {
    const others = ROSTER.filter((r) => r !== pick);
    // karakter yalnızca görünüş; kurucu kendi karakteri + rakip için ikinci bir karakter
    cfg.current = { mode: 'online', net, host, slot: host ? 0 : 1, chars: host ? [pick, others[0]] : [others[0], pick], nicks };
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
      match.current?.touch(k, true);
    },
    onPointerUp: () => match.current?.touch(k, false),
    onPointerCancel: () => match.current?.touch(k, false),
    onLostPointerCapture: () => match.current?.touch(k, false),
  });

  if (screen === 'play') {
    const role = phase?.role;
    return (
      <div className={'hs-root' + (IS_TOUCH ? ' touch' : '')}>
        <canvas ref={cv} className="hs-canvas" />
        <button className="hs-pause" onClick={() => setPaused(true)} aria-label="Duraklat">
          ❚❚
        </button>
        {IS_TOUCH && phase && phase.phase !== 'mend' && (
          <div className="hs-touch">
            <div className="hs-tl">
              <button {...hold('l')}>◀</button>
              <button {...hold('r')}>▶</button>
            </div>
            <div className="hs-tr">
              <div className="hs-tm">
                <button {...hold('u')}>▲</button>
                <button {...hold('d')}>▼</button>
              </div>
              {role === 't' && <button {...hold('run')}>Koş</button>}
              <button {...hold('act')} className="a">
                {role === 't' ? 'Çal / Yem' : 'Yakala'}
              </button>
            </div>
          </div>
        )}
        {!IS_TOUCH && phase && phase.phase === 'play' && (
          <div className="hs-keys">
            {role === 't' ? 'A D yürü · Shift koş (gürültü) · W S merdiven / saklan · Boşluk: hazineyi çal, uzakta yem at' : 'A D yürü · W S merdiven · Boşluk: yakala (saklanma yerlerini de yokla)'}
          </div>
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
        {phase && phase.phase === 'mend' && (
          <div className="hs-modal">
            <div className="hs-card">
              <small>{phase.msg || 'Maç bitti'}</small>
              <h2>{phase.winner < 0 ? 'Berabere' : online ? (phase.winner === cfg.current.slot ? 'Kazandın!' : 'Kaybettin') : phase.winner === 0 ? 'Kazandın!' : 'Bot kazandı'}</h2>
              <p className="hs-score">
                {online ? phase.wins[cfg.current.slot] : phase.wins[0]} – {online ? phase.wins[1 - cfg.current.slot] : phase.wins[1]}
              </p>
              <button className="hs-btn primary" onClick={() => match.current?.rematch()}>
                {online && match.current?.rmSelf ? 'Rakip bekleniyor…' : 'Rövanş'}
              </button>
              <button className="hs-btn" onClick={toMenu}>
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
          Hırsız <em>ve</em> Bekçi
        </h1>
        {screen === 'onl' ? (
          <OnlineLobby game="hirsiz" path="/hirsiz" nick={nick} initialCode={oda} onStart={onStart} onBack={() => setScreen('menu')} />
        ) : (
          <>
            <p className="hs-lead">Gece müzesinde biri hırsız, biri bekçi. Hırsız hazineyi çalıp çıkışa kaçar, bekçi yakalar. 3 turda roller değişir, önce 2 tur alan kazanır.</p>
            <label className="hs-field">
              Takma adın
              <input value={nick} maxLength={12} onChange={(e) => setNick(e.target.value)} />
            </label>
            <div className="hs-pick">
              {ROSTER.map((id) => (
                <button key={id} className={'hs-ch' + (pick === id ? ' on' : '')} onClick={() => setPick(id)}>
                  <Portrait id={id} />
                  <span>{CHARACTERS[id].name}</span>
                </button>
              ))}
            </div>
            <div className="hs-actions">
              <button className="hs-btn primary" onClick={startBot}>
                Bota karşı
              </button>
              <button className="hs-btn" onClick={() => setScreen('onl')}>
                Online · arkadaşınla
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
