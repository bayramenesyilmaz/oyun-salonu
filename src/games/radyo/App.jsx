import { useEffect, useRef, useState } from 'react';
import { Game, hasSave, savedEndings, DIAL_MIN, DIAL_MAX } from './game/Game.js';
import { ENDINGS } from './game/story.js';
import './radyo.css';

const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  if (/[?&]touch\b/.test(location.search)) return true;
  if (/[?&]mouse\b/.test(location.search)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();
const TEST = /[?&]test\b/.test(typeof location !== 'undefined' ? location.search : '');

const ZONE_BTNS = [
  ['radyo', 'Radyo'],
  ['duvar', 'Duvar'],
  ['sandik', 'Sandık'],
  ['raf', 'Raf'],
];

function loadSettings() {
  try {
    return { vol: 0.8, ...JSON.parse(localStorage.getItem('radyo-settings') || '{}') };
  } catch {
    return { vol: 0.8 };
  }
}

export default function App() {
  const mount = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [hud, setHud] = useState(null);
  const [sub, setSub] = useState(null);
  const [narr, setNarr] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [tune, setTune] = useState(null);
  const [choice, setChoice] = useState(null);
  const [change, setChange] = useState(null);
  const [ending, setEnding] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [flash, setFlash] = useState(0);
  const [fade, setFade] = useState(0);
  const [notes, setNotes] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [err, setErr] = useState(null);
  const [menuInfo, setMenuInfo] = useState(() => ({ save: hasSave(), endings: savedEndings() }));

  useEffect(() => {
    let g;
    const emit = (type, d) => {
      if (type === 'phase') {
        setPhase(d);
        if (d === 'intro') setFade(0);
      } else if (type === 'hud') setHud(d);
      else if (type === 'subtitle') setSub(d);
      else if (type === 'narration') setNarr(d);
      else if (type === 'inspect') setInspect(d);
      else if (type === 'tune') setTune(d);
      else if (type === 'choice') setChoice(d);
      else if (type === 'change') setChange(d);
      else if (type === 'ending') setEnding(d);
      else if (type === 'markers') setMarkers(d);
      else if (type === 'flash') setFlash((f) => f + 1);
      else if (type === 'fade') setFade(1);
      else if (type === 'toast') {
        const id = Math.random();
        setToasts((t) => [...t.slice(-2), { id, text: d }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
      }
    };
    try {
      g = game.current = new Game(mount.current, emit, { touch: IS_TOUCH, test: TEST, low: IS_TOUCH });
      g.audio.setVolume(settings.vol);
    } catch (e) {
      console.error(e);
      setErr(String(e && e.message ? e.message : e));
    }
    const vis = () => g && g.pause(document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      g && g.dispose();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('radyo-settings', JSON.stringify(settings));
    } catch {}
    game.current && game.current.audio.setVolume(settings.vol);
  }, [settings]);

  const g = () => game.current;
  const start = (cont) => {
    setEnding(null);
    setChange(null);
    setChoice(null);
    setInspect(null);
    g().start(cont);
  };
  const toMenu = () => {
    g().voice.stop();
    g().phase = 'menu';
    setEnding(null);
    setPhase('menu');
    setMenuInfo({ save: hasSave(), endings: savedEndings() });
  };

  // ---- kadran: sürükle ----
  const dialRef = useRef(null);
  const dialDrag = (e) => {
    const r = dialRef.current.getBoundingClientRect();
    const f = DIAL_MIN + ((e.clientX - r.left) / r.width) * (DIAL_MAX - DIAL_MIN);
    g().setFreq(f);
  };
  const nudge = (d) => g().setFreq(g().freq + d);
  const holdRef = useRef(null);
  const startHold = (d) => {
    nudge(d);
    clearInterval(holdRef.current);
    holdRef.current = setInterval(() => nudge(d), 90);
  };
  const stopHold = () => clearInterval(holdRef.current);
  useEffect(() => {
    const k = (e) => {
      if (!game.current || game.current.phase !== 'radio') return;
      if (e.key === 'ArrowLeft') nudge(e.shiftKey ? -0.1 : -0.01);
      if (e.key === 'ArrowRight') nudge(e.shiftKey ? 0.1 : 0.01);
      if (e.key === 'Escape') game.current.back();
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);

  const exploring = phase === 'explore';
  const inGame = !['menu', 'loading', 'ending'].includes(phase);

  return (
    <div className={'ry-root' + (IS_TOUCH ? ' touch' : '')}>
      <div ref={mount} className="ry-stage" />
      {err && <div className="ry-err">Bu cihazda 3B grafik başlatılamadı: {err}</div>}

      {/* işaretler */}
      {exploring && !inspect && !notes && (
        <div className="ry-markers">
          {markers.map((m) => (
            <button
              key={m.id}
              className={'ry-mk ' + m.kind}
              style={{ left: m.x, top: m.y }}
              data-id={m.id}
              onClick={() => (m.kind === 'zone' ? g().goView(m.id.slice(5)) : g().inspect(m.id))}
            >
              {m.kind === 'zone' ? (
                <span className="lbl">
                  {m.label}
                  {m.count > 0 && <b>{m.count}</b>}
                </span>
              ) : m.label ? (
                <span className="lbl">{m.label}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* üst bilgi */}
      {inGame && hud && (
        <div className="ry-top">
          <div className="ry-night">
            <span>{hud.night}. Gece</span> <b>{hud.title}</b> <i>· {hud.year}</i>
          </div>
          <div className="ry-top-r">
            <button className="ry-ib" onClick={() => setNotes((n) => !n)} title="Defter">
              ✎ <span>{hud.notes.length}</span>
            </button>
            <button className="ry-ib" onClick={toMenu} title="Menü">
              ☰
            </button>
          </div>
        </div>
      )}
      {(exploring || phase === 'radio') && hud && hud.view !== 'genel' && (
        <button className="ry-back" onClick={() => g().back()}>
          ← Geri
        </button>
      )}
      {exploring && (
        <div className="ry-zones">
          {ZONE_BTNS.map(([id, l]) => (
            <button key={id} className={hud && hud.view === id ? 'on' : ''} onClick={() => g().goView(id)}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* radyo kadranı */}
      {phase === 'radio' && tune && (
        <div className="ry-radio">
          <div className="ry-readout">
            <div className="eye" style={{ '--s': tune.signal, '--l': tune.lock }} />
            <div className="num">{tune.freq.toFixed(2)}</div>
            <div className="ry-sig">
              <i style={{ width: `${Math.round(tune.signal * 100)}%` }} />
            </div>
          </div>
          <div
            className="ry-dial"
            ref={dialRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dialDrag(e);
            }}
            onPointerMove={(e) => e.buttons && dialDrag(e)}
          >
            {Array.from({ length: 41 }, (_, i) => (
              <span key={i} className={'tick' + (i % 10 === 0 ? ' big' : i % 5 === 0 ? ' mid' : '')} style={{ left: `${(i / 40) * 100}%` }}>
                {i % 10 === 0 && <em>{(DIAL_MIN + i / 10).toFixed(0)}</em>}
              </span>
            ))}
            <div className="needle" style={{ left: `${((tune.freq - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 100}%` }} />
          </div>
          <div className="ry-fine">
            <button onPointerDown={() => startHold(-0.01)} onPointerUp={stopHold} onPointerLeave={stopHold}>
              ◀
            </button>
            <span>{tune.hasCode ? 'Etikette yazan frekansı bul. Cızırtı azalınca bekle.' : 'Kadranı çevir. Ama hangi frekans? Etrafa bakmak lazım.'}</span>
            <button onPointerDown={() => startHold(0.01)} onPointerUp={stopHold} onPointerLeave={stopHold}>
              ▶
            </button>
          </div>
        </div>
      )}

      {/* altyazı */}
      {sub && inGame && (
        <div className="ry-sub" key={sub.text}>
          <b style={{ color: sub.color }}>{sub.who}</b>
          <span>{sub.text}</span>
          <button className="ry-skip" onClick={() => g().voice.cur && (g().voice.cur.ended = true, (g().voice.cur.t = 999))}>
            ›
          </button>
        </div>
      )}

      {/* seçim */}
      {phase === 'choice' && choice && (
        <div className="ry-choice">
          <h3>{choice.prompt}</h3>
          {choice.options.map((o) => (
            <button key={o.id} data-id={o.id} disabled={o.locked} onClick={() => g().choose(o.id)}>
              <span>“{o.text}”</span>
              {o.locked && <em>🔒 İpucu gerekli: {o.missing.join(', ')}</em>}
            </button>
          ))}
          <button className="ry-wait" onClick={() => g().deferChoice()}>
            ⏸ Bekle Ali, bir şeye bakıp döneceğim
          </button>
          <small>Bulduğun ipuçları yeni seçenekler açar. Defterine bakabilirsin.</small>
        </div>
      )}

      {/* ipucu kartı */}
      {inspect && (
        <div className="ry-modal" onClick={() => setInspect(null)}>
          <div className={'ry-paper' + (inspect.clue ? ' clue' : '')} onClick={(e) => e.stopPropagation()}>
            {inspect.isNew && <div className="stamp">Deftere eklendi</div>}
            <h3>{inspect.title}</h3>
            <p>{inspect.text}</p>
            <button className="ry-btn" onClick={() => setInspect(null)}>
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* defter */}
      {notes && hud && (
        <div className="ry-modal" onClick={() => setNotes(false)}>
          <div className="ry-paper notes" onClick={(e) => e.stopPropagation()}>
            <h3>Ece'nin defteri</h3>
            {hud.notes.length === 0 && <p className="dim">Henüz bir şey yazmadım. Tavan arasına bakmalıyım.</p>}
            {hud.notes.map((n) => (
              <div key={n.id} className="note">
                <b>{n.title}</b>
                <p>{n.text}</p>
              </div>
            ))}
            <button className="ry-btn" onClick={() => setNotes(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* gece girişi */}
      {phase === 'intro' && narr && (
        <div className="ry-modal dark">
          <div className="ry-intro">
            <h2>{narr.title}</h2>
            {narr.lines.map((l, i) => (
              <p key={i} style={{ animationDelay: `${0.3 + i * 0.9}s` }}>
                {l}
              </p>
            ))}
            <p className="hint" style={{ animationDelay: `${0.3 + narr.lines.length * 0.9}s` }}>
              {narr.hint}
            </p>
            <button className="ry-btn big" onClick={() => g().beginExplore()}>
              Tavan arasına bak
            </button>
          </div>
        </div>
      )}

      {/* değişim */}
      {phase === 'change' && change && (
        <div className="ry-modal">
          <div className="ry-paper change">
            <div className="tag">Geçmiş değişti</div>
            <p>{change.text}</p>
            <button className="ry-btn" onClick={() => g().afterChange()}>
              Devam
            </button>
          </div>
        </div>
      )}

      {/* son */}
      {phase === 'ending' && ending && (
        <div className={'ry-modal dark end-' + ending.key}>
          <div className="ry-intro">
            <div className="tag">Son</div>
            <h2>{ending.title}</h2>
            <p>{ending.text}</p>
            <div className="ry-ends">
              {Object.entries(ENDINGS).map(([k, e]) => (
                <span key={k} className={ending.got.includes(k) ? 'got' : ''}>
                  {ending.got.includes(k) ? e.title : '???'}
                </span>
              ))}
            </div>
            <div className="row">
              {ending.canRewind && (
                <button className="ry-btn big" onClick={() => (setEnding(null), g().rewind())}>
                  ⟲ 2. geceye geri sar
                </button>
              )}
              <button className="ry-btn" onClick={toMenu}>
                Ana menü
              </button>
            </div>
          </div>
        </div>
      )}

      {/* menü */}
      {phase === 'menu' && (
        <div className="ry-menu">
          <div className="ry-menu-card">
            <div className="kicker">Bir tavan arası, bir radyo, iki gece</div>
            <h1>
              Dedemin <span>Radyosu</span>
            </h1>
            <p>Dedemin eski radyosu, gece yarısından sonra geçmişi çekiyor. Karşı tarafta genç bir delikanlı var: dedem. Ona ne söylersem, tavan arası da değişiyor.</p>
            <div className="row">
              {menuInfo.save && (
                <button className="ry-btn big" onClick={() => start(true)}>
                  Devam et
                </button>
              )}
              <button className={'ry-btn' + (menuInfo.save ? '' : ' big')} onClick={() => start(false)}>
                {menuInfo.save ? 'Baştan başla' : 'Başla'}
              </button>
            </div>
            <label className="ry-vol">
              Ses
              <input type="range" min="0" max="1" step="0.05" value={settings.vol} onChange={(e) => setSettings((s) => ({ ...s, vol: +e.target.value }))} />
            </label>
            {menuInfo.endings.length > 0 && <div className="ry-small">Bulunan sonlar: {menuInfo.endings.length} / 3</div>}
            <div className="ry-small">Kulaklıkla oynamanı öneririm. Kişiler ve olaylar kurgudur.</div>
            <a className="ry-home" href="/">
              ← Oyun salonu
            </a>
          </div>
        </div>
      )}

      <div className="ry-toasts">
        {toasts.map((t) => (
          <div key={t.id}>{t.text}</div>
        ))}
      </div>
      <div className="ry-flash" key={'f' + flash} data-on={flash > 0 ? 1 : 0} />
      <div className="ry-fade" style={{ opacity: fade }} />
    </div>
  );
}
