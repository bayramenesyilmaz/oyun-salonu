import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, ROSTER, MOVE_ORDER } from '../../characters/roster.js';
import { drawFighter, drawSwoosh, drawPortrait } from '../../characters/rig.js';
import { Match } from './game/fight.js';
import './gd.css';

const IS_TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  if (/[?&]touch\b/.test(location.search)) return true;
  if (/[?&]mouse\b/.test(location.search)) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches;
})();
const QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const TEST = QS.has('test');

const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem('gd-prefs') || '{}');
  } catch {
    return {};
  }
};
const savePrefs = (p) => {
  try {
    localStorage.setItem('gd-prefs', JSON.stringify(p));
  } catch {}
};
const randNick = () => 'Oyuncu' + Math.floor(100 + Math.random() * 900);

// ——— küçük çizim bileşenleri ———
function useCanvasLoop(draw, deps) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 120;
    const h = cv.clientHeight || 120;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const c = cv.getContext('2d');
    let raf;
    const t0 = performance.now();
    const loop = (t) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      draw(c, (t - t0) / 1000, w, h);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, deps);
  return ref;
}

function Portrait({ id }) {
  const ref = useCanvasLoop((c, t, w, h) => drawPortrait(c, id, t, w / 2, h - 10, Math.min(w, h) / 150), [id]);
  return <canvas ref={ref} className="gd-portrait" />;
}

const DEMO = ['l1', 'l2', 'l3', 'cb', 'h', 's', 'f'];
function Demo({ id, onMove }) {
  const state = useRef({ i: 0, t: 0, last: -1 });
  const ref = useCanvasLoop(
    (c, t, w, h) => {
      const ch = CHARACTERS[id];
      const s = state.current;
      if (!s.t0) s.t0 = t;
      let key = DEMO[s.i % DEMO.length];
      let mv = ch.moves[key];
      const dur = mv.su + mv.ac + mv.rc + 0.55;
      const el = t - s.t0;
      if (el > dur) {
        s.i++;
        s.t0 = t;
        key = DEMO[s.i % DEMO.length];
        mv = ch.moves[key];
      }
      if (s.last !== key) {
        s.last = key;
        onMove?.(key);
      }
      const mvT = Math.min(t - s.t0, mv.su + mv.ac + mv.rc + 0.2);
      const f = { ch, st: mvT < mv.su + mv.ac + mv.rc ? 'atk' : 'idle', mv, mvT, y: 0, x: 0, dT: 1, face: 1, slot: 0 };
      const sc = Math.min(w / 260, h / 170);
      const o = { x: w * 0.38, y: h - 16, scale: sc, face: 1 };
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath();
      c.ellipse(o.x, o.y + 3, 34 * sc, 6 * sc, 0, 0, 7);
      c.fill();
      drawFighter(c, f, t, o);
      drawSwoosh(c, f, o);
      // ok / dalga için küçük gösterim
      if (mv.proj && mvT >= mv.su) {
        const px = o.x + 30 * sc + (mvT - mv.su) * 380 * sc;
        c.strokeStyle = '#e6edf5';
        c.lineWidth = 3;
        for (let i = 0; i < (mv.proj.n || 1); i++) {
          const yy = o.y - 80 * sc + (i - ((mv.proj.n || 1) - 1) / 2) * 12 * sc;
          c.beginPath();
          c.moveTo(px - 24 * sc, yy);
          c.lineTo(px, yy);
          c.stroke();
        }
      }
    },
    [id],
  );
  return <canvas ref={ref} className="gd-demo" />;
}

export default function App() {
  const prefs = useRef(loadPrefs()).current;
  const cv = useRef(null);
  const match = useRef(null);
  const room = useRef(null);
  const cfg = useRef(null);

  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState('bot');
  const [diff, setDiff] = useState(prefs.diff || 'orta');
  const [nick, setNick] = useState(prefs.nick || randNick());
  const [picks, setPicks] = useState([prefs.pick && CHARACTERS[prefs.pick] ? prefs.pick : 'arda', 'kaan']);
  const [pickFor, setPickFor] = useState(0);
  const [sel, setSel] = useState(prefs.pick && CHARACTERS[prefs.pick] ? prefs.pick : 'arda');
  const [moveKey, setMoveKey] = useState('l1');
  const [code, setCode] = useState((QS.get('oda') || '').toUpperCase());
  const [onlineKind, setOnlineKind] = useState(QS.get('oda') ? 'join' : 'host');
  const [lobby, setLobby] = useState(null);
  const [peer, setPeer] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(!!prefs.muted);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    savePrefs({ diff, nick, pick: picks[0], muted });
  }, [diff, nick, picks, muted]);

  // ?oda=KOD ile gelen bağlantı: doğrudan katılma ekranı
  useEffect(() => {
    if (QS.get('oda') && !TEST) {
      setMode('online');
      setScreen('select');
    }
  }, []);

  // hızlı test girişi: ?test&quick=arda,kaan&p0bot
  useEffect(() => {
    const q = QS.get('quick');
    if (!q) return;
    const [a, b] = q.split(',');
    cfg.current = { mode: QS.has('local2p') ? 'local' : 'bot', chars: [a || 'arda', b || 'kaan'], nicks: ['', ''], diff: QS.get('diff') || 'orta', diff0: QS.get('diff0') || undefined, p0bot: QS.has('p0bot'), arena: QS.get('arena') || 'random', test: TEST, manual: QS.has('manual') };
    setScreen('play');
  }, []);

  // maç kurulumu
  useEffect(() => {
    if (screen !== 'play' || !cv.current || !cfg.current) return;
    const m = new Match(cv.current, {
      ...cfg.current,
      cb: {
        onPhase: (p) => setPhase(p),
        onPause: () => setPaused((v) => !v),
      },
    });
    match.current = m;
    m.sfx.setMuted(muted);
    if (TEST) window.__gd = m;
    setPaused(false);
    return () => {
      m.dispose();
      match.current = null;
    };
    // eslint-disable-next-line
  }, [screen]);

  useEffect(() => {
    const m = match.current;
    if (m) {
      m.sfx.setMuted(muted);
      if (m.mode !== 'online') m.paused = paused;
    }
  }, [paused, muted, screen]);

  useEffect(() => () => room.current?.leave?.(), []);

  const unlock = () => match.current?.sfx.unlock();

  // ——— akışlar ———
  const pickChar = (id) => {
    setSel(id);
  };
  const confirmChar = () => {
    if (mode === 'local' && pickFor === 0) {
      setPicks([sel, picks[1]]);
      setPickFor(1);
      setSel(picks[1] === sel ? ROSTER[(ROSTER.indexOf(sel) + 1) % ROSTER.length] : picks[1]);
      return;
    }
    if (mode === 'local') {
      const p = [picks[0], sel];
      setPicks(p);
      launch({ mode: 'local', chars: p, nicks: ['Oyuncu 1', 'Oyuncu 2'] });
      return;
    }
    const mine = sel;
    setPicks([mine, picks[1]]);
    if (mode === 'bot') {
      const others = ROSTER.filter((r) => r !== mine);
      launch({ mode: 'bot', chars: [mine, others[Math.floor(Math.random() * others.length)]], nicks: [nick, 'Bot'], diff });
    } else if (mode === 'online') {
      setErr('');
      setScreen('onl');
    }
  };
  const launch = (c) => {
    cfg.current = { ...c, test: TEST, arena: 'random' };
    setPhase(null);
    setScreen('play');
  };

  const goOnline = async (kind) => {
    setErr('');
    setBusy(true);
    const O = await import('../../engine/online.js');
    try {
      const r = kind === 'host' ? await O.createRoom() : await O.joinRoom(code);
      room.current = r;
      const mine = sel;
      const hello = () => r.sendState({ n: nick, c: mine, x: 0, y: 0, r: 0 });
      hello();
      setPeer(null);
      r.onState = (s) => {
        if (s && s.c) {
          setPeer({ n: s.n || 'Rakip', c: s.c });
          hello();
        }
      };
      r.onLeave = () => setPeer(null);
      setLobby({ code: r.code, host: kind === 'host', mine });
      setScreen('lobby');
    } catch (e) {
      setErr(O.explain(e));
    } finally {
      setBusy(false);
    }
  };

  // iki taraf da hazırsa maçı başlat
  useEffect(() => {
    if (screen !== 'lobby' || !peer || !lobby || !room.current) return;
    const tm = setTimeout(() => {
      const host = lobby.host;
      const chars = host ? [lobby.mine, peer.c] : [peer.c, lobby.mine];
      const nicks = host ? [nick, peer.n] : [peer.n, nick];
      launch({ mode: 'online', chars, nicks, slot: host ? 0 : 1, host, net: room.current });
    }, 1400);
    return () => clearTimeout(tm);
    // eslint-disable-next-line
  }, [screen, peer, lobby]);

  const leaveOnline = () => {
    room.current?.leave?.();
    room.current = null;
    setLobby(null);
    setPeer(null);
  };
  const toMenu = () => {
    leaveOnline();
    setScreen('menu');
    setPhase(null);
    setPaused(false);
  };
  const copyLink = async () => {
    const url = location.origin + '/golgedovus?oda=' + lobby.code;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Bağlantıyı kopyala:', url);
    }
  };

  const hold = (k) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      match.current?.touch(k, true);
    },
    onPointerUp: () => match.current?.touch(k, false),
    onPointerCancel: () => match.current?.touch(k, false),
    onLostPointerCapture: () => match.current?.touch(k, false),
  });

  const ch = CHARACTERS[sel];
  const online = cfg.current?.mode === 'online';
  const mvInfo = ch.moves[moveKey];

  return (
    <div className={'gd-root' + (IS_TOUCH ? ' touch' : '')} onPointerDown={unlock}>
      {screen === 'play' && (
        <>
          <canvas ref={cv} className="gd-canvas" />
          <button className="gd-pausebtn" onClick={() => setPaused(true)} aria-label="Duraklat">
            ❚❚
          </button>
          {phase && phase.phase === 'wait' && (
            <div className="gd-wait">
              <b>Rakip bağlanıyor…</b>
              <span>Maç birazdan başlayacak.</span>
            </div>
          )}
          {IS_TOUCH && phase && phase.phase !== 'mend' && cfg.current?.mode !== 'local' && (
            <div className="gd-touch">
              <div className="gd-tl">
                <button {...hold('l')} aria-label="Sol">
                  ◀
                </button>
                <button {...hold('r')} aria-label="Sağ">
                  ▶
                </button>
              </div>
              <div className="gd-tm">
                <button {...hold('u')} aria-label="Zıpla">
                  ▲
                </button>
                <button {...hold('d')} className="guard" aria-label="Kalkan">
                  Kalkan
                </button>
              </div>
              <div className="gd-tr">
                <button {...hold('a')} className="a">
                  Hafif
                </button>
                <button {...hold('b')} className="b">
                  Ağır
                </button>
                <button {...hold('s')} className="s">
                  Özel
                </button>
              </div>
            </div>
          )}
          {!IS_TOUCH && phase && phase.phase === 'fight' && (
            <div className="gd-keys">
              {cfg.current?.mode === 'local'
                ? 'Oyuncu 1: A D W S · F G H    |    Oyuncu 2: ← → ↑ ↓ · , . /'
                : 'A D yürü · W zıpla · S kalkan · J hafif · K ağır · L özel (ölçer dolunca bitiriş) · Esc duraklat'}
            </div>
          )}
          {paused && (
            <div className="gd-modal">
              <div className="gd-card small">
                <h2>Duraklatıldı</h2>
                <button className="gd-btn primary" onClick={() => setPaused(false)}>
                  Devam et
                </button>
                <button className="gd-btn" onClick={() => setMuted((v) => !v)}>
                  Ses: {muted ? 'kapalı' : 'açık'}
                </button>
                <button className="gd-btn" onClick={toMenu}>
                  {online ? 'Odadan çık' : 'Ana menü'}
                </button>
              </div>
            </div>
          )}
          {phase && phase.phase === 'mend' && (
            <div className="gd-modal">
              <div className="gd-card small">
                <small>{phase.msg || 'Maç bitti'}</small>
                <h2>{phase.winner >= 0 ? (online ? (phase.winner === cfg.current.slot ? 'Kazandın!' : 'Kaybettin') : CHARACTERS[cfg.current.chars[phase.winner]].name + ' kazandı!') : 'Berabere'}</h2>
                <p className="gd-score">
                  {phase.wins[0]} – {phase.wins[1]}
                </p>
                <button className="gd-btn primary" onClick={() => match.current?.rematch()}>
                  {online ? (match.current?.rmSelf ? 'Rakip bekleniyor…' : 'Rövanş') : 'Rövanş'}
                </button>
                <button className="gd-btn" onClick={() => { match.current?.rmSelf && 0; toMenu(); }}>
                  {online ? 'Odadan çık' : 'Ana menü'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {screen === 'menu' && (
        <div className="gd-menu">
          <div className="gd-menu-in">
            <a className="gd-back" href="/">
              ← Oyun Salonu
            </a>
            <h1>
              Gölge <em>Dövüş</em>
            </h1>
            <p className="gd-lead">Kalın çizgili çizgi film dövüşü. Karakterini seç, silahınla kombo yap, ölçer dolunca bitirişini patlat. Bota karşı, aynı ekranda ya da online arkadaşınla.</p>
            <div className="gd-actions">
              <button className="gd-btn primary" onClick={() => { setMode('bot'); setScreen('select'); }}>
                Bota karşı
              </button>
              <button className="gd-btn" onClick={() => { setMode('online'); setScreen('select'); }}>
                Online · arkadaşınla
              </button>
              {!IS_TOUCH && (
                <button className="gd-btn" onClick={() => { setMode('local'); setPickFor(0); setSel(picks[0]); setScreen('select'); }}>
                  İki kişi · aynı ekran
                </button>
              )}
            </div>
            <div className="gd-roster-strip">
              {ROSTER.map((id) => (
                <div key={id} className="gd-mini">
                  <Portrait id={id} />
                  <span>{CHARACTERS[id].name}</span>
                </div>
              ))}
            </div>
            <p className="gd-note">Karakterler ortak karakter kütüphanesinden gelir; ileride diğer oyunlarda da aynı kadro görünecek.</p>
          </div>
        </div>
      )}

      {screen === 'select' && (
        <div className="gd-menu">
          <div className="gd-select">
            <button className="gd-back as-btn" onClick={() => setScreen('menu')}>
              ← Geri
            </button>
            <h2 className="gd-h2">
              {mode === 'local' ? (pickFor === 0 ? 'Oyuncu 1: karakterini seç' : 'Oyuncu 2: karakterini seç') : 'Karakterini seç'}
            </h2>
            <div className="gd-grid">
              {ROSTER.map((id) => (
                <button key={id} className={'gd-pick' + (sel === id ? ' on' : '')} style={{ '--c': CHARACTERS[id].colors.body }} onClick={() => pickChar(id)}>
                  <Portrait id={id} />
                  <b>{CHARACTERS[id].name}</b>
                  <small>{CHARACTERS[id].title}</small>
                </button>
              ))}
            </div>
            <div className="gd-detail" style={{ '--c': ch.colors.body }}>
              <Demo id={sel} onMove={setMoveKey} />
              <div className="gd-info">
                <h3>
                  {ch.name} <em>{ch.title}</em>
                </h3>
                <p>{ch.bio}</p>
                <div className="gd-move-now">
                  <b>{mvInfo.name}</b>
                  <span>{MOVE_ORDER.find((m) => m[0] === moveKey)?.[1]}</span>
                </div>
                <ul className="gd-moves">
                  {MOVE_ORDER.map(([k, label]) => (
                    <li key={k} className={k === moveKey ? 'on' : ''}>
                      <span>{label}</span>
                      <b>{ch.moves[k].name}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="gd-bar">
              {mode === 'bot' && (
                <div className="gd-chips">
                  {['kolay', 'orta', 'zor'].map((d) => (
                    <button key={d} className={'gd-chip' + (diff === d ? ' on' : '')} onClick={() => setDiff(d)}>
                      {d[0].toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'online' && (
                <label className="gd-nick">
                  Takma ad
                  <input value={nick} maxLength={14} onChange={(e) => setNick(e.target.value)} />
                </label>
              )}
              <button className="gd-btn primary" onClick={confirmChar}>
                {mode === 'local' && pickFor === 0 ? 'Sıradaki oyuncu' : mode === 'online' ? 'Devam' : 'Savaşa gir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'onl' && (
        <div className="gd-menu">
          <div className="gd-menu-in">
            <button className="gd-back as-btn" onClick={() => setScreen('select')}>
              ← Geri
            </button>
            <h2 className="gd-h2">Online oda</h2>
            <div className="gd-tabs">
              <button className={'gd-chip' + (onlineKind === 'host' ? ' on' : '')} onClick={() => setOnlineKind('host')}>
                Oda kur
              </button>
              <button className={'gd-chip' + (onlineKind === 'join' ? ' on' : '')} onClick={() => setOnlineKind('join')}>
                Koda katıl
              </button>
            </div>
            {onlineKind === 'host' ? (
              <p className="gd-lead">Bir oda kuralım; sana 4 harfli bir kod vereceğim. Kodu (ya da bağlantıyı) arkadaşına gönder.</p>
            ) : (
              <label className="gd-nick big">
                Oda kodu
                <input value={code} maxLength={6} placeholder="ABCD" type="text" inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} />
              </label>
            )}
            {err && <p className="gd-err">{err}</p>}
            <div className="gd-actions">
              <button className="gd-btn primary" disabled={busy || (onlineKind === 'join' && code.trim().length < 4)} onClick={() => goOnline(onlineKind)}>
                {busy ? 'Bağlanıyor…' : onlineKind === 'host' ? 'Odayı kur' : 'Katıl'}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'lobby' && lobby && (
        <div className="gd-menu">
          <div className="gd-menu-in center">
            <button className="gd-back as-btn" onClick={toMenu}>
              ← Odadan çık
            </button>
            <small className="gd-small">Oda kodu</small>
            <div className="gd-code">{lobby.code}</div>
            {lobby.host && (
              <button className="gd-btn" onClick={copyLink}>
                {copied ? 'Kopyalandı!' : 'Davet bağlantısını kopyala'}
              </button>
            )}
            <div className="gd-vs">
              <div>
                <Portrait id={lobby.mine} />
                <b>{nick}</b>
              </div>
              <span>VS</span>
              <div>
                {peer ? <Portrait id={peer.c} /> : <div className="gd-ghost">?</div>}
                <b>{peer ? peer.n : 'Rakip bekleniyor…'}</b>
              </div>
            </div>
            {peer && <p className="gd-lead">Rakip hazır, maç başlıyor…</p>}
          </div>
        </div>
      )}
      <div className="gd-rotate">Daha rahat oynamak için telefonu yan çevir.</div>
    </div>
  );
}
