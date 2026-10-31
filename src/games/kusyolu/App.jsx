import { useEffect, useRef, useState } from 'react';
import { Game, loadSave } from './game/Game.js';
import { CHAPTERS } from './game/story.js';
import './kusyolu.css';

const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  if (/[?&]touch\b/.test(location.search)) return true;
  if (/[?&]mouse\b/.test(location.search)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();
const TEST = /[?&]test\b/.test(typeof location !== 'undefined' ? location.search : '');

function loadSettings() {
  try {
    return { vol: 0.85, sens: 1, ...JSON.parse(localStorage.getItem('kusyolu-settings') || '{}') };
  } catch {
    return { vol: 0.85, sens: 1 };
  }
}

export default function App() {
  const mount = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('menu');
  const [load, setLoad] = useState({ p: 0, label: '' });
  const [sub, setSub] = useState(null);
  const [obj, setObj] = useState('');
  const [prompt, setPrompt] = useState(null);
  const [card, setCard] = useState(null);
  const [fade, setFade] = useState(0);
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [save, setSave] = useState(() => loadSave());
  const [choice, setChoice] = useState(null);
  const [msg, setMsg] = useState(null);
  const [hint, setHint] = useState(null);
  const [stealth, setStealth] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [hideable, setHideable] = useState(false);
  const [carry, setCarry] = useState(null);
  const [white, setWhite] = useState(0);

  useEffect(() => {
    let g;
    const emit = (type, d) => {
      if (type === 'phase') setPhase(d);
      else if (type === 'loading') setLoad(d);
      else if (type === 'subtitle') setSub(d);
      else if (type === 'objective') setObj(d);
      else if (type === 'prompt') setPrompt(d);
      else if (type === 'fade') setFade(d);
      else if (type === 'lock') setLocked(d);
      else if (type === 'error') setErr(d);
      else if (type === 'card') {
        setCard(d);
        if (d && d.end) document.exitPointerLock?.();
        if (d && !d.end) setTimeout(() => setCard((c) => (c === d ? null : c)), 3800);
      } else if (type === 'choice') {
        setChoice(d);
        if (d) document.exitPointerLock?.();
      } else if (type === 'message') {
        setMsg(d);
        if (d) setTimeout(() => setMsg((m) => (m === d ? null : m)), 7000);
      } else if (type === 'hint') {
        setHint(d);
        if (d) setTimeout(() => setHint((h) => (h === d ? null : h)), 5000);
      } else if (type === 'stealth') setStealth(d);
      else if (type === 'hidden') setHidden(d);
      else if (type === 'hideable') setHideable(d);
      else if (type === 'carry') setCarry(d);
      else if (type === 'whiteflash') setWhite(d);
      else if (type === 'saved') setSave(d);
    };
    try {
      g = game.current = new Game(mount.current, emit, { touch: IS_TOUCH, test: TEST, low: IS_TOUCH || /[?&]low\b/.test(location.search) });
      g.audio.setVolume(settings.vol);
    } catch (e) {
      console.error(e);
      setErr('Bu cihazda 3B grafik başlatılamadı: ' + (e && e.message));
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
      localStorage.setItem('kusyolu-settings', JSON.stringify(settings));
    } catch {}
    game.current && game.current.audio.setVolume(settings.vol);
  }, [settings]);

  const lock = () => {
    if (!IS_TOUCH) game.current?.renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
  };
  const pick = (id) => {
    game.current.choose(id);
    lock();
  };
  useEffect(() => {
    if (!choice) return;
    const k = (e) => {
      const i = +e.key - 1;
      if (choice.options[i]) pick(choice.options[i].id);
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [choice]);
  const goNext = (n) => {
    setCard(null);
    game.current.nextChapter(n).catch((e) => {
      console.error(e);
      setErr('Sahne yüklenemedi. Bağlantını kontrol edip sayfayı yenile.');
    });
    lock();
  };
  const start = (n = 1) => {
    const g = game.current;
    if (!g) return;
    g.audio.init();
    g.start(n).catch((e) => {
      console.error(e);
      setErr('Sahne yüklenemedi. Bağlantını kontrol edip sayfayı yenile.');
    });
    if (!IS_TOUCH) g.renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
  };

  // ---- dokunmatik denetimler ----
  const joy = useRef({ id: null, x0: 0, y0: 0, x: 0, y: 0 });
  const lookT = useRef({ id: null, x: 0, y: 0 });
  const [stick, setStick] = useState(null);
  const onJoyStart = (e) => {
    const t = e.changedTouches[0];
    joy.current = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: 0, y: 0 };
    setStick({ x0: t.clientX, y0: t.clientY, x: 0, y: 0 });
  };
  const onJoyMove = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joy.current.id) continue;
      let dx = (t.clientX - joy.current.x0) / 55, dy = (t.clientY - joy.current.y0) / 55;
      const l = Math.hypot(dx, dy);
      if (l > 1) {
        dx /= l;
        dy /= l;
      }
      game.current.setMove(dx, -dy, l > 1.6);
      setStick((s) => s && { ...s, x: dx, y: dy });
    }
  };
  const onJoyEnd = (e) => {
    for (const t of e.changedTouches)
      if (t.identifier === joy.current.id) {
        joy.current.id = null;
        game.current.setMove(0, 0, false);
        setStick(null);
      }
  };
  const onLookStart = (e) => {
    const t = e.changedTouches[0];
    lookT.current = { id: t.identifier, x: t.clientX, y: t.clientY, moved: 0 };
  };
  const onLookMove = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== lookT.current.id) continue;
      const dx = t.clientX - lookT.current.x, dy = t.clientY - lookT.current.y;
      lookT.current.x = t.clientX;
      lookT.current.y = t.clientY;
      lookT.current.moved += Math.abs(dx) + Math.abs(dy);
      game.current.lookDelta(dx * settings.sens * 0.9, dy * settings.sens * 0.9);
    }
  };

  const playing = phase === 'play';
  return (
    <div className={'ky-root' + (IS_TOUCH ? ' touch' : '')}>
      <div ref={mount} className="ky-stage" />
      {playing && <div className={'ky-cross' + (prompt ? ' on' : '')} />}
      {playing && prompt && (
        <div className="ky-prompt">
          {IS_TOUCH ? (
            <button className="ky-act" onClick={() => game.current.onInteract()}>
              {prompt}
            </button>
          ) : (
            <span>
              <kbd>E</kbd> {prompt}
            </span>
          )}
        </div>
      )}
      {playing && obj && <div className="ky-obj">{obj}</div>}
      {playing && carry && <div className="ky-carry">Elinde: {carry}</div>}
      {playing && stealth && (
        <div className={'ky-stealth' + (stealth.sus > 0.66 ? ' hot' : stealth.sus > 0.05 ? ' warm' : '')}>
          <span>{stealth.hidden ? 'Taş saklı' : 'Taş görünüyor'}{stealth.lit ? ' · ışıktasın' : ''}</span>
          <div className="bar">
            <i style={{ width: `${Math.round(Math.min(1, stealth.sus) * 100)}%` }} />
          </div>
        </div>
      )}
      {playing && hideable && (IS_TOUCH ? (
        <button className={'ky-hide' + (hidden ? ' on' : '')} onClick={() => game.current.toggleHide()}>
          {hidden ? 'Taşı çıkar' : 'Taşı sakla'}
        </button>
      ) : (
        <div className="ky-hidekey"><kbd>Q</kbd> {hidden ? 'taşı çıkar' : 'taşı sakla'}</div>
      ))}
      {msg && (
        <div className="ky-msg" key={msg.t}>
          <b>{msg.from}</b>
          <span>{msg.t}</span>
        </div>
      )}
      {hint && <div className="ky-hint" key={hint}>{hint}</div>}
      {choice && (
        <div className="ky-choice">
          <p>{choice.prompt}</p>
          {choice.options.map((o, i) => (
            <button key={o.id} className="ky-btn" onClick={() => pick(o.id)}>
              {!IS_TOUCH && <kbd>{i + 1}</kbd>} {o.text}
            </button>
          ))}
        </div>
      )}
      {sub && (
        <div className="ky-sub" key={sub.text}>
          {sub.who && <b style={{ color: sub.color }}>{sub.who}</b>}
          <span>{sub.text}</span>
        </div>
      )}
      {card && (
        <div className={'ky-card' + (card.end ? ' end' : '')}>
          <h2>{card.title}</h2>
          {card.sub && <p>{card.sub}</p>}
          {card.end && (
            <div className="row">
              {card.next ? (
                <button className="ky-btn" onClick={() => goNext(card.next)}>
                  Sonraki bölüm
                </button>
              ) : (
                <button className="ky-btn" onClick={() => location.reload()}>
                  Menüye dön
                </button>
              )}
              <a className="ky-btn ghost" href="/">
                Oyun salonu
              </a>
            </div>
          )}
        </div>
      )}
      {IS_TOUCH && playing && (
        <>
          <div className="ky-joyzone" onTouchStart={onJoyStart} onTouchMove={onJoyMove} onTouchEnd={onJoyEnd} onTouchCancel={onJoyEnd} />
          <div className="ky-lookzone" onTouchStart={onLookStart} onTouchMove={onLookMove} />
          {stick && (
            <div className="ky-stick" style={{ left: stick.x0, top: stick.y0 }}>
              <i style={{ transform: `translate(${stick.x * 40}px, ${stick.y * 40}px)` }} />
            </div>
          )}
        </>
      )}
      {phase === 'loading' && (
        <div className="ky-load">
          <div className="bar">
            <i style={{ width: `${Math.round(load.p * 100)}%` }} />
          </div>
          <span>{load.label || 'Yükleniyor'}…</span>
        </div>
      )}
      {phase === 'menu' && (
        <div className="ky-menu">
          <div className="inner">
            <div className="kicker">Beş bölüm · Dünya’dan kalkış</div>
            <h1>KUŞYOLU</h1>
            <p>Kızılkaya Mahallesi'nde bir yaz gecesi. Beş arkadaş çatıda çay içerken gökyüzü yarılıyor.</p>
            <button className="ky-btn big" onClick={() => start(Math.min(save.max, CHAPTERS.length))}>
              {save.max > 1 ? 'Devam et' : 'Başla'}
            </button>
            <div className="ky-chapters">
              {CHAPTERS.map((c) => (
                <button key={c.n} className="ch" disabled={c.n > save.max} onClick={() => start(c.n)} title={c.sub}>
                  <i>{c.n}</i>
                  <span>{c.n > save.max ? 'Kilitli' : c.title}</span>
                </button>
              ))}
            </div>
            <div className="help">
              {IS_TOUCH ? (
                <span>Sol başparmak: yürü · sağ: bak · düğmeye dokun: etkileşim</span>
              ) : (
                <span>
                  <kbd>W A S D</kbd> yürü · <kbd>Shift</kbd> koş · fare: bak · <kbd>E</kbd> etkileşim · <kbd>Q</kbd> taşı sakla · <kbd>Boşluk</kbd> konuşmayı geç
                </span>
              )}
            </div>
            <label className="vol">
              Ses
              <input type="range" min="0" max="1" step="0.05" value={settings.vol} onChange={(e) => setSettings((s) => ({ ...s, vol: +e.target.value }))} />
            </label>
            <div className="small">Kulaklık önerilir. Kişiler, yerler ve olaylar kurgudur.</div>
            <div className="links">
              <a className="home" href="/">
                ← Oyun salonu
              </a>
              <a className="home" href="/kusyolu/KAYNAKLAR.txt" target="_blank" rel="noreferrer">
                Kaynaklar ve lisanslar
              </a>
            </div>
          </div>
        </div>
      )}
      {playing && !IS_TOUCH && !locked && !card?.end && !choice && (
        <div className="ky-pause" onClick={() => game.current.renderer.domElement.requestPointerLock?.()?.catch?.(() => {})}>
          <div>
            <b>Duraklatıldı</b>
            <span>Devam etmek için tıkla</span>
          </div>
        </div>
      )}
      <div className="ky-fade" style={{ opacity: fade }} />
      <div className="ky-white" style={{ opacity: white }} />
      {err && <div className="ky-err">{err}</div>}
    </div>
  );
}
