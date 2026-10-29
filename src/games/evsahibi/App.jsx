import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game.js';
import { EPISODES } from './game/story.js';
import './ev.css';

const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  if (/[?&]touch\b/.test(location.search)) return true;
  if (/[?&]mouse\b/.test(location.search)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();
const TEST = /[?&]test\b/.test(typeof location !== 'undefined' ? location.search : '');

function loadSave() {
  try {
    return { unlocked: 1, best: {}, ...JSON.parse(localStorage.getItem('evsahibi-save') || '{}') };
  } catch {
    return { unlocked: 1, best: {} };
  }
}
function loadSettings() {
  try {
    return { vol: 0.8, voice: true, low: IS_TOUCH, ...JSON.parse(localStorage.getItem('evsahibi-settings') || '{}') };
  } catch {
    return { vol: 0.8, voice: true, low: IS_TOUCH };
  }
}

const STATE_ICON = { idle: '○', armed: '✦', done: '✔' };

export default function App() {
  const mount = useRef(null);
  const game = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [hud, setHud] = useState(null);
  const [sub, setSub] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [pop, setPop] = useState(null);
  const [work, setWork] = useState(null);
  const [result, setResult] = useState(null);
  const [caughtFx, setCaughtFx] = useState(0);
  const [save, setSave] = useState(loadSave);
  const [settings, setSettings] = useState(loadSettings);
  const [showList, setShowList] = useState(false);
  const [panel, setPanel] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let g;
    const emit = (type, d) => {
      if (type === 'phase') setPhase(d);
      else if (type === 'hud') setHud(d);
      else if (type === 'subtitle') setSub(d);
      else if (type === 'work') setWork(d);
      else if (type === 'result') {
        setResult(d);
        setSave(loadSave());
      } else if (type === 'caught') setCaughtFx((c) => c + 1);
      else if (type === 'prank') {
        const id = Math.random();
        setPop({ ...d, id });
        setTimeout(() => setPop((p) => (p && p.id === id ? null : p)), 2600);
      } else if (type === 'toast') {
        const id = Math.random();
        setToasts((t) => [...t.slice(-2), { id, text: d.text }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), d.ms || 2800);
      }
    };
    try {
      g = new Game(mount.current, emit, { touch: IS_TOUCH, test: TEST, low: settings.low });
      game.current = g;
      g.setVolume(settings.vol);
      g.setVoice(settings.voice);
      setPhase('menu');
    } catch (e) {
      setErr(String(e.message || e));
    }
    return () => g && g.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = (s) => {
    setSettings(s);
    try {
      localStorage.setItem('evsahibi-settings', JSON.stringify(s));
    } catch {
      /* yok say */
    }
    game.current.setVolume(s.vol);
    game.current.setVoice(s.voice);
  };

  const start = (n) => {
    setResult(null);
    setPanel(null);
    game.current.startEpisode(n);
  };

  const g = game.current;
  const playing = phase === 'playing' || phase === 'ending';

  return (
    <div className={'ev' + (IS_TOUCH ? ' touch' : '')}>
      <div ref={mount} className="ev-mount" />

      {err && (
        <div className="ev-screen">
          <div className="ev-card">
            <h2>Bir sorun çıktı</h2>
            <p>Tarayıcın WebGL desteklemiyor olabilir.</p>
            <code>{err}</code>
          </div>
        </div>
      )}

      {phase === 'menu' && (
        <div className="ev-screen ev-menu">
          <div className="ev-logo">
            <small>bir konak komedisi</small>
            <h1>EV SAHİBİ</h1>
            <p>Cingöz Konağı'nın 300 yıllık cini, yeni kiracıya karşı</p>
          </div>
          {!panel && (
            <div className="ev-eps">
              {EPISODES.map((e) => {
                const open = e.id <= save.unlocked;
                const b = save.best[e.id];
                return (
                  <button key={e.id} className={'ev-ep' + (open ? '' : ' locked')} disabled={!open} onClick={() => start(e.id)}>
                    <span className="n">{e.id}. Gün</span>
                    <b>{e.title}</b>
                    <span className="s">{b ? '★'.repeat(b.stars) + '☆'.repeat(3 - b.stars) + ` · ${b.score}` : open ? 'Oyna' : 'Kilitli'}</span>
                  </button>
                );
              })}
              <div className="ev-soon">3. Gün — Defne Geliyor · yakında</div>
              <div className="ev-row">
                <button className="ev-btn ghost" onClick={() => setPanel('how')}>Nasıl oynanır?</button>
                <button className="ev-btn ghost" onClick={() => setPanel('settings')}>Ayarlar</button>
                <a className="ev-btn ghost" href="/">← Oyun Salonu</a>
              </div>
            </div>
          )}
          {panel === 'how' && <How onBack={() => setPanel(null)} />}
          {panel === 'settings' && <Settings s={settings} save={saveSettings} onBack={() => setPanel(null)} />}
        </div>
      )}

      {phase === 'intro' && (
        <button className="ev-skip" onClick={() => g.skipIntro()}>
          Atla →
        </button>
      )}

      {playing && hud && (
        <>
          <div className="ev-top">
            <div className="ev-clock">
              <b>{hud.clock}</b>
              <div className="ev-daybar">
                <i style={{ width: `${hud.day * 100}%` }} />
              </div>
            </div>
            <div className="ev-necmi">
              <span className="who">Necmi Bey</span>
              <span className="now">{hud.now}</span>
              <span className="next">sonra: {hud.next}</span>
              <div className="ev-anger" title="Öfke">
                <i style={{ width: `${hud.anger}%` }} />
              </div>
            </div>
            <div className="ev-score">
              <b>{hud.score}</b>
              <span>
                {hud.done}/{hud.goal} şaka
              </span>
              <div className="ev-shields" title="Yakalanma hakkı">
                {[0, 1, 2].map((i) => (
                  <i key={i} className={i < hud.shields ? 'on' : ''} />
                ))}
              </div>
            </div>
          </div>
          {hud.combo > 1 && (
            <div className="ev-combo" style={{ '--k': hud.comboT }}>
              ×{hud.combo} KOMBO
            </div>
          )}
          {hud.sus > 0.05 && (
            <div className={'ev-sus' + (hud.sus > 0.6 ? ' hot' : '')}>
              <span>👁</span>
              <div>
                <i style={{ width: `${Math.min(100, hud.sus * 100)}%` }} />
              </div>
            </div>
          )}
          <div className={'ev-list' + (showList ? ' open' : '')} onClick={() => setShowList((v) => !v)}>
            {hud.pranks.map((p) => (
              <div key={p.id} className={'p ' + p.state} title={`${p.room}${p.need ? ' · gerekli: ' + p.need : ''}`}>
                <span className="i">{STATE_ICON[p.state]}</span>
                <b>{p.title}</b>
                {showList && (
                  <small>
                    {p.room}
                    {p.need && p.state === 'idle' ? ` · ${p.need} gerekli` : ''}
                  </small>
                )}
              </div>
            ))}
          </div>
          <div className="ev-inv">
            {hud.hidden && <span className="hid">Saklanıyor: {hud.hidden}</span>}
            {hud.inv.map((i) => (
              <span key={i} className="it">
                {i}
              </span>
            ))}
          </div>
          <div className="ev-tools">
            <button onClick={() => g.toggleFollow()}>{hud.follow ? 'Tüm ev' : 'Yakınlaş'}</button>
            <button onClick={() => g.pause()} aria-label="Duraklat">
              ❚❚
            </button>
          </div>
          {work && (
            <div className="ev-work">
              <span>{work.label}</span>
              <div>
                <i style={{ width: `${work.p * 100}%` }} />
              </div>
            </div>
          )}
          <div className="ev-toasts">
            {toasts.map((t) => (
              <div key={t.id} className="ev-toast">
                {t.text}
              </div>
            ))}
          </div>
          {pop && (
            <div key={pop.id} className="ev-pop">
              <b>{pop.title}!</b>
              <span>
                +{pop.gain}
                {pop.combo > 1 ? `  ×${pop.combo}` : ''}
              </span>
            </div>
          )}
          {caughtFx > 0 && <div key={caughtFx} className="ev-caught" />}
        </>
      )}

      {sub && (phase === 'intro' || playing) && (
        hud && hud.bubble && phase !== 'intro' ? (
          <div className="ev-bubble" style={{ left: `${hud.bubble.x}%`, top: `${hud.bubble.y}%`, '--c': sub.color }}>
            <b>{sub.who}</b>
            {sub.text}
          </div>
        ) : (
          <div className="ev-sub" style={{ '--c': sub.color }}>
            <b>{sub.who}</b>
            <span>{sub.text}</span>
          </div>
        )
      )}

      {phase === 'paused' && (
        <div className="ev-screen dim">
          <div className="ev-card">
            <h2>Mola</h2>
            {!panel ? (
              <>
                <button className="ev-btn" onClick={() => g.resume()}>Devam</button>
                <button className="ev-btn ghost" onClick={() => setPanel('how')}>Nasıl oynanır?</button>
                <button className="ev-btn ghost" onClick={() => setPanel('settings')}>Ayarlar</button>
                <button className="ev-btn ghost" onClick={() => location.reload()}>Ana menü</button>
              </>
            ) : panel === 'how' ? (
              <How onBack={() => setPanel(null)} />
            ) : (
              <Settings s={settings} save={saveSettings} onBack={() => setPanel(null)} />
            )}
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="ev-screen dim">
          <div className="ev-card ev-result">
            <small>{result.ep}. Gün · {result.title}</small>
            <h2>{result.win ? 'Gün senin!' : result.reason === 'caught' ? 'Hoca çağrıldı!' : 'Akşam oldu'}</h2>
            <div className="stars">{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</div>
            <div className="grid">
              <div><span>Puan</span><b>{result.score}</b></div>
              <div><span>Şakalar</span><b>{result.done}/{result.total}</b></div>
              <div><span>Öfke</span><b>%{result.anger}</b></div>
              <div><span>Yakalanma</span><b>{result.caught}</b></div>
            </div>
            {!result.win && <p className="hint">Geçmek için en az {result.goal} şaka gerekli.</p>}
            <div className="ev-row">
              <button className="ev-btn ghost" onClick={() => start(result.ep)}>Tekrar</button>
              {result.win && result.hasNext && <button className="ev-btn" onClick={() => start(result.ep + 1)}>Sonraki gün →</button>}
              <button className="ev-btn ghost" onClick={() => location.reload()}>Menü</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'loading' && !err && (
        <div className="ev-screen">
          <p className="ev-loading">Konak hazırlanıyor…</p>
        </div>
      )}
    </div>
  );
}

function How({ onBack }) {
  return (
    <div className="ev-panel">
      <h3>Nasıl oynanır?</h3>
      <ul>
        <li><b>Dokun / tıkla:</b> Cingöz oraya süzülür. Eşyaya dokununca alır ya da tuzak kurar.</li>
        <li><b>Necmi Bey'in rutini</b> üstte yazıyor: şimdi ne yapıyor, sonra ne yapacak. Tuzağı oraya kur, gelmesini bekle.</li>
        <li><b>Görülme:</b> Aynı odada iş yaparsan ya da önünden geçersen göz ölçeri dolar. Dolarsa yakalanırsın. Dolaba, perdeye, çınarın arkasına saklan.</li>
        <li><b>Üç yakalanma</b> = hoca çağrılır, gün biter.</li>
        <li><b>Kombo:</b> Şakalar arka arkaya patlarsa puan katlanır.</li>
        <li><b>Yakınlaş</b> düğmesi Cingöz'ü takip eder; iki parmakla da yakınlaşabilirsin.</li>
      </ul>
      <button className="ev-btn ghost" onClick={onBack}>Geri</button>
    </div>
  );
}

function Settings({ s, save, onBack }) {
  return (
    <div className="ev-panel">
      <h3>Ayarlar</h3>
      <label className="r">
        <span>Ses</span>
        <input type="range" min="0" max="1" step="0.05" value={s.vol} onChange={(e) => save({ ...s, vol: +e.target.value })} />
      </label>
      <label className="r">
        <span>Seslendirme</span>
        <input type="checkbox" checked={s.voice} onChange={(e) => save({ ...s, voice: e.target.checked })} />
      </label>
      <label className="r">
        <span>Düşük grafik (yeniden açınca)</span>
        <input type="checkbox" checked={s.low} onChange={(e) => save({ ...s, low: e.target.checked })} />
      </label>
      <button className="ev-btn ghost" onClick={onBack}>Geri</button>
    </div>
  );
}
