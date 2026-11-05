import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, ROSTER } from '../../characters/roster.js';
import { drawPortrait } from '../../characters/rig.js';
import OnlineLobby from '../../engine/OnlineLobby.jsx';
import { Race } from './game/race.js';
import './tp.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)));
const NICKS = ['Tilki', 'Pars', 'Çakal', 'Şahin', 'Kaplan', 'Yıldırım', 'Rüzgâr'];
const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem('tp-prefs') || '{}');
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
  const race = useRef(null);
  const cfg = useRef(null);
  const [screen, setScreen] = useState('menu');
  const [pick, setPick] = useState(prefs.pick && CHARACTERS[prefs.pick] ? prefs.pick : 'kaan');
  const [nick, setNick] = useState(prefs.nick || NICKS[Math.floor(Math.random() * NICKS.length)]);
  const [phase, setPhase] = useState(null);
  const [paused, setPaused] = useState(false);
  const oda = (QS.get('oda') || '').toUpperCase();

  useEffect(() => {
    try {
      localStorage.setItem('tp-prefs', JSON.stringify({ nick, pick }));
    } catch {}
  }, [nick, pick]);
  useEffect(() => {
    if (oda) setScreen('onl');
  }, [oda]);
  useEffect(() => {
    const q = QS.get('quick');
    if (!q) return;
    const [a, b] = q.split(',');
    cfg.current = { mode: 'bot', chars: [a || 'kaan', b || 'elif'], nicks: ['Sen', 'Bot'], p0bot: QS.has('p0bot'), manual: QS.has('manual') };
    setScreen('play');
  }, []);
  useEffect(() => {
    if (screen !== 'play' || !cv.current || !cfg.current) return;
    const m = new Race(cv.current, { ...cfg.current, cb: { onPhase: (p) => setPhase(p), onPause: () => setPaused((v) => !v) } });
    race.current = m;
    if (TEST) window.__tp = m;
    setPaused(false);
    return () => {
      m.dispose();
      race.current = null;
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
      race.current?.touch(k, true);
    },
    onPointerUp: () => race.current?.touch(k, false),
    onPointerCancel: () => race.current?.touch(k, false),
    onLostPointerCapture: () => race.current?.touch(k, false),
  });

  if (screen === 'play') {
    const mySlot = online ? cfg.current.slot : 0;
    return (
      <div className={'tp-root' + (IS_TOUCH ? ' touch' : '')}>
        <canvas ref={cv} className="tp-canvas" />
        <button className="tp-pause" onClick={() => setPaused(true)} aria-label="Duraklat">
          ❚❚
        </button>
        {IS_TOUCH && phase && phase.phase !== 'mend' && (
          <div className="tp-touch">
            <button {...hold('brk')}>Fren / geri</button>
            <div className="tp-mid">
              <button {...hold('use')} className="use">
                Eşya
              </button>
            </div>
            <button {...hold('gas')} className="gas">
              Gaz
            </button>
          </div>
        )}
        {!IS_TOUCH && phase && phase.phase === 'race' && <div className="tp-keys">→ / D gaz · ← / A fren ve geri · havada: gaz arkaya, fren öne yatırır · Boşluk eşya kullan</div>}
        {paused && (
          <div className="tp-modal">
            <div className="tp-card">
              <h2>Duraklatıldı</h2>
              <button className="tp-btn primary" onClick={() => setPaused(false)}>
                Devam et
              </button>
              <button className="tp-btn" onClick={toMenu}>
                {online ? 'Odadan çık' : 'Ana menü'}
              </button>
            </div>
          </div>
        )}
        {phase && (phase.phase === 'rend' || phase.phase === 'mend') && (
          <div className="tp-modal" style={phase.phase === 'rend' ? { background: 'transparent', pointerEvents: 'none' } : undefined}>
            {phase.phase === 'mend' && (
              <div className="tp-card">
                <small>{phase.msg || 'Yarış bitti'}</small>
                <h2>{phase.winner === mySlot ? 'Kazandın!' : phase.winner < 0 ? 'Berabere' : 'Kaybettin'}</h2>
                <button className="tp-btn primary" onClick={() => race.current?.rematch()}>
                  {online && phase.rmSelf ? 'Rakip bekleniyor…' : 'Rövanş'}
                </button>
                <button className="tp-btn" onClick={toMenu}>
                  {online ? 'Odadan çık' : 'Ana menü'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tp-root menu">
      <div className="tp-menu">
        <a className="tp-back" href="/">
          ← Oyun Salonu
        </a>
        <h1>
          Tepe <em>Yarışı</em>
        </h1>
        {screen === 'onl' ? (
          <OnlineLobby game="tepe" path="/tepe" nick={nick} initialCode={oda} onStart={onStart} onBack={() => setScreen('menu')} />
        ) : (
          <>
            <p className="tp-lead">Hurda arabayla tepeli yolda yarış. Yolda kutulardan eşya al: nitro, çivi, yağ ya da öndekine yuvarlanan kaya. İlk bitiren kazanır.</p>
            <label className="tp-field">
              Takma adın
              <input value={nick} maxLength={12} onChange={(e) => setNick(e.target.value)} />
            </label>
            <div className="tp-pick">
              {ROSTER.map((id) => (
                <button key={id} className={'tp-ch' + (pick === id ? ' on' : '')} onClick={() => setPick(id)}>
                  <Portrait id={id} />
                  <span>{CHARACTERS[id].name}</span>
                </button>
              ))}
            </div>
            <div className="tp-actions">
              <button className="tp-btn primary" onClick={startBot}>
                Bota karşı
              </button>
              <button className="tp-btn" onClick={() => setScreen('onl')}>
                Online · arkadaşınla
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
