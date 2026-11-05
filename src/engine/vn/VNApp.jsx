import { useEffect, useRef, useState, useCallback } from 'react';
import { VNController } from './controller.js';
import './vn.css';

const TEST = /[?&]test\b/.test(location.search);

export default function VNApp({ cfg, st }) {
  const cv = useRef(null);
  const ctl = useRef(null);
  const [u, setU] = useState({ phase: 'menu', node: null, options: [], meters: {}, clues: [], fade: 0, flash: 0, shown: 0 });
  const [book, setBook] = useState(false);
  const [pause, setPause] = useState(false);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState(null);
  const [ends, setEnds] = useState([]);
  const [save, setSave] = useState(false);

  useEffect(() => {
    document.title = cfg.title;
    let c;
    try {
      c = new VNController({ cfg, st, canvas: cv.current, emit: setU });
    } catch (e) {
      console.error(e);
      setErr('WebGL başlatılamadı. Güncel Chrome, Edge ya da Safari ile dene.');
      return;
    }
    ctl.current = c;
    setEnds(c.ends());
    setSave(c.hasSave());
    if (TEST) window.__vn = c;
    return () => c.dispose();
  }, [cfg, st]);

  const tap = useCallback(() => ctl.current && ctl.current.tap(), []);
  useEffect(() => {
    const kd = (e) => {
      const c = ctl.current;
      if (!c) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        if (c.ui.phase === 'play' && !book && !pause) {
          e.preventDefault();
          c.tap();
        }
      } else if (/^Digit[1-9]$/.test(e.code) && c.ui.phase === 'play') {
        const o = c.ui.options[+e.code.slice(5) - 1];
        if (o && !o.locked) c.pick(o.k);
      } else if (e.code === 'Escape' && c.ui.phase === 'play') setPause((p) => !p);
      else if (e.code === 'KeyN' && c.ui.phase === 'play' && cfg.clues) setBook((b) => !b);
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [book, pause, cfg]);

  const n = u.node;
  const text = n ? n.text.slice(0, u.shown) : '';
  const done = n && u.shown >= n.text.length;
  const inPlay = u.phase === 'play';
  const clueList = Object.entries(cfg.clues || {}).filter(([k]) => u.clues.includes(k));
  const metersShown = Object.entries(cfg.meters || {}).filter(([, m]) => m.show);

  const start = (resume) => {
    setPause(false);
    setBook(false);
    ctl.current.begin(resume);
  };
  const toMenu = () => {
    setPause(false);
    ctl.current.toMenu();
    setEnds(ctl.current.ends());
    setSave(ctl.current.hasSave());
  };

  if (err) return <div className="vn-root"><div className="vn-err">{err}</div></div>;

  return (
    <div className={'vn-root' + (u.letter ? ' letter' : '')} style={{ '--accent': cfg.accent || '#ff9f43' }}>
      <div className="vn-stage" onClick={inPlay && !book && !pause ? tap : undefined}>
        <canvas ref={cv} />
        <div className="vn-vig" />
        <div className="vn-grain" />
        {u.letter && (<><div className="vn-bar top" /><div className="vn-bar bot" /></>)}
        <div className="vn-flash" style={{ opacity: u.flash }} />
        <div className="vn-fade" style={{ opacity: u.fade }} />
        {u.sceneTitle && <div className="vn-scene">{u.sceneTitle}</div>}
        {u.loading && <div className="vn-load">Karakter hazırlanıyor…</div>}
      </div>

      {u.phase === 'menu' && (
        <div className="vn-menu">
          <div className="vn-title">
            <small>{cfg.tag}</small>
            <h1>{cfg.title}</h1>
            <p>{cfg.tagline}</p>
          </div>
          <div className="vn-btns">
            {save && <button className="vn-btn primary" onClick={() => start(true)}>Devam et</button>}
            <button className={'vn-btn' + (save ? '' : ' primary')} onClick={() => start(false)}>{save ? 'Baştan başla' : 'Başla'}</button>
            <div className="vn-sub">Sonlar: {ends.length}{cfg.endings ? ' / ' + Object.keys(cfg.endings).length : ''} · Dokun ya da Boşluk ile ilerle · 1-4 seçim</div>
            {cfg.warn && <div className="vn-warn">{cfg.warn}</div>}
          </div>
        </div>
      )}

      {inPlay && (
        <>
          <div className="vn-top">
            <button className="vn-ic" onClick={() => setPause(true)} aria-label="Menü">☰</button>
            {cfg.clues && <button className="vn-ic" onClick={() => setBook(true)} aria-label="Not defteri">📓{clueList.length ? <b>{clueList.length}</b> : null}</button>}
            <button className="vn-ic" onClick={() => { setMuted(!muted); ctl.current.mute(!muted); }} aria-label="Ses">{muted ? '🔇' : '🔊'}</button>
          </div>
          {metersShown.length > 0 && (
            <div className="vn-meters">
              {metersShown.map(([k, m]) => {
                const v = u.meters[k] ?? 0;
                const pct = Math.max(0, Math.min(100, ((v - (m.min ?? 0)) / ((m.max ?? 10) - (m.min ?? 0))) * 100));
                return (
                  <div key={k} className="vn-meter"><span>{m.label}</span><i><b style={{ width: pct + '%', background: m.color || '#fff' }} /></i></div>
                );
              })}
            </div>
          )}
          {u.toast && <div className="vn-toast">📓 {u.toast}</div>}
          {u.timer && <div className="vn-timer"><i style={{ width: (u.timer.left / u.timer.total) * 100 + '%' }} /></div>}

          {n && n.kind !== 'choice' && (
            <div className={'vn-box ' + n.kind} onClick={tap}>
              {n.name && <div className="vn-name" style={{ color: n.color }}>{n.name}</div>}
              <div className="vn-text">{text}{!done && <span className="vn-cur" />}</div>
              {done && <div className="vn-next">▾</div>}
            </div>
          )}
          {n && n.kind === 'choice' && (
            <div className="vn-choices">
              {n.text && <div className="vn-prompt">{n.name && <b style={{ color: n.color }}>{n.name}: </b>}{n.text}</div>}
              {u.options.map((o, i) => (
                <button key={o.k} className="vn-opt" disabled={o.locked} onClick={() => ctl.current.pick(o.k)}>
                  <em>{i + 1}</em>{o.t}{o.locked && o.hint ? <small> — {o.hint}</small> : null}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {pause && inPlay && (
        <div className="vn-modal" onClick={() => setPause(false)}>
          <div className="vn-card" onClick={(e) => e.stopPropagation()}>
            <h2>Duraklatıldı</h2>
            <button className="vn-btn primary" onClick={() => setPause(false)}>Devam et</button>
            <button className="vn-btn" onClick={toMenu}>Ana menü (ilerleme kayıtlı)</button>
            <a className="vn-btn" href="/">Oyun listesi</a>
          </div>
        </div>
      )}
      {book && (
        <div className="vn-modal" onClick={() => setBook(false)}>
          <div className="vn-card book" onClick={(e) => e.stopPropagation()}>
            <h2>📓 Not defteri</h2>
            {clueList.length === 0 && <p className="dim">Henüz bir şey yazmadın.</p>}
            {clueList.map(([k, c]) => (
              <div key={k} className="vn-clue"><b>{c.t}</b><span>{c.d}</span></div>
            ))}
            <button className="vn-btn" onClick={() => setBook(false)}>Kapat</button>
          </div>
        </div>
      )}
      {u.phase === 'end' && u.ending && (
        <div className={'vn-end ' + u.ending.kind}>
          <div className="vn-endbox">
            <small>{u.ending.kind === 'bad' ? 'SON' : u.ending.kind === 'mid' ? 'SON' : 'SON'} {u.ending.count}{u.ending.total ? ' / ' + u.ending.total : ''}</small>
            <h2>{u.ending.title}</h2>
            <p>{u.ending.text}</p>
            <div className="vn-btns row">
              <button className="vn-btn primary" onClick={() => start(false)}>Başka bir yol dene</button>
              <button className="vn-btn" onClick={toMenu}>Ana menü</button>
              <a className="vn-btn" href="/">Oyun listesi</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
