import { useCallback, useEffect, useRef, useState } from 'react';
import './ui.css';
import { Game } from './game/Game.js';
import { preloadAll } from '@engine/assets.js';
import { loadSave, updateSave } from './game/save.js';
import { LEVELS } from './game/levels/index.js';
import { HUD } from './ui/HUD.jsx';
import TouchControls from './ui/TouchControls.jsx';
import { MainMenu, LevelSelect, Briefing, Results, SettingsPanel, Controls } from './ui/Screens.jsx';

// Dokunmatik cihaz mı? (?touch / ?mouse ile zorlanabilir)
const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  if (/[?&]touch\b/.test(location.search)) return true;
  if (/[?&]mouse\b/.test(location.search)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();

export default function App() {
  const mount = useRef(null);
  const game = useRef(null);
  const [save, setSave] = useState(loadSave);
  const [phase, setPhase] = useState('loading');
  const [menuPage, setMenuPage] = useState('main');
  const [brief, setBrief] = useState(null);
  const [hud, setHud] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [subtitle, setSubtitle] = useState(null);
  const [hints, setHints] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [hitmarker, setHitmarker] = useState(null);
  const [damages, setDamages] = useState([]);
  const [banner, setBanner] = useState(null);
  const [progress, setProgress] = useState(null);
  const [doc, setDoc] = useState(null);
  const [results, setResults] = useState(null);
  const [locked, setLocked] = useState(false);
  const [loadMsg, setLoadMsg] = useState('Varlıklar hazırlanıyor…');
  const [voiceOk, setVoiceOk] = useState(true);
  const settings = save.settings;
  const [portrait, setPortrait] = useState(false);
  const [portraitOk, setPortraitOk] = useState(false);
  const [installEvt, setInstallEvt] = useState(null);
  useEffect(() => {
    const upd = () => setPortrait(window.innerHeight > window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    const bip = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', bip);
    window.addEventListener('appinstalled', () => setInstallEvt(null));
    return () => {
      window.removeEventListener('resize', upd);
      window.removeEventListener('beforeinstallprompt', bip);
    };
  }, []);
  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* yok say */ }
    setInstallEvt(null);
  };

  const temp = (setter, item, ms) => {
    setter((xs) => [...xs.slice(-3), item]);
    setTimeout(() => setter((xs) => xs.filter((x) => x !== item)), ms);
  };

  const onUI = useCallback((type, data) => {
    switch (type) {
      case 'phase':
        setPhase(data);
        break;
      case 'hud':
        setHud(data);
        break;
      case 'objectives':
        setObjectives(data);
        break;
      case 'subtitle':
        setSubtitle(data);
        break;
      case 'hint':
        temp(setHints, data, data.ms);
        break;
      case 'toast':
        temp(setToasts, data, 3200);
        break;
      case 'hitmarker':
        setHitmarker(data);
        setTimeout(() => setHitmarker((h) => (h === data ? null : h)), 220);
        break;
      case 'damage':
        temp(setDamages, data, 900);
        break;
      case 'banner': {
        const b = { text: data, id: Math.random() };
        setBanner(b);
        setTimeout(() => setBanner((x) => (x === b ? null : x)), 1800);
        break;
      }
      case 'progress': {
        const p = { ...data, id: Math.random() };
        setProgress(p);
        setTimeout(() => setProgress((x) => (x === p ? null : x)), data.dur * 1000);
        break;
      }
      case 'document':
        setDoc(data);
        break;
      case 'results':
        setResults(data);
        setSave(loadSave());
        break;
      case 'lock':
        setLocked(data);
        break;
      default:
        break;
    }
  }, []);

  // Oyunu kur: önce isteğe bağlı GLB modelleri dene (yoksa yerleşik modeller)
  useEffect(() => {
    let g, alive = true;
    (async () => {
      const models = await preloadAll(location.protocol === 'file:' ? 50 : 3500);
      const found = Object.entries(models).filter(([, v]) => v).map(([k]) => k);
      if (!alive) return;
      setLoadMsg(found.length ? `Model bulundu: ${found.join(', ')}` : 'Vadi kuruluyor…');
      await new Promise((r) => setTimeout(r, 30));
      try {
        const st = loadSave();
        if (IS_TOUCH && !st.settings._touchInit) {
          // telefonda ilk açılışta düşük grafik
          updateSave((d) => {
            d.settings.quality = 'low';
            d.settings._touchInit = true;
          });
          setSave(loadSave());
        }
        g = new Game(mount.current, onUI, { settings: loadSave().settings, models, touch: IS_TOUCH });
        game.current = g;
        setPhase('menu');
        setTimeout(() => setVoiceOk(g.voice.hasVoice), 1500);
      } catch (e) {
        console.error(e);
        setLoadMsg('WebGL başlatılamadı. Güncel Chrome, Edge veya Firefox ile dene.');
        setPhase('error');
      }
    })();
    return () => {
      alive = false;
      g && g.dispose();
    };
  }, [onUI]);

  const setSetting = (k, v) => {
    const d = updateSave((s) => (s.settings[k] = v));
    setSave(d);
    game.current && game.current.applySettings(d.settings);
  };

  const goFullscreen = () => {
    if (!IS_TOUCH) return;
    const el = document.documentElement;
    const fs = el.requestFullscreen || el.webkitRequestFullscreen;
    try {
      const r = fs && fs.call(el);
      const lock = () => screen.orientation?.lock?.('landscape').catch(() => {});
      if (r && r.then) r.then(lock).catch(() => {});
      else lock();
    } catch {
      /* desteklenmiyor */
    }
  };
  const startLevel = (resume) => {
    goFullscreen();
    const g = game.current;
    setResults(null);
    setDoc(null);
    if (resume && save.resume) g.startLevel(save.resume.snap);
    else g.startLevel();
  };

  const L = LEVELS;
  const inGame = ['playing', 'cutscene', 'paused', 'document', 'dead'].includes(phase);

  return (
    <div className={'app' + (IS_TOUCH ? ' is-touch' : '')}>
      <div ref={mount} className="stage" />

      {(phase === 'loading' || phase === 'error') && (
        <div className="screen loading">
          <div className="logo small"><span className="pre">KARAKOL</span><span className="sub">SON TAHLİYE</span></div>
          <p>{loadMsg}</p>
        </div>
      )}

      {phase === 'menu' && menuPage === 'main' && (
        <MainMenu
          hasResume={!!save.resume}
          onContinue={() => startLevel(true)}
          onLevels={() => setMenuPage('levels')}
          onSettings={() => setMenuPage('settings')}
          onControls={() => setMenuPage('controls')}
          onInstall={installEvt ? install : null}
          isTouch={IS_TOUCH}
        />
      )}
      {phase === 'menu' && menuPage === 'levels' && (
        <LevelSelect save={save} onBack={() => setMenuPage('main')} onPick={(lv) => { setBrief(lv); setMenuPage('briefing'); }} />
      )}
      {phase === 'menu' && menuPage === 'briefing' && brief && (
        <Briefing level={brief} onBack={() => setMenuPage('levels')} onStart={() => { updateSave((d) => (d.resume = null)); setSave(loadSave()); setMenuPage('main'); startLevel(false); }} />
      )}
      {phase === 'menu' && (menuPage === 'settings' || menuPage === 'controls') && (
        <div className="screen panel">
          <h2>{menuPage === 'settings' ? 'Ayarlar' : 'Kontroller'}</h2>
          {menuPage === 'settings' ? <SettingsPanel s={settings} set={setSetting} voiceAvailable={voiceOk} touch={IS_TOUCH} /> : <Controls touch={IS_TOUCH} />}
          <button className="btn ghost" onClick={() => setMenuPage('main')}>Geri</button>
        </div>
      )}

      {inGame && phase !== 'cutscene' && (
        <HUD touch={IS_TOUCH} hud={hud} objectives={objectives} subtitle={subtitle} hints={hints} toasts={toasts} hitmarker={hitmarker} damages={damages} banner={banner} progress={progress} locked={locked || phase !== 'playing'} settings={settings} />
      )}

      {IS_TOUCH && phase === 'playing' && game.current && <TouchControls game={game.current} hud={hud} />}
      {IS_TOUCH && portrait && !portraitOk && phase !== 'loading' && (
        <div className="rotate-hint" onClick={() => setPortraitOk(true)}>
          <div className="phone-icon" />
          <p>Telefonu yan çevir</p>
          <small>veya dikey devam etmek için dokun</small>
        </div>
      )}

      {phase === 'cutscene' && (
        <div className="cutscene" onClick={() => game.current.skipCutscene()}>
          {subtitle && settings.subtitles && (
            <div className="subtitle cine"><b style={{ color: subtitle.color }}>{subtitle.who}</b> {subtitle.text}</div>
          )}
          {!results && objectives.length <= 1 && (
            <div className="title-card">
              <span>BÖLÜM 1</span>
              <b>SESSİZ VADİ</b>
            </div>
          )}
          <div className="skip">{IS_TOUCH ? 'Atlamak için dokun' : 'Atla: Boşluk'}</div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="screen pause">
          <h2>Duraklatıldı</h2>
          <div className="menu-buttons">
            <button className="btn primary" onClick={() => game.current.resume()}>Devam et</button>
            <button className="btn" onClick={() => game.current.retryCheckpoint()}>Son kayıt noktasına dön</button>
            <button className="btn" onClick={() => game.current.restartLevel()}>Bölümü yeniden başlat</button>
            <button className="btn ghost" onClick={() => { game.current.toMenu(); setSave(loadSave()); setMenuPage('main'); }}>Ana menü</button>
          </div>
          <SettingsPanel s={settings} set={setSetting} voiceAvailable={voiceOk} touch={IS_TOUCH} />
          <Controls touch={IS_TOUCH} />
        </div>
      )}

      {phase === 'document' && doc && (
        <div className="screen dim" onClick={() => game.current.closeDocument()}>
          <div className="paper" onClick={(e) => e.stopPropagation()}>
            <h3>{doc.title}</h3>
            <div className="hand">{doc.text}</div>
            <button className="btn ghost small" onClick={() => game.current.closeDocument()}>Kapat (E)</button>
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div className="screen dead">
          <h2>Etkisiz hâle getirildin</h2>
          <p>Ekip seni geri çekti. Son kayıt noktasından devam edebilirsin.</p>
          <div className="menu-buttons">
            <button className="btn primary" onClick={() => game.current.retryCheckpoint()}>Kayıt noktasından devam</button>
            <button className="btn ghost" onClick={() => { game.current.toMenu(); setSave(loadSave()); setMenuPage('main'); }}>Ana menü</button>
          </div>
        </div>
      )}

      {phase === 'results' && results && (
        <Results
          r={results}
          onRetry={() => startLevel(false)}
          onLevels={() => { game.current.toMenu(); setMenuPage('levels'); }}
          onMenu={() => { game.current.toMenu(); setMenuPage('main'); }}
        />
      )}
      {void L}
    </div>
  );
}
