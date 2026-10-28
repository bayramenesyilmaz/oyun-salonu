import { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './game/Game.js';
import { INTRO, ENDING } from './game/story.js';
import TouchControls from './TouchControls.jsx';
import { narrator } from './game/narrator.js';

// Dokunmatik cihaz mı? (?touch / ?mouse ile zorlanabilir)
const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  const q = location.search;
  if (/[?&]touch\b/.test(q)) return true;
  if (/[?&]mouse\b/.test(q)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();

const TOUCH_CONTROLS = [
  ['Sol taraf', 'Sürükle: yürü'],
  ['Sağ taraf', 'Sürükle: etrafa bak'],
  ['E', 'Etkileşim / saklan'],
  ['Koş', 'Basılı tut'],
  ['Çömel', 'Aç / kapat'],
  ['❚❚', 'Duraklat'],
];

const CONTROLS = [
  ['W A S D', 'Yürü'],
  ['Fare', 'Etrafa bak'],
  ['Shift', 'Koş (gürültülü)'],
  ['C / Ctrl', 'Çömel (sessiz)'],
  ['E', 'Etkileşim / saklan'],
  ['F', 'Fener aç / kapat'],
  ['J', 'Günlük'],
  ['Esc', 'Duraklat'],
];

// Samanın içinden bakış için rastgele saman çöpleri (bir kez çizilir)
let STRAW_URL = null;
function strawImage() {
  if (STRAW_URL) return STRAW_URL;
  const W = 960, H = 540;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  for (let i = 0; i < 300; i++) {
    // kenarlara yakın yoğun, ortada seyrek
    let px = Math.random() * W, py = Math.random() * H;
    const dx = (px - W / 2) / (W * 0.36), dy = (py - H * 0.46) / (H * 0.3);
    if (dx * dx + dy * dy < 1 && Math.random() < 0.9) continue;
    const len = 60 + Math.random() * 260, a = Math.random() * Math.PI;
    const v = 50 + Math.random() * 90;
    x.strokeStyle = `rgba(${v + 30},${v + 8},${v * 0.35},${0.3 + Math.random() * 0.45})`;
    x.lineWidth = 1 + Math.random() * 3.5;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a) * len * 0.5 + (Math.random() - 0.5) * 30, py + Math.sin(a) * len * 0.5 + (Math.random() - 0.5) * 30, px + Math.cos(a) * len, py + Math.sin(a) * len);
    x.stroke();
  }
  STRAW_URL = c.toDataURL('image/png');
  return STRAW_URL;
}

function loadSettings() {
  try {
    return { sens: 1, vol: 0.8, low: IS_TOUCH, narr: true, voice: '', ...JSON.parse(localStorage.getItem('karakuyu-settings') || '{}') };
  } catch {
    return { sens: 1, vol: 0.8, low: IS_TOUCH, narr: true, voice: '' };
  }
}

export default function App() {
  const mount = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [prompt, setPrompt] = useState(null);
  const [objective, setObjective] = useState('');
  const [objKey, setObjKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [hud, setHud] = useState({ stamina: 1, lantern: true, hidden: false, fear: 0 });
  const [note, setNote] = useState(null);
  const [journal, setJournal] = useState(null);
  const [death, setDeath] = useState(null);
  const [introStep, setIntroStep] = useState(0);
  const [endStep, setEndStep] = useState(0);
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockFailed, setLockFailed] = useState(false);
  const isTouch = IS_TOUCH;
  const [portrait, setPortrait] = useState(false);
  const [portraitOk, setPortraitOk] = useState(false);
  const [, setVoiceTick] = useState(0);
  const [hasSave, setHasSave] = useState(() => Game.hasSave());
  // PWA: "uygulama olarak yükle"
  const [installEvt, setInstallEvt] = useState(null);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone);
  useEffect(() => {
    const f = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', f);
    window.addEventListener('appinstalled', () => setInstallEvt(null));
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);
  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* yok say */ }
    setInstallEvt(null);
  };
  useEffect(() => narrator.onChange(() => setVoiceTick((t) => t + 1)), []);
  useEffect(() => {
    if (!isTouch) return;
    const upd = () => setPortrait(window.innerHeight > window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [isTouch]);

  const onUI = useCallback((type, data) => {
    switch (type) {
      case 'phase': setPhase(data); break;
      case 'prompt': setPrompt(data); break;
      case 'objective': setObjective(data); setObjKey((k) => k + 1); break;
      case 'toast':
        setToasts((ts) => [...ts.slice(-2), data]);
        setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== data.id)), data.ms);
        break;
      case 'hud': setHud(data); break;
      case 'note': setNote(data); break;
      case 'journal': setJournal(data); break;
      case 'death': setDeath(data); break;
      case 'hidden': break;
      case 'lock': setLocked(data); break;
      case 'lockFailed': setLockFailed(true); break;
      default: break;
    }
  }, []);

  useEffect(() => {
    let g;
    // önce yükleme ekranı çizilsin
    const id = setTimeout(() => {
      try {
        g = new Game(mount.current, onUI, { quality: settings.low ? 'low' : 'high', touch: isTouch });
        game.current = g;
        g.setSensitivity(settings.sens);
        g.setVolume(settings.vol);
        setPhase('menu');
      } catch (e) {
        console.error(e);
        setPhase('error');
      }
    }, 60);
    return () => {
      clearTimeout(id);
      g && g.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem('karakuyu-settings', JSON.stringify(settings)); } catch { /* yok say */ }
    const g = game.current;
    if (!g) return;
    g.setSensitivity(settings.sens);
    g.setVolume(settings.vol);
    narrator.enabled = settings.narr;
    if (settings.voice) narrator.setVoiceByName(settings.voice);
    if (!settings.narr) narrator.stop();
    const q = settings.low ? 'low' : 'high';
    if (g.quality !== q) {
      g.quality = q;
      g.moon.castShadow = !settings.low;
      g.resize();
    }
  }, [settings]);

  // Giriş metni ve son ekranı: boşluk/tık ile ilerle
  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'intro' && (e.code === 'Space' || e.code === 'Enter')) advanceIntro();
      if (phase === 'dead' && (e.code === 'Space' || e.code === 'Enter')) retry();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Son: her satır seslendirilir; ses yoksa zamanlayıcıyla ilerler
  useEffect(() => {
    if (phase !== 'ending') return;
    setEndStep(0);
    let alive = true;
    const timers = [];
    const show = (i) => {
      if (!alive) return;
      setEndStep(i);
      if (i > ENDING.length) return;
      if (narrator.enabled && narrator.voice) {
        narrator.say(ENDING[i - 1], { pitch: 0.8, rate: 0.9, onEnd: () => timers.push(setTimeout(() => show(i + 1), 900)) });
      } else timers.push(setTimeout(() => show(i + 1), 3200));
    };
    timers.push(setTimeout(() => show(1), 1500));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [phase]);

  // Giriş metni seslendirilir, bitince kendiliğinden sonraki satıra geçer
  useEffect(() => {
    if (phase !== 'intro') return;
    let t;
    const last = introStep >= INTRO.length - 1;
    narrator.say(INTRO[introStep], {
      pitch: introStep === 2 ? 0.7 : 0.85,
      rate: 0.9,
      onEnd: () => {
        if (!last && narrator.enabled && narrator.voice) t = setTimeout(() => setIntroStep((s) => (s === introStep ? s + 1 : s)), 1100);
      },
    });
    return () => clearTimeout(t);
  }, [phase, introStep]);

  // Ölüm cümlesi
  useEffect(() => {
    if (phase === 'dead' && death) {
      const t = setTimeout(() => narrator.say(death.line, { pitch: 0.55, rate: 0.82 }), 400);
      return () => clearTimeout(t);
    }
  }, [phase, death]);

  useEffect(() => {
    if (phase === 'menu' || phase === 'paused') setHasSave(Game.hasSave());
  }, [phase]);

  const goFullscreen = () => {
    if (isTouch) {
      // mobilde tam ekran + yatay mod (destekleniyorsa)
      const el = document.documentElement;
      const fs = el.requestFullscreen || el.webkitRequestFullscreen;
      try {
        const r = fs && fs.call(el);
        const lock = () => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {});
        if (r && r.then) r.then(lock).catch(() => {});
        else lock();
      } catch { /* desteklenmiyor */ }
    }
  };
  const start = () => {
    goFullscreen();
    game.current.clearSave();
    setIntroStep(0);
    game.current.start();
  };
  const continueGame = () => {
    goFullscreen();
    game.current.continueSaved();
  };
  const advanceIntro = () => {
    if (introStep < INTRO.length - 1) setIntroStep((s) => s + 1);
    else {
      narrator.stop();
      game.current.beginPlay();
    }
  };
  const retry = () => {
    narrator.stop();
    setDeath(null);
    game.current.restoreCheckpoint();
  };
  const restartAll = () => {
    setDeath(null);
    game.current.restart();
  };

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const SettingsPanel = (
    <div className="settings">
      <label>
        <span>{isTouch ? 'Bakış hassasiyeti' : 'Fare hassasiyeti'}</span>
        <input type="range" min="0.3" max="2.5" step="0.05" value={settings.sens} onChange={(e) => set('sens', +e.target.value)} />
      </label>
      <label>
        <span>Ses</span>
        <input type="range" min="0" max="1" step="0.05" value={settings.vol} onChange={(e) => set('vol', +e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={settings.narr} onChange={(e) => set('narr', e.target.checked)} disabled={!narrator.hasTurkish} />
        <span>Sesli anlatım (Türkçe)</span>
      </label>
      {!narrator.supported || !narrator.hasTurkish ? (
        <p className="muted small-note">Bu cihazda Türkçe okuma sesi bulunamadı. Metinler yazılı olarak gösterilir.</p>
      ) : (
        settings.narr &&
        narrator.voices.length > 1 && (
          <label>
            <span>Anlatıcı sesi</span>
            <select value={narrator.voice ? narrator.voice.name : ''} onChange={(e) => { set('voice', e.target.value); narrator.setVoiceByName(e.target.value); narrator.say('Karakuyu. Ne duyarsan duy, arkana bakma.'); }}>
              {narrator.voices.map((v) => <option key={v.name} value={v.name}>{v.name.replace(/Microsoft |Google /, '').slice(0, 28)}</option>)}
            </select>
          </label>
        )
      )}
      <label className="check">
        <input type="checkbox" checked={settings.low} onChange={(e) => set('low', e.target.checked)} />
        <span>Düşük grafik {isTouch ? '(telefonda önerilir)' : '(zayıf bilgisayarlar için)'}</span>
      </label>
    </div>
  );

  const Controls = (
    <div className="controls">
      {(isTouch ? TOUCH_CONTROLS : CONTROLS).map(([k, v]) => (
        <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
      ))}
    </div>
  );

  const playing = phase === 'playing';

  return (
    <div className={'app' + (isTouch ? ' is-touch' : '')}>
      <div ref={mount} className="stage" />

      {phase === 'loading' && (
        <div className="screen center"><p className="loading">Köy yükleniyor…</p></div>
      )}
      {phase === 'error' && (
        <div className="screen center">
          <p className="loading">Tarayıcın WebGL'i başlatamadı. Chrome veya Edge'in güncel sürümünü dene.</p>
        </div>
      )}

      {phase === 'menu' && (
        <div className="screen menu">
          <div className="menu-inner">
            <h1>KARAKUYU</h1>
            <p className="tag">Bir Anadolu korku hikâyesi</p>
            {hasSave && <button className="primary" onClick={continueGame}>Devam et</button>}
            <button className={hasSave ? 'ghost' : 'primary'} onClick={start}>{hasSave ? 'Yeni oyun' : 'Başla'}</button>
            <button className="ghost" onClick={() => setShowSettings((s) => !s)}>{showSettings ? 'Ayarları gizle' : 'Ayarlar'}</button>
            {showSettings && SettingsPanel}
            {installEvt && <button className="ghost" onClick={install}>Uygulama olarak yükle</button>}
            <a className="ghost back-link" href="/">← Oyun Salonu</a>
            {!installEvt && isIOS && !standalone && <p className="hint">Uygulama gibi oynamak için: Paylaş → Ana Ekrana Ekle</p>}
            {Controls}
            <p className="hint">{isTouch ? 'Telefonu yan çevir, kulaklık tak.' : 'Kulaklıkla, karanlık bir odada oyna.'} Yaklaşık 20 dakika.</p>
          </div>
        </div>
      )}

      {phase === 'intro' && (
        <div className="screen intro" onClick={advanceIntro}>
          <p key={introStep} className="intro-line">{INTRO[introStep]}</p>
          <p className="intro-hint">{introStep < INTRO.length - 1 ? 'devam' : 'köye yürü'} — {isTouch ? 'dokun' : 'tıkla'}</p>
        </div>
      )}

      {(playing || phase === 'note' || phase === 'journal') && (
        <div className="hud">
          <div key={objKey} className="objective">{objective}</div>
          {playing && <div className={'crosshair' + (prompt ? ' active' : '')} />}
          {playing && prompt && (
            <div className="prompt">{!isTouch && <kbd>E</kbd>} {prompt}</div>
          )}
          <div className="toasts">
            {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
          </div>
          <div className="status">
            <span className={'lamp' + (hud.lantern ? ' on' : '')} title="Fener (F)" />
            {hud.crouch && <span className="tagchip">çömelmiş</span>}
            {hud.chase && <span className="tagchip red">kovalanıyorsun</span>}
          </div>
          {hud.stamina < 0.99 && (
            <div className={'stamina' + (hud.exhausted ? ' tired' : '')}>
              <div style={{ width: `${hud.stamina * 100}%` }} />
            </div>
          )}
          {playing && !locked && !isTouch && (
            <div className="click-hint">{lockFailed ? 'Etrafa bakmak için fareyi basılı tutup sürükle' : 'Fareyi kilitlemek için ekrana tıkla'}</div>
          )}
          {hud.hidden && (
            <div className={'hidden-overlay ' + (hud.hideKind || '')}>
              {hud.hideKind === 'saman' && <div className="straw" style={{ backgroundImage: `url(${strawImage()})` }} />}
              <span>Saklanıyorsun — nefesini tut</span>
            </div>
          )}
        </div>
      )}

      {isTouch && playing && game.current && <TouchControls game={game.current} prompt={prompt} hud={hud} />}

      {isTouch && portrait && !portraitOk && phase !== 'loading' && (
        <div className="rotate-hint" onClick={() => setPortraitOk(true)}>
          <div className="phone-icon" />
          <p>Daha iyi oynamak için telefonu yan çevir</p>
          <p className="intro-hint" style={{ position: 'static' }}>veya dikey devam etmek için dokun</p>
        </div>
      )}

      {phase === 'note' && note && (
        <div className="screen dim" onClick={() => game.current.closeNote()}>
          <div className="paper" onClick={(e) => e.stopPropagation()}>
            <h3>{note.title}</h3>
            <div className="hand">{note.text}</div>
            <button className="ghost small" onClick={() => game.current.closeNote()}>Kapat{isTouch ? '' : ' (E)'}</button>
          </div>
        </div>
      )}

      {phase === 'journal' && journal && (
        <div className="screen dim">
          <div className="journal">
            <h2>Günlük</h2>
            {journal.pages.length === 0 && <p className="muted">Henüz sayfa bulmadın.</p>}
            {journal.pages.map((p) => (
              <details key={p.id}>
                <summary>{p.title}</summary>
                <div className="hand small">{p.text}</div>
              </details>
            ))}
            <h4>Eşyalar</h4>
            <p className="muted">{journal.key ? 'Muhtarın evinin anahtarı' : '—'} · Gaz lambası</p>
            <h4>Kuyu taşları</h4>
            <ul className="dials">
              {journal.dials.map((d) => <li key={d.label}><span>{d.label}</span><b>{d.motif}</b></li>)}
            </ul>
            <button className="ghost small" onClick={() => game.current.closeJournal()}>Kapat{isTouch ? '' : ' (J)'}</button>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="screen menu">
          <div className="menu-inner">
            <h2>Duraklatıldı</h2>
            <button className="primary" onClick={() => game.current.resume()}>Devam et</button>
            {SettingsPanel}
            {Controls}
            <button className="ghost" onClick={restartAll}>Baştan başla</button>
          </div>
        </div>
      )}

      {phase === 'dead' && death && (
        <div className="screen death">
          <p className="death-line">{death.line}</p>
          <button className="primary wide" onClick={retry}>Devam et</button>
          <p className="muted">Son kayıt noktasından başlarsın.</p>
          {!isTouch && <p className="intro-hint">veya Boşluk</p>}
        </div>
      )}

      {phase === 'ending' && (
        <div className="screen ending">
          {ENDING.map((l, i) => (
            <p key={i} className={'end-line' + (i < endStep ? ' show' : '')}>{l}</p>
          ))}
          {endStep > ENDING.length && (
            <div className="credits">
              <h1>KARAKUYU</h1>
              <p className="muted">Bütün modeller, dokular ve sesler kodla üretildi.</p>
              <button className="ghost" onClick={restartAll}>Tekrar oyna</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
