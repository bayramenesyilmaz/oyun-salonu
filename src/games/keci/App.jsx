import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game.js';
import { TIPS } from './game/story.js';
import TouchControls from './TouchControls.jsx';
import './keci.css';

const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  const q = location.search;
  if (/[?&]touch\b/.test(q)) return true;
  if (/[?&]mouse\b/.test(q)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();
const TEST = /[?&]test\b/.test(typeof location !== 'undefined' ? location.search : '');

const CONTROLS = [
  ['W A S D', 'Yürü'],
  ['Fare', 'Kamera'],
  ['Shift', 'Koş'],
  ['Boşluk', 'Zıpla'],
  ['Sol tık / F', 'Kafa at'],
  ['E / Sağ tık', 'Ağzına al · bırak'],
  ['Q', 'Mele'],
  ['Esc', 'Duraklat'],
];
const TOUCH_CONTROLS = [
  ['Sol taraf', 'Sürükle: yürü (sonuna kadar: koş)'],
  ['Sağ taraf', 'Sürükle: kamera'],
  ['KAFA', 'Kafa at'],
  ['ZIPLA', 'Zıpla'],
  ['AL', 'Ağzına al · bırak'],
  ['MEE', 'Mele'],
];

function loadSettings() {
  const d = { sens: 1, vol: 0.8, voice: true, low: IS_TOUCH };
  try {
    return { ...d, ...JSON.parse(localStorage.getItem('keci-settings') || '{}') };
  } catch {
    return d;
  }
}
function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('keci-best') || 'null');
  } catch {
    return null;
  }
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function App() {
  const mount = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [quests, setQuests] = useState([]);
  const [hud, setHud] = useState({ chaos: 0, energy: 0, chase: false, carry: null });
  const [prompt, setPrompt] = useState(null);
  const [sub, setSub] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [chaosPops, setChaosPops] = useState([]);
  const [locked, setLocked] = useState(false);
  const [halay, setHalay] = useState(false);
  const [result, setResult] = useState(null);
  const [caught, setCaught] = useState(0);
  const [panel, setPanel] = useState(null); // 'controls' | 'settings'
  const [settings, setSettings] = useState(loadSettings);
  const [err, setErr] = useState(null);
  const best = useRef(loadBest());

  useEffect(() => {
    let g;
    const emit = (type, p) => {
      if (type === 'phase') setPhase(p);
      else if (type === 'quests') setQuests(p);
      else if (type === 'hud') setHud(p);
      else if (type === 'prompt') setPrompt(p);
      else if (type === 'subtitle') setSub(p);
      else if (type === 'lock') setLocked(p);
      else if (type === 'halay') setHalay(p);
      else if (type === 'end') setResult(p);
      else if (type === 'caught') setCaught((c) => c + 1);
      else if (type === 'toast') {
        const id = Math.random();
        setToasts((t) => [...t.slice(-2), { id, text: p }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
      } else if (type === 'chaos') {
        const id = Math.random();
        setChaosPops((t) => [...t.slice(-4), { id, n: p }]);
        setTimeout(() => setChaosPops((t) => t.filter((x) => x.id !== id)), 1100);
      }
    };
    try {
      g = new Game(mount.current, emit, { touch: IS_TOUCH, test: TEST, low: settings.low });
      game.current = g;
      g.init()
        .then(() => {
          g.setSensitivity(settings.sens);
          g.setVolume(settings.vol);
          g.setVoice(settings.voice);
        })
        .catch((e) => setErr(String(e && e.message ? e.message : e)));
    } catch (e) {
      setErr(String(e.message || e));
    }
    return () => g && g.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (s) => {
    setSettings(s);
    try {
      localStorage.setItem('keci-settings', JSON.stringify(s));
    } catch {
      /* yok say */
    }
    const g = game.current;
    if (!g) return;
    g.setSensitivity(s.sens);
    g.setVolume(s.vol);
    g.setVoice(s.voice);
    g.setQuality(s.low);
  };

  const start = () => {
    setPanel(null);
    game.current && game.current.start();
  };

  const playing = phase === 'playing' || phase === 'finale' || phase === 'ending';

  return (
    <div className={'keci' + (IS_TOUCH ? ' is-touch' : '')}>
      <div ref={mount} className="k-mount" />

      {err && (
        <div className="k-screen">
          <div className="k-card">
            <h2>Bir şeyler ters gitti</h2>
            <p>Tarayıcın WebGL veya WebAssembly desteklemiyor olabilir.</p>
            <code>{err}</code>
            <a className="k-btn ghost" href="/">← Oyun Salonu</a>
          </div>
        </div>
      )}

      {phase === 'loading' && !err && (
        <div className="k-screen k-loading">
          <div className="k-goat-bounce" aria-hidden="true">🐐</div>
          <p>Köy hazırlanıyor…</p>
        </div>
      )}

      {phase === 'menu' && (
        <div className="k-screen k-title">
          <div className="k-logo">
            <span className="k-logo-1">KEÇİ</span>
            <span className="k-logo-2">KAÇTI!</span>
          </div>
          <p className="k-tagline">Kuzulu köyünde düğün günü. Herkes mutlu. Gıdık hariç.</p>
          {!panel && (
            <div className="k-menu">
              <button className="k-btn big" onClick={start}>Oyna</button>
              <button className="k-btn" onClick={() => setPanel('controls')}>Kontroller</button>
              <button className="k-btn" onClick={() => setPanel('settings')}>Ayarlar</button>
              <a className="k-btn ghost" href="/">← Oyun Salonu</a>
              {best.current && (
                <p className="k-best">En iyi kaos: <b>{best.current.chaos}</b> · halay %{best.current.halay}</p>
              )}
            </div>
          )}
          {panel === 'controls' && <Controls onBack={() => setPanel(null)} />}
          {panel === 'settings' && <Settings s={settings} save={save} onBack={() => setPanel(null)} />}
        </div>
      )}

      {playing && (
        <>
          <div className="k-quests">
            {quests.map((q) => (
              <div key={q.id} className={'k-q' + (q.done ? ' done' : '')}>
                <span className="k-check">{q.done ? '✔' : ''}</span>
                <div>
                  <b>
                    {q.title}
                    {q.total ? ` ${q.n}/${q.total}` : ''}
                  </b>
                  {!q.done && <small>{q.text}</small>}
                </div>
              </div>
            ))}
          </div>
          <div className="k-chaos">
            <span className="k-chaos-l">KAOS</span>
            <span className="k-chaos-n">{hud.chaos}</span>
            {chaosPops.map((c) => (
              <span key={c.id} className="k-chaos-pop">+{c.n}</span>
            ))}
            <div className="k-energy" title="Lahana enerjisi">
              <span>🥬</span>
              <div className="k-bar">
                <i style={{ width: `${Math.round(hud.energy * 100)}%` }} />
              </div>
            </div>
          </div>
          {hud.chase && phase === 'playing' && <div className="k-chase">ÇOBAN CAFER PEŞİNDE! KOŞ!</div>}
          {hud.carry && <div className="k-carry">Ağzında: {hud.carry}</div>}
          {prompt && !IS_TOUCH && (
            <div className="k-prompt">
              <kbd>E</kbd> {prompt}
            </div>
          )}
          <div className="k-toasts">
            {toasts.map((t) => (
              <div key={t.id} className="k-toast">{t.text}</div>
            ))}
          </div>
          {!IS_TOUCH && !locked && phase === 'playing' && !TEST && (
            <div className="k-lockhint">Kamerayı fareyle çevirmek için ekrana tıkla</div>
          )}
          {caught > 0 && <div key={caught} className="k-caught" />}
          {halay && <HalayLane game={game.current} touch={IS_TOUCH} />}
          {IS_TOUCH && phase === 'playing' && game.current && <TouchControls game={game.current} prompt={prompt} />}
          {IS_TOUCH && phase !== 'ending' && (
            <button className="k-pausebtn" onClick={() => game.current.pause()} aria-label="Duraklat">❚❚</button>
          )}
        </>
      )}

      {sub && (playing || phase === 'paused') && (
        <div className={'k-sub' + (halay ? ' high' : '')}>
          <b style={{ color: sub.color }}>{sub.who}</b>
          <span>{sub.text}</span>
        </div>
      )}

      {phase === 'paused' && (
        <div className="k-screen k-dim">
          <div className="k-card">
            <h2>Mola</h2>
            {!panel && (
              <div className="k-menu">
                <button className="k-btn big" onClick={() => game.current.resume()}>Devam et</button>
                <button className="k-btn" onClick={() => setPanel('controls')}>Kontroller</button>
                <button className="k-btn" onClick={() => setPanel('settings')}>Ayarlar</button>
                <button className="k-btn ghost" onClick={() => location.reload()}>Baştan başla</button>
                <a className="k-btn ghost" href="/">← Oyun Salonu</a>
                <p className="k-tip">{TIPS[Math.floor(Date.now() / 10000) % TIPS.length]}</p>
              </div>
            )}
            {panel === 'controls' && <Controls onBack={() => setPanel(null)} />}
            {panel === 'settings' && <Settings s={settings} save={save} onBack={() => setPanel(null)} />}
          </div>
        </div>
      )}

      {phase === 'end' && result && (
        <div className="k-screen k-dim">
          <div className="k-card k-end">
            <p className="k-end-k">SON</p>
            <h2>{result.title}</h2>
            <div className="k-stats">
              <Stat k="Kaos puanı" v={result.chaos} big />
              <Stat k="Halay isabeti" v={`%${result.halay}`} big />
              <Stat k="Süre" v={fmt(result.time)} />
              <Stat k="Devrilen köylü" v={result.villagers} />
              <Stat k="Kırılan çömlek" v={result.pots} />
              <Stat k="Düşen karpuz" v={result.melons} />
              <Stat k="Yakalanma" v={result.caught} />
              <Stat k="En uzun kombo" v={result.maxCombo} />
            </div>
            {result.best && result.chaos > result.best.chaos && <p className="k-record">Yeni rekor!</p>}
            <div className="k-menu row">
              <button className="k-btn big" onClick={() => location.reload()}>Tekrar oyna</button>
              <a className="k-btn ghost" href="/">← Oyun Salonu</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v, big }) {
  return (
    <div className={'k-stat' + (big ? ' big' : '')}>
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

function Controls({ onBack }) {
  const list = IS_TOUCH ? TOUCH_CONTROLS : CONTROLS;
  return (
    <div className="k-panel">
      <h3>Kontroller</h3>
      <dl className="k-keys">
        {list.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="k-tip">Finalde: davulun vuruşlarında {IS_TOUCH ? 'ZIPLA butonuna bas' : 'Boşluk veya sol tık'}.</p>
      <button className="k-btn" onClick={onBack}>Geri</button>
    </div>
  );
}

function Settings({ s, save, onBack }) {
  return (
    <div className="k-panel">
      <h3>Ayarlar</h3>
      <label className="k-row">
        <span>Ses</span>
        <input type="range" min="0" max="1" step="0.05" value={s.vol} onChange={(e) => save({ ...s, vol: +e.target.value })} />
      </label>
      <label className="k-row">
        <span>Kamera hassasiyeti</span>
        <input type="range" min="0.3" max="2.5" step="0.1" value={s.sens} onChange={(e) => save({ ...s, sens: +e.target.value })} />
      </label>
      <label className="k-row">
        <span>Sesli diyalog (tarayıcının Türkçe sesi)</span>
        <input type="checkbox" checked={s.voice} onChange={(e) => save({ ...s, voice: e.target.checked })} />
      </label>
      <label className="k-row">
        <span>Düşük grafik (pil dostu)</span>
        <input type="checkbox" checked={s.low} onChange={(e) => save({ ...s, low: e.target.checked })} />
      </label>
      <button className="k-btn" onClick={onBack}>Geri</button>
    </div>
  );
}

// Ritim şeridi: notalar sağdan gelir, daireye geldiğinde bas
function HalayLane({ game, touch }) {
  const cv = useRef(null);
  const [info, setInfo] = useState({ combo: 0, judge: null, hits: 0, total: 0 });
  useEffect(() => {
    let raf;
    let last = '';
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const v = game && game.halayView();
      const c = cv.current;
      if (!c || !v) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== W * dpr) {
        c.width = W * dpr;
        c.height = H * dpr;
      }
      const x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, W, H);
      const hx = 56, cy = H / 2, pxPerSec = (W - hx - 20) / 2.2;
      // vuruş çizgileri
      x.strokeStyle = 'rgba(255,255,255,0.15)';
      x.lineWidth = 2;
      const phase = ((v.t % v.beat) + v.beat) % v.beat;
      for (let k = 0; k < 6; k++) {
        const px = hx + (k * v.beat - phase) * pxPerSec;
        if (px < hx - 10) continue;
        x.beginPath();
        x.moveTo(px, 10);
        x.lineTo(px, H - 10);
        x.stroke();
      }
      // vuruş dairesi
      const pulse = 1 + Math.max(0, 1 - phase / 0.15) * 0.15;
      x.lineWidth = 5;
      x.strokeStyle = '#ffe36a';
      x.beginPath();
      x.arc(hx, cy, 24 * pulse, 0, Math.PI * 2);
      x.stroke();
      // notalar (davul)
      for (const n of v.notes) {
        const px = hx + n * pxPerSec;
        x.fillStyle = '#ff5a4a';
        x.strokeStyle = '#1a1020';
        x.lineWidth = 4;
        x.beginPath();
        x.arc(px, cy, 17, 0, Math.PI * 2);
        x.fill();
        x.stroke();
        x.fillStyle = '#fff3d6';
        x.beginPath();
        x.arc(px, cy, 8, 0, Math.PI * 2);
        x.fill();
      }
      const key = `${v.combo}|${v.judge}|${v.hits}`;
      if (key !== last) {
        last = key;
        setInfo({ combo: v.combo, judge: v.judge, hits: v.hits, total: v.total });
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [game]);
  return (
    <div className="k-halay">
      <div className="k-halay-top">
        <span>HALAY</span>
        <span className={'k-judge ' + (info.judge === 'Mükemmel!' ? 'p' : info.judge === 'İyi' ? 'g' : 'm')}>{info.judge || ''}</span>
        <span>{info.combo > 1 ? `${info.combo} kombo` : ''}</span>
      </div>
      <canvas ref={cv} className="k-lane" />
      {touch ? (
        <button className="k-hitbtn" onPointerDown={(e) => { e.preventDefault(); game.pressKey('Space'); }}>ZIPLA</button>
      ) : (
        <p className="k-halay-hint">Kırmızı davul daireye gelince <kbd>Boşluk</kbd> ya da sol tık</p>
      )}
    </div>
  );
}
