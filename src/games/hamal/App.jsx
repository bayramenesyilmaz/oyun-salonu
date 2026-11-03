import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game.js';
import { JOBS, TARGET, ENDING_GOOD, ENDING_SHORT } from './game/story.js';
import './hamal.css';

const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  const q = location.search;
  if (/[?&]touch\b/.test(q)) return true;
  if (/[?&]mouse\b/.test(q)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();
const fmt = (s) => {
  const n = Math.max(0, Math.ceil(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};
const KEYS = [
  ['W / S', 'Yürü · geri'],
  ['A / D', 'Dön'],
  ['Fare ya da ok tuşları', 'Yükü dengele (ters yöne yaslan)'],
  ['Shift', 'Hızlı yürü (daha çok sallanır)'],
  ['E', 'Teslim et · düşen yükü yükle'],
  ['C', 'Kamera mesafesi'],
  ['Esc', 'Duraklat'],
];
const TOUCH_KEYS = [
  ['Sol taraf', 'Sürükle: yürü ve dön'],
  ['Sağ taraf', 'Sürükle: yükü dengele'],
  ['E', 'Teslim et · yükle'],
  ['HIZLI', 'Basılı tut'],
];

function loadSettings() {
  try {
    return { vol: 0.8, sens: 1, low: IS_TOUCH, ...JSON.parse(localStorage.getItem('hamal-settings') || '{}') };
  } catch {
    return { vol: 0.8, sens: 1, low: IS_TOUCH };
  }
}

function Stick({ onMove, className, children }) {
  const st = useRef(null);
  const knob = useRef(null);
  const R = 56;
  const start = (e) => {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    st.current = { id: t.identifier, x: t.clientX, y: t.clientY };
    e.preventDefault();
  };
  const move = (e) => {
    if (!st.current) return;
    const t = [...(e.changedTouches || [e])].find((q) => q.identifier === st.current.id) || (e.changedTouches ? null : e);
    if (!t) return;
    let dx = t.clientX - st.current.x, dy = t.clientY - st.current.y;
    const l = Math.hypot(dx, dy);
    if (l > R) {
      dx *= R / l;
      dy *= R / l;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    onMove(dx / R, dy / R);
    e.preventDefault();
  };
  const end = (e) => {
    if (!st.current) return;
    st.current = null;
    if (knob.current) knob.current.style.transform = '';
    onMove(0, 0, true);
    e.preventDefault && e.preventDefault();
  };
  return (
    <div className={'hm-stick ' + className} onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}>
      <div className="ring">
        <div className="knob" ref={knob} />
      </div>
      <span>{children}</span>
    </div>
  );
}

function Bubble({ tilt, stumble }) {
  // su terazisi: kabarcık yükün devrildiği yöne kayar
  const x = Math.max(-1.2, Math.min(1.2, tilt.x));
  const y = Math.max(-1.2, Math.min(1.2, tilt.y));
  const d = Math.hypot(x, y);
  const cls = stumble ? 'fall' : d > 0.75 ? 'bad' : d > 0.45 ? 'warn' : '';
  return (
    <div className={'hm-bubble ' + cls}>
      <div className="zone" />
      <div className="dot" style={{ transform: `translate(${x * 34}px, ${-y * 34}px)` }} />
      <small>{stumble ? 'SENDELİYOR' : 'DENGE'}</small>
    </div>
  );
}

export default function App() {
  const mount = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [prog, setProg] = useState({ p: 0, t: '' });
  const [hud, setHud] = useState(null);
  const [sub, setSub] = useState(null);
  const [board, setBoard] = useState(null);
  const [result, setResult] = useState(null);
  const [ending, setEnding] = useState(null);
  const [tips, setTips] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [locked, setLocked] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [hasSave, setHasSave] = useState(false);
  const [err, setErr] = useState(null);
  const [endStep, setEndStep] = useState(0);

  useEffect(() => {
    let g;
    const emit = (type, p) => {
      if (type === 'phase') setPhase(p);
      else if (type === 'hud') setHud(p);
      else if (type === 'subtitle') setSub(p);
      else if (type === 'board') setBoard(p);
      else if (type === 'result') setResult(p);
      else if (type === 'ending') setEnding(p);
      else if (type === 'lock') setLocked(p);
      else if (type === 'tips') {
        setTips(p);
        setTimeout(() => setTips(null), 9000);
      } else if (type === 'toast') {
        setToasts((t) => [...t.slice(-2), p]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== p.id)), 1800);
      }
    };
    const id = setTimeout(async () => {
      try {
        g = new Game(mount.current, emit, { touch: IS_TOUCH, low: settings.low });
        game.current = g;
        await g.init((p, t) => setProg({ p, t }));
        g.setVolume(settings.vol);
        g.sensitivity = settings.sens;
        setHasSave(!!g.hasSave);
      } catch (e) {
        console.error(e);
        setErr(String(e && e.message ? e.message : e));
        setPhase('error');
      }
    }, 50);
    return () => {
      clearTimeout(id);
      g && g.dispose && g.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem('hamal-settings', JSON.stringify(settings)); } catch { /* yok say */ }
    const g = game.current;
    if (g) {
      g.setVolume(settings.vol);
      g.sensitivity = settings.sens;
    }
  }, [settings]);

  // son ekranı satır satır
  useEffect(() => {
    if (phase !== 'ending') return;
    setEndStep(0);
    const ts = [];
    for (let i = 1; i <= 4; i++) ts.push(setTimeout(() => setEndStep(i), i * 2600));
    return () => ts.forEach(clearTimeout);
  }, [phase]);

  const g = game.current;
  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
  const fs = () => {
    if (!IS_TOUCH) return;
    try {
      const el = document.documentElement;
      const r = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
      r && r.then && r.then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    } catch { /* yok say */ }
  };
  const playing = phase === 'play';
  const END = ending ? (ending.ok ? ENDING_GOOD : ENDING_SHORT) : [];

  return (
    <div className={'hm-app' + (IS_TOUCH ? ' touch' : '')}>
      <div ref={mount} className="hm-stage" />

      {phase === 'loading' && (
        <div className="hm-screen hm-load">
          <h1>HAMAL</h1>
          <div className="bar"><i style={{ width: `${Math.round(prog.p * 100)}%` }} /></div>
          <p>{prog.t || 'Hazırlanıyor'}…</p>
        </div>
      )}
      {phase === 'error' && (
        <div className="hm-screen hm-load">
          <h1>HAMAL</h1>
          <p>Oyun açılamadı. Tarayıcını güncelleyip yeniden dene.</p>
          <p className="dim">{err}</p>
        </div>
      )}

      {phase === 'menu' && (
        <div className="hm-screen hm-menu">
          <div className="card">
            <small>İstanbul · 1974</small>
            <h1>HAMAL</h1>
            <p className="lead">Karaköy’den Galata’ya, yokuş yukarı. Sırtında semer, üstünde yük, altında arnavut kaldırımı. Düşürme.</p>
            {hasSave && <button className="primary" onClick={() => { fs(); g.start(false); }}>Devam et · {Math.min(JOBS.length, g ? g.jobIdx + 1 : 1)}. iş</button>}
            <button className={hasSave ? 'ghost' : 'primary'} onClick={() => { fs(); g.start(true); }}>{hasSave ? 'Yeni gün' : 'Başla'}</button>
            <div className="keys">
              {(IS_TOUCH ? TOUCH_KEYS : KEYS).map(([k, v]) => (
                <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
              ))}
            </div>
            <div className="sets">
              <label>Ses <input type="range" min="0" max="1" step="0.05" value={settings.vol} onChange={(e) => set('vol', +e.target.value)} /></label>
              {!IS_TOUCH && <label>Fare hassasiyeti <input type="range" min="0.4" max="2.2" step="0.05" value={settings.sens} onChange={(e) => set('sens', +e.target.value)} /></label>}
              <label className="chk"><input type="checkbox" checked={settings.low} onChange={(e) => set('low', e.target.checked)} /> Düşük grafik (yeniden açılışta)</label>
            </div>
            <a className="back" href="/">← Oyun Salonu</a>
          </div>
        </div>
      )}

      {phase === 'intro' && (
        <div className="hm-screen hm-intro" onClick={() => g.skipIntro()}>
          {sub && <p key={sub.text} className="line">{sub.text}</p>}
          <small>geçmek için dokun</small>
        </div>
      )}

      {phase === 'board' && board && (
        <div className="hm-screen hm-board">
          <div className="card">
            <div className="row">
              <small>İş {board.idx + 1} / {JOBS.length}</small>
              <span className="money">Kese: <b>{board.money}</b> / {TARGET} lira</span>
            </div>
            <h2>{board.job.title}</h2>
            <p className="to">Nereye: <b>{({ bakkal: 'Bakkal Hayri, Yüksek Kaldırım’ın üstü', apartman: 'Madam Eleni’nin sarı apartmanı', doktor: 'Doktor Nuri Bey, Galata meydanı', dugun: 'Düğün evi, Galata meydanı', konak: 'Kulenin arkasındaki konak' })[board.job.to]}</b></p>
            <div className="meta">
              <span>Ücret <b>{board.job.pay} lira</b></span>
              <span>Süre <b>{fmt(board.job.time)}</b></span>
              {board.job.wind && <span className="warn">Poyraz var</span>}
            </div>
            <ul className="load">
              {Object.entries(board.job.load.reduce((m, l) => ((m[l.kind] = (m[l.kind] || 0) + 1), m), {})).map(([k, n]) => (
                <li key={k}>{n > 1 ? n + ' × ' : ''}{({ tomato: 'domates kasası', teabox: 'çay takımı (kırılır)', cage: 'kanarya kafesi (kırılır)', fridge: 'buzdolabı (kırılır)', suitcase: 'valiz', tv: 'televizyon (kırılır)', kilim: 'kilim', basket: 'sepet', piano: 'piyano (kırılır)' })[k]}</li>
              ))}
            </ul>
            <button className="primary" onClick={() => g.startJob()}>Yükle ve yola çık</button>
            {board.results.length > 0 && (
              <div className="done">
                {board.results.map((r, i) => r && (
                  <button key={i} className="mini" onClick={() => g.startJob(i)} title="Bu işi yeniden yap">{i + 1}. {'★'.repeat(r.stars)}{'☆'.repeat(3 - r.stars)}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(playing || phase === 'brief' || phase === 'deliver') && hud && playing && (
        <div className="hm-hud">
          <div className="top">
            <div className="job">
              <small>{hud.title}</small>
              <b>{hud.dest}</b>
            </div>
            <div className={'clock' + (hud.time < 0 ? ' late' : hud.time < 20 ? ' warn' : '')}>{hud.time < 0 ? '+' + fmt(-hud.time) : fmt(hud.time)}</div>
            <div className="purse">{hud.money} <small>/ {TARGET} ₺</small></div>
          </div>
          <div className="compass" style={{ transform: `rotate(${-hud.arrow}rad)` }}><i /></div>
          <div className="dist">{Math.round(hud.dist)} m</div>
          <div className="items">
            {hud.items.map((it, i) => (
              <span key={i} className={it.st}>{it.st === 'ok' ? '●' : it.st === 'lost' ? '○' : '✕'} {it.name}</span>
            ))}
          </div>
          <Bubble tilt={hud.tilt} stumble={hud.stumble} />
          {hud.wind > 0.2 && <div className="wind" style={{ opacity: Math.min(1, hud.wind) }}>POYRAZ</div>}
          {hud.prompt && <div className="prompt">{!IS_TOUCH && <kbd>E</kbd>} {hud.prompt}</div>}
          {!IS_TOUCH && !locked && <div className="lockhint">Fareyle dengelemek için ekrana tıkla · ok tuşları da olur</div>}
        </div>
      )}
      {tips && playing && (
        <div className="hm-tips">{tips.map((t) => <p key={t}>{t}</p>)}</div>
      )}
      <div className="hm-toasts">{toasts.map((t) => <span key={t.id}>{t.text}</span>)}</div>
      {sub && phase !== 'intro' && (
        <div className="hm-sub" onClick={() => g && g.skipLine()}>
          {sub.name && <b style={{ color: sub.color }}>{sub.name}</b>}
          <span>{sub.text}</span>
        </div>
      )}

      {playing && IS_TOUCH && g && (
        <div className="hm-touch">
          <Stick className="left" onMove={(x, y) => g.setTouchMove(x, y)}>YÜRÜ</Stick>
          <Stick className="right" onMove={(x, y, end) => g.setTouchLean(end ? null : { x: x * 1.2, y: -y * 1.2 })}>DENGE</Stick>
          <button className="act" onTouchStart={(e) => { e.preventDefault(); g.press('KeyE'); }}>E</button>
          <button className="fast" onTouchStart={(e) => { e.preventDefault(); g.touchFast = true; }} onTouchEnd={() => (g.touchFast = false)}>HIZLI</button>
          <button className="pause" onTouchStart={(e) => { e.preventDefault(); g.pause(); }}>❚❚</button>
        </div>
      )}

      {phase === 'paused' && (
        <div className="hm-screen hm-menu">
          <div className="card">
            <h2>Mola</h2>
            <button className="primary" onClick={() => g.resume()}>Devam et</button>
            <button className="ghost" onClick={() => g.startJob(g.jobIdx)}>Bu işi baştan al</button>
            <div className="sets">
              <label>Ses <input type="range" min="0" max="1" step="0.05" value={settings.vol} onChange={(e) => set('vol', +e.target.value)} /></label>
              {!IS_TOUCH && <label>Fare hassasiyeti <input type="range" min="0.4" max="2.2" step="0.05" value={settings.sens} onChange={(e) => set('sens', +e.target.value)} /></label>}
            </div>
            <div className="keys">{(IS_TOUCH ? TOUCH_KEYS : KEYS).map(([k, v]) => <div key={k}><kbd>{k}</kbd><span>{v}</span></div>)}</div>
            <a className="back" href="/">← Oyun Salonu</a>
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="hm-screen hm-result">
          <div className="card">
            <small>{result.id}. iş teslim edildi</small>
            <h2>{result.title}</h2>
            <div className="stars">{'★'.repeat(result.stars)}<i>{'★'.repeat(3 - result.stars)}</i></div>
            <table>
              <tbody>
                <tr><td>Ücret</td><td>{result.base} ₺</td></tr>
                {result.loss > 0 && <tr className="neg"><td>Hasar ({[...result.broken.map((n) => n + ' kırıldı'), ...result.lost.map((n) => n + ' yolda kaldı'), ...(result.dent ? ['sarsıntı'] : [])].join(', ')})</td><td>−{result.loss} ₺</td></tr>}
                {result.latePen > 0 && <tr className="neg"><td>Gecikme</td><td>−{result.latePen} ₺</td></tr>}
                {result.bonus > 0 && <tr className="pos"><td>Bahşiş: zamanında ve sapasağlam</td><td>+{result.bonus} ₺</td></tr>}
                <tr className="sum"><td>Kazanç</td><td>{result.pay} ₺</td></tr>
              </tbody>
            </table>
            <p className="purse">Kese: <b>{result.money}</b> / {result.target} lira · Süre {fmt(result.time)}</p>
            <button className="primary" onClick={() => g.next()}>{result.final ? 'Akşam oldu' : 'Sıradaki iş'}</button>
            <button className="ghost" onClick={() => { g.jobIdx = result.id - 1; g.startJob(result.id - 1); }}>Bu işi yeniden dene</button>
          </div>
        </div>
      )}

      {phase === 'ending' && ending && (
        <div className="hm-screen hm-ending">
          {END.map((l, i) => <p key={i} className={i < endStep ? 'show' : ''}>{l}</p>)}
          {endStep >= END.length && (
            <div className="credits">
              <h1>HAMAL</h1>
              <p>Kese: {ending.money} lira · {ending.results.reduce((s, r) => s + (r ? r.stars : 0), 0)} / {JOBS.length * 3} yıldız</p>
              <p className="dim">Kemal: Microsoft Rocketbox (MIT) · Eşyalar ve dokular: Poly Haven (CC0) · Fizik: Rapier (Apache 2.0) · Sokaklar, sesler ve efektler kodla üretildi.</p>
              <button className="primary" onClick={() => { g.newGame(); g.showBoard(); }}>Yeni gün</button>
              <a className="back" href="/">← Oyun Salonu</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
