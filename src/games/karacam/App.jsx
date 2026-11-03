import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPEAKERS, CASES } from './game/story.js';

// etkin vaka (oyun başlarken seçilir; bileşenler buradan okur)
let C = CASES[1];
const img = (n) => `${BASE}${n}.jpg`;
function loadSave() {
  try {
    return { max: 1, ...JSON.parse(localStorage.getItem('karacam-save') || '{}') };
  } catch {
    return { max: 1 };
  }
}
import { CinAudio } from './game/audio.js';
import { Dialogue } from './game/dialogue.js';
import './karacam.css';

const BASE = '/karacam/';
const TEST = typeof location !== 'undefined' && /[?&]test\b/.test(location.search);
const pic = (l) => `${BASE}kesit/${l.p || (l.s.endsWith('_cin') ? l.s + '_1' : l.s)}.webp`;
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s) % 60).padStart(2, '0');

function loadSettings() {
  try {
    return { vol: 0.85, ...JSON.parse(localStorage.getItem('karacam-settings') || '{}') };
  } catch {
    return { vol: 0.85 };
  }
}
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// küçük nesnelerde dokunma alanını büyüt (normalize koordinat)
function hitBox(b, minW = 0.026, minH = 0.042) {
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const w = Math.max(minW, b.x1 - b.x0 + 0.01), h = Math.max(minH, b.y1 - b.y0 + 0.016);
  return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, cx, cy, w, h };
}
const inBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

export default function App() {
  const audio = useMemo(() => new CinAudio(), []);
  const [settings, setSettings] = useState(loadSettings);
  const [line, setLine] = useState(null);
  const dlg = useMemo(() => new Dialogue((l) => setLine(l), { fast: TEST && !/[?&]voices\b/.test(location.search) }), []);
  const [screen, setScreen] = useState('menu'); // menu | intro | scene | hub | sorgu | karar | son | epilog | bitti
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [fade, setFade] = useState(0);
  const [card, setCard] = useState(null);
  const [modal, setModal] = useState(false); // konuşma ekranı tıklamayı kilitler

  // vaka durumu
  const [want, setWant] = useState([]);
  const [got, setGot] = useState(() => new Set());
  const [seen, setSeen] = useState(() => new Set());
  const [asked, setAsked] = useState(() => ({}));
  const [possDone, setPossDone] = useState(() => new Set());
  const [fit, setFit] = useState(null); // cin nöbeti: { id, frame }
  const [choice, setChoice] = useState(null);
  const [apparShown, setApparShown] = useState(false);
  const [opened, setOpened] = useState(() => new Set());
  const [notes, setNotes] = useState([]);
  const [suspect, setSuspect] = useState(null);
  const [accuse, setAccuse] = useState({ who: null, step: 'who' });
  const stats = useRef({ t0: 0, penalty: 0, hints: 0, wrong: 0, sceneTime: 0, score: 0 });

  useEffect(() => {
    setData(true);
    return () => {
      dlg.stop();
      audio.ticking(false);
      audio.wind(false);
      audio.ctx && audio.ctx.close && audio.ctx.close();
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('karacam-settings', JSON.stringify(settings));
    } catch {}
    audio.setVolume(settings.vol);
    dlg.volume = settings.vol;
  }, [settings]);

  const say = useCallback(
    (lines, done, blocking = true) => {
      if (blocking) setModal(true);
      dlg.play(lines, () => {
        if (blocking) setModal(false);
        done && done();
      });
    },
    [dlg]
  );
  const fadeTo = (fn, ms = 700) => {
    setFade(1);
    setTimeout(() => {
      fn();
      setTimeout(() => setFade(0), 60);
    }, ms);
  };
  const addNote = (t) => t && setNotes((n) => (n.includes(t) ? n : [...n, t]));

  // ---------- akış ----------
  const start = async (id = 1) => {
    audio.init();
    audio.setVolume(settings.vol);
    C = CASES[id];
    let d;
    try {
      d = await (await fetch(`${BASE}${C.bg}.json`)).json();
      await new Promise((ok) => {
        const im = new Image();
        im.onload = im.onerror = ok;
        im.src = img(C.bg);
      });
    } catch {
      return setErr('Vaka dosyası yüklenemedi. Bağlantını kontrol edip sayfayı yenile.');
    }
    setData(d);
    const data_ = d;
    const pool = Object.keys(data_.items).filter((k) => !C.scene.evidence.includes(k));
    setWant(shuffle([...C.scene.evidence, ...shuffle(pool).slice(0, C.scene.fillers)]));
    setGot(new Set());
    setSeen(new Set());
    setAsked(Object.fromEntries(Object.keys(C.suspects).map((k) => [k, new Set()])));
    setPossDone(new Set());
    setFit(null);
    setApparShown(false);
    setOpened(new Set());
    setNotes([]);
    setAccuse({ who: null, step: 'who' });
    stats.current = { t0: 0, penalty: 0, hints: 0, wrong: 0, sceneTime: 0, score: 0 };
    dlg.preload(C.intro);
    fadeTo(() => {
      setScreen('intro');
      audio.wind(true);
      audio.ticking(true);
      setCard({ title: `Vaka ${C.id} · ${C.title}`, sub: C.sub });
      setTimeout(() => {
        setCard(null);
        say(C.intro, () => {
          stats.current.t0 = performance.now();
          setScreen('scene');
        });
      }, TEST ? 50 : 3200);
    });
  };

  const sceneFinished = () => {
    stats.current.sceneTime = (performance.now() - stats.current.t0) / 1000 + stats.current.penalty;
    say(C.scene.done, () => fadeTo(() => setScreen('hub')));
  };

  const onFind = (k) => {
    if (got.has(k)) return;
    const g = new Set(got);
    g.add(k);
    setGot(g);
    const el = (performance.now() - stats.current.t0) / 1000 + stats.current.penalty;
    stats.current.score += Math.max(100, 1000 - Math.round(el * 4));
    const ev = C.scene.found[k];
    if (ev) {
      audio.evidence();
      say([ev], null, false);
    } else audio.found();
    if (want.every((w) => g.has(w)) && Object.keys(C.scene.spots).every((s) => seen.has(s))) setTimeout(sceneFinished, ev ? 3500 : 900);
  };
  const onSpot = (k) => {
    if (seen.has(k)) return;
    const s = new Set(seen);
    s.add(k);
    setSeen(s);
    stats.current.score += 250;
    audio.evidence();
    say([C.scene.spots[k]], null, false);
    if (want.every((w) => got.has(w)) && Object.keys(C.scene.spots).every((x) => s.has(x))) setTimeout(sceneFinished, 3500);
  };
  const onMiss = () => {
    stats.current.penalty += 5;
    audio.miss();
  };

  const openSuspect = (id) => {
    audio.page();
    setSuspect(id);
    setScreen('sorgu');
    if (!opened.has(id)) {
      setOpened(new Set([...opened, id]));
      dlg.preload(C.suspects[id].q.flatMap((q) => q.a));
      setTimeout(() => say(C.suspects[id].open), 400);
    }
  };
  const ask = (q) => {
    if (modal) return;
    const a = { ...asked, [suspect]: new Set([...asked[suspect], q.id]) };
    setAsked(a);
    const P = C.suspects[suspect].possession;
    say(q.a, () => {
      addNote(q.note);
      if (P && !possDone.has(suspect) && a[suspect].size >= P.after) setTimeout(() => possess(suspect), TEST ? 50 : 900);
    });
  };
  // cin nöbeti: görünüş ve hareket değişir, ses bozulur, sonunda oyuncu ne yapacağını seçer
  const fitTimer = useRef(null);
  const possess = (id) => {
    const P = C.suspects[id].possession;
    setPossDone((d) => new Set([...d, id]));
    audio.possession(true);
    let f = 0;
    const jerk = () => {
      f = (f + 1 + Math.floor(Math.random() * 2)) % P.frames.length;
      setFit({ id, frame: f, k: Math.random() });
      audio.twitch();
      fitTimer.current = setTimeout(jerk, 90 + Math.random() * (Math.random() < 0.3 ? 900 : 260));
    };
    setFit({ id, frame: 0, k: 0 });
    fitTimer.current = setTimeout(jerk, 400);
    say(P.lines, () => {
      setChoice(P.choice);
      document.exitPointerLock?.();
    });
  };
  const pickChoice = (opt) => {
    const P = C.suspects[suspect].possession;
    setChoice(null);
    clearTimeout(fitTimer.current);
    setFit(null);
    audio.possession(false);
    audio.page();
    say(P.choice.after[opt], () => addNote(P.choice.note));
  };
  const canAccuse = () => Object.values(asked).every((s) => s.size >= 2);
  const goAccuse = () => {
    if (!canAccuse()) return say(C.accuse.notEnough);
    audio.page();
    setAccuse({ who: null, step: 'who' });
    setScreen('karar');
  };
  const choose = (step, id) => {
    if (modal) return;
    if (step === 'who') {
      if (id !== C.accuse.who.answer) {
        stats.current.wrong++;
        audio.miss();
        return say(C.accuse.wrong);
      }
      audio.page();
      setAccuse({ who: id, step: 'why' });
    } else {
      if (id !== C.accuse.why.answer) {
        stats.current.wrong++;
        audio.miss();
        return say(C.accuse.wrong);
      }
      audio.stamp();
      setAccuse({ who: C.accuse.who.answer, step: 'ok' });
      setTimeout(
        () =>
          fadeTo(() => {
            setScreen('son');
            setTimeout(() => say(C.ending, ending2), 300);
          }),
        TEST ? 50 : 1600
      );
    }
  };
  const ending2 = () => {
    fadeTo(() => {
      setScreen('epilog');
      audio.ticking(true);
      setCard(C.epilogueCard);
      setTimeout(() => {
        setCard(null);
        audio.stopClocks();
        setTimeout(() => say(C.epilogue, () => fadeTo(() => finish(), 1400)), TEST ? 50 : 2500);
      }, TEST ? 50 : 3400);
    }, 1200);
  };
  const finish = () => {
    audio.ticking(false);
    audio.wind(false);
    const s = stats.current;
    const t = s.sceneTime;
    s.stars = Math.max(1, 3 - (t > 150 ? 1 : 0) - (t > 300 ? 1 : 0) - (s.wrong > 1 ? 1 : 0));
    try {
      const best = JSON.parse(localStorage.getItem('karacam-best') || '{}');
      if (!best.score || s.score > best.score) localStorage.setItem('karacam-best', JSON.stringify({ score: s.score, stars: s.stars }));
    } catch {}
    try {
      const sv = loadSave();
      if (C.id + 1 > sv.max) localStorage.setItem('karacam-save', JSON.stringify({ max: C.id + 1 }));
    } catch {}
    setScreen('bitti');
  };

  // klavye: boşluk / enter repliği geçer
  useEffect(() => {
    const k = (e) => {
      if ((e.code === 'Space' || e.code === 'Enter') && dlg.busy) {
        e.preventDefault();
        dlg.skip();
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [dlg]);

  // test kancaları
  useEffect(() => {
    if (!TEST) return;
    window.__karacam = { screen, want, got, seen, asked, notes, line, data, onFind, onSpot, ask, choose, goAccuse, openSuspect, start, stats: stats.current, skip: () => dlg.skip(), busy: () => dlg.busy, setScreen };
  });

  const bgBlur = screen === 'hub' || screen === 'sorgu' || screen === 'karar';
  const showSalon = screen !== 'menu' && screen !== 'bitti';

  return (
    <div className="kc-root" onClick={() => line && modal && dlg.skip()}>
      {showSalon && screen !== 'scene' && <div className={'kc-bg' + (bgBlur ? ' blur' : '') + (screen === 'epilog' ? ' dark' : '')} style={{ backgroundImage: `url(${img(C.bg)})` }} />}

      {screen === 'menu' && <Menu data={data} settings={settings} setSettings={setSettings} onStart={start} />}

      {screen === 'scene' && data && (
        <Scene data={data} want={want} got={got} seen={seen} onFind={onFind} onSpot={onSpot} onMiss={onMiss} stats={stats} audio={audio} line={line} onAppar={(l) => { audio.stinger(); say([l], null, false); }} />
      )}

      {screen === 'hub' && <Hub asked={asked} notes={notes} onOpen={openSuspect} onAccuse={goAccuse} canAccuse={canAccuse()} />}

      {screen === 'sorgu' && suspect && (
        <Sorgu id={suspect} asked={asked[suspect]} got={got} seen={seen} line={line} modal={modal || !!choice} fit={fit} onAsk={ask} onBack={() => !modal && (audio.page(), setScreen('hub'))} />
      )}

      {screen === 'karar' && <Karar state={accuse} onChoose={choose} onBack={() => !modal && setScreen('hub')} />}

      {screen === 'bitti' && <Bitti stats={stats.current} onAgain={() => setScreen('menu')} onNext={(id) => start(id)} />}
      {fit && <div className="kc-fitfx" key={fit.k} />}
      {choice && (
        <div className="kc-choice" onClick={(e) => e.stopPropagation()}>
          <p>{choice.prompt}</p>
          {choice.options.map((o) => (
            <button key={o.id} className="kc-btn" onClick={() => pickChoice(o.id)}>
              {o.t}
            </button>
          ))}
        </div>
      )}

      {(screen === 'intro' || screen === 'son' || screen === 'epilog') && line && <Portrait line={line} side="right" />}
      {screen !== 'scene' && line && <SubBox line={line} />}

      {card && (
        <div className="kc-card">
          <h2>{card.title}</h2>
          <p>{card.sub}</p>
        </div>
      )}
      <div className="kc-fade" style={{ opacity: fade }} />
      {err && <div className="kc-err">{err}</div>}
    </div>
  );
}

// ---------------- menü ----------------
function Menu({ data, settings, setSettings, onStart }) {
  const [best] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('karacam-best') || 'null');
    } catch {
      return null;
    }
  });
  const [save] = useState(loadSave);
  const fsOk = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
  return (
    <div className="kc-menu">
      <div className="kc-menu-bg" style={{ backgroundImage: `url(${img(C.bg)})` }} />
      <div className="inner">
        <div className="kicker">Karaçam · 1986</div>
        <h1>
          Karaçam
          <br />
          <span>Dosyaları</span>
        </h1>
        <p className="tag">Cin mi, insan mı?</p>
        <div className="cases">
          {Object.values(CASES).map((c) => {
            const locked = c.id > save.max;
            return (
              <button
                key={c.id}
                className={'case' + (locked ? ' locked' : '')}
                disabled={locked}
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(c.id);
                }}
              >
                <small>Vaka {c.id}</small>
                <b>{locked ? 'Kilitli' : c.title}</b>
                {!locked && <em>{c.id === save.max ? 'Başla' : 'Yeniden oyna'}</em>}
              </button>
            );
          })}
        </div>
        {best && <p className="small">En iyi: {best.score} puan · {'★'.repeat(best.stars)}</p>}
        <div className="row">
          <label className="vol">
            Ses
            <input type="range" min="0" max="1" step="0.05" value={settings.vol} onChange={(e) => setSettings((s) => ({ ...s, vol: +e.target.value }))} />
          </label>
          {fsOk && (
            <button
              className="kc-btn ghost small"
              onClick={(e) => {
                e.stopPropagation();
                if (document.fullscreenElement) document.exitFullscreen?.();
                else document.documentElement.requestFullscreen?.().catch(() => {});
              }}
            >
              Tam ekran
            </button>
          )}
        </div>
        <p className="small">Kulaklık önerilir. Kişiler, yerler ve olaylar kurgudur.</p>
        <div className="links">
          <a href="/">← Oyun salonu</a>
          <a href={BASE + 'KAYNAKLAR.txt'} target="_blank" rel="noreferrer">
            Kaynaklar ve lisanslar
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------- olay yeri: kaydır / yakınlaştır / bul ----------------
function Scene({ data, want, got, seen, onFind, onSpot, onMiss, stats, audio, line, onAppar }) {
  const box = useRef(null);
  const [view, setView] = useState({ s: 1, tx: 0, ty: 0, cw: 1, ch: 1 });
  const v = useRef(view);
  v.current = view;
  const [marks, setMarks] = useState([]);
  const [hint, setHint] = useState(null);
  const [hints, setHints] = useState(3);
  const [, force] = useState(0);
  const W = data.w, H = data.h;
  // karanlıkta beliren figür (yalnızca bazı vakalarda)
  const AP = C.scene.apparition;
  const [appar, setAppar] = useState(0); // 0 yok, 1 görünür, 2 bitti
  useEffect(() => {
    if (!AP || !data.apparition || appar || got.size < AP.after) return;
    setAppar(1);
    onAppar && onAppar(AP.line);
    const t = setTimeout(() => setAppar(2), 2200);
    return () => clearTimeout(t);
  }, [got.size]);

  const clamp = (s, tx, ty, cw, ch) => {
    const minS = Math.max(cw / W, ch / H);
    s = Math.min(Math.max(s, minS), minS * 3.2);
    tx = Math.min(0, Math.max(cw - W * s, tx));
    ty = Math.min(0, Math.max(ch - H * s, ty));
    return { s, tx, ty, cw, ch };
  };
  useEffect(() => {
    const fit = () => {
      const r = box.current.getBoundingClientRect();
      const s0 = Math.max(r.width / W, r.height / H);
      const c = v.current;
      const first = c.cw === 1;
      // ilk açılışta görüntüyü ortala
      setView(clamp(first ? s0 : c.s * (r.width / c.cw), first ? (r.width - W * s0) / 2 : c.tx, first ? (r.height - H * s0) / 2 : c.ty, r.width, r.height));
    };
    fit();
    addEventListener('resize', fit);
    const iv = setInterval(() => force((x) => x + 1), 500);
    return () => {
      removeEventListener('resize', fit);
      clearInterval(iv);
    };
  }, []);

  const zoomAt = (k, px, py) => {
    const c = v.current;
    const s2 = c.s * k;
    const n = clamp(s2, px - (px - c.tx) * (s2 / c.s), py - (py - c.ty) * (s2 / c.s), c.cw, c.ch);
    setView(n);
  };
  const ptrs = useRef(new Map());
  const gesture = useRef(null);
  const onDown = (e) => {
    box.current.setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = box.current.getBoundingClientRect();
    if (ptrs.current.size === 1) gesture.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: 0, tx: v.current.tx, ty: v.current.ty, r };
    else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      gesture.current = { pinch: Math.hypot(a.x - b.x, a.y - b.y), s: v.current.s, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, moved: 99, r };
    }
  };
  const onMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const c = v.current;
    if (g.pinch && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s2 = g.s * (d / g.pinch);
      setView(clamp(s2, g.cx - (g.cx - c.tx) * (s2 / c.s), g.cy - (g.cy - c.ty) * (s2 / c.s), c.cw, c.ch));
    } else if (!g.pinch) {
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      g.moved = Math.max(g.moved, Math.hypot(dx, dy));
      if (g.moved > 6) setView(clamp(c.s, g.tx + dx, g.ty + dy, c.cw, c.ch));
    }
  };
  const onUp = (e) => {
    const g = gesture.current;
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size === 0) gesture.current = null;
    if (!g || g.pinch || g.moved > 8 || performance.now() - g.t0 > 600) return;
    const c = v.current;
    const x = (e.clientX - g.r.left - c.tx) / (W * c.s), y = (e.clientY - g.r.top - c.ty) / (H * c.s);
    tap(x, y);
  };
  const tap = (x, y) => {
    const k = want.find((k) => !got.has(k) && data.items[k] && inBox(hitBox(data.items[k]), x, y));
    if (k) {
      const b = hitBox(data.items[k]);
      setMarks((m) => [...m, { k, cx: b.cx, cy: b.cy, r: Math.max(b.w * W, b.h * H) * 0.75 }]);
      setHint(null);
      return onFind(k);
    }
    const sp = Object.keys(data.spots).find((s) => !seen.has(s) && inBox(hitBox(data.spots[s], 0.03, 0.05), x, y));
    if (sp) {
      const b = data.spots[sp];
      setMarks((m) => [...m, { k: sp, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, r: Math.max((b.x1 - b.x0) * W, (b.y1 - b.y0) * H) * 0.55, spot: true }]);
      return onSpot(sp);
    }
    // zaten bulunmuş ya da gözlemlenmiş yere dokunmak ceza değil
    const known = [...got].some((k) => data.items[k] && inBox(hitBox(data.items[k]), x, y)) || [...seen].some((s) => inBox(data.spots[s], x, y));
    if (known) return;
    onMiss();
    const id = Math.random();
    setMarks((m) => [...m, { k: 'miss' + id, cx: x, cy: y, miss: true }]);
    setTimeout(() => setMarks((m) => m.filter((q) => q.k !== 'miss' + id)), 700);
  };
  const useHint = (e) => {
    e.stopPropagation();
    if (hints <= 0) return;
    const k = want.find((k) => !got.has(k)) || null;
    const target = k ? hitBox(data.items[k]) : (() => {
      const s = Object.keys(data.spots).find((s) => !seen.has(s));
      return s ? hitBox(data.spots[s], 0.03, 0.05) : null;
    })();
    if (!target) return;
    setHints(hints - 1);
    stats.current.hints++;
    stats.current.penalty += 15;
    // ipucunu ekranın ortasına getir
    const c = v.current;
    setView(clamp(c.s, c.cw / 2 - target.cx * W * c.s, c.ch / 2 - target.cy * H * c.s, c.cw, c.ch));
    setHint({ cx: target.cx, cy: target.cy, r: Math.max(target.w * W, target.h * H) * 1.6 });
    setTimeout(() => setHint(null), 3500);
  };

  const el = stats.current.t0 ? (performance.now() - stats.current.t0) / 1000 + stats.current.penalty : 0;
  const spotsLeft = Object.keys(data.spots).filter((s) => !seen.has(s)).length;
  const toScreen = (cx, cy) => ({ left: view.tx + cx * W * view.s, top: view.ty + cy * H * view.s });

  return (
    <div className="kc-scene">
      <div
        className="kc-view"
        ref={box}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => {
          const r = box.current.getBoundingClientRect();
          zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
        }}
        onDoubleClick={(e) => {
          const r = box.current.getBoundingClientRect();
          zoomAt(v.current.s > Math.max(view.cw / W, view.ch / H) * 1.5 ? 0.4 : 2, e.clientX - r.left, e.clientY - r.top);
        }}
      >
        <img src={img(C.bg)} alt={C.scene.title} draggable="false" style={{ width: W * view.s, height: H * view.s, transform: `translate(${view.tx}px, ${view.ty}px)` }} />
        {marks.map((m) =>
          m.miss ? (
            <div key={m.k} className="kc-miss" style={toScreen(m.cx, m.cy)} />
          ) : (
            <div key={m.k} className={'kc-mark' + (m.spot ? ' spot' : '')} style={{ ...toScreen(m.cx, m.cy), width: Math.max(34, m.r * 2 * view.s), height: Math.max(34, m.r * 2 * view.s) }} />
          )
        )}
        {appar === 1 && (() => {
          const a = data.apparition;
          const hpx = Math.abs(a.h) * H * view.s;
          const pos = toScreen(a.x, a.y);
          return <img className="kc-appar" src={`${BASE}kesit/${AP.img}.webp`} alt="" style={{ left: pos.left, top: pos.top - hpx, height: hpx * 1.08 }} />;
        })()}
        {hint && <div className="kc-hint" style={{ ...toScreen(hint.cx, hint.cy), width: Math.max(60, hint.r * 2 * view.s), height: Math.max(60, hint.r * 2 * view.s) }} />}
      </div>

      <div className="kc-top">
        <div className="pill">
          <small>Olay yeri</small> {C.scene.title} · {C.scene.time}
        </div>
        <div className="pill num">
          <small>Süre</small> {fmt(el)}
        </div>
        <div className="pill num">
          <small>Puan</small> {stats.current.score}
        </div>
        <button className="kc-btn small" onClick={useHint} disabled={hints <= 0}>
          İpucu ({hints})
        </button>
      </div>

      {line && <SubBox line={line} compact />}

      <div className="kc-strip" onPointerDown={(e) => e.stopPropagation()}>
        {want.map((k) => (
          <span key={k} className={'chip' + (got.has(k) ? ' got' : '') + (C.scene.evidence.includes(k) ? ' ev' : '')}>
            {data.items[k].label}
          </span>
        ))}
        <span className={'chip obs' + (spotsLeft === 0 ? ' got' : '')} title="Listede olmayan, olay yerinde dikkat çeken şeyler">
          Gözlem {Object.keys(data.spots).length - spotsLeft}/{Object.keys(data.spots).length}
        </span>
      </div>
    </div>
  );
}

// ---------------- sorgu merkezi ----------------
function Hub({ asked, notes, onOpen, onAccuse, canAccuse }) {
  return (
    <div className="kc-hub">
      <h2>Sorgu</h2>
      <p className="sub">Şüphelilerden birini seç. Karar vermek için her birine en az iki soru sor.</p>
      <div className="kc-sus">
        {Object.entries(C.suspects).map(([id, s]) => (
          <button
            key={id}
            className="sus"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(id);
            }}
          >
            <img src={`${BASE}kesit/${id}.webp`} alt="" />
            <b>{SPEAKERS[id].name}</b>
            <small>{s.role}</small>
            <em>
              {asked[id].size}/{s.q.length} soru
            </em>
          </button>
        ))}
      </div>
      <div className="kc-notes">
        <h3>Rıza Komiser’in defteri</h3>
        {notes.length ? (
          <ul>
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="empty">Henüz not yok.</p>
        )}
        <button
          className={'kc-btn' + (canAccuse ? '' : ' ghost')}
          onClick={(e) => {
            e.stopPropagation();
            onAccuse();
          }}
        >
          Karar ver
        </button>
      </div>
    </div>
  );
}

function Sorgu({ id, asked, got, seen, line, modal, fit, onAsk, onBack }) {
  const s = C.suspects[id];
  const has = (k) => !k || got.has(k) || seen.has(k);
  const fitting = fit && fit.id === id;
  const own = line && (line.s === id || line.s === id + '_cin');
  let main = own ? pic(line) : `${BASE}kesit/${id}.webp`;
  if (fitting) main = `${BASE}kesit/${s.possession.frames[fit.frame]}.webp`;
  const side = line && !own ? pic(line) : null;
  return (
    <div className={'kc-sorgu' + (fitting ? ' fitting' : '')}>
      {s.possession && s.possession.frames.map((f) => <link key={f} rel="preload" as="image" href={`${BASE}kesit/${f}.webp`} />)}
      <img className={'kc-cut main' + (fitting ? ' jerk' : '')} src={main} alt={SPEAKERS[id].name} key={fitting ? 'f' + fit.k : main} />
      {side && <img className="kc-cut side" src={side} alt="" key={side} />}
      <div className={'kc-qs' + (modal ? ' busy' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="who">
          <b>{SPEAKERS[id].name}</b>
          <small>{s.role}</small>
        </div>
        {s.q.map((q) => {
          const ok = has(q.need);
          return (
            <button key={q.id} className={'q' + (asked.has(q.id) ? ' asked' : '') + (q.need ? ' ev' : '')} disabled={!ok || modal} onClick={() => onAsk(q)}>
              {q.need && <span className="tagev">Delil</span>}
              {q.q}
            </button>
          );
        })}
        <button className="kc-btn ghost small" disabled={modal} onClick={onBack}>
          ← Şüphelilere dön
        </button>
      </div>
    </div>
  );
}

function Karar({ state, onChoose, onBack }) {
  const step = state.step === 'ok' ? 'why' : state.step;
  const Q = C.accuse[step];
  return (
    <div className="kc-karar" onClick={(e) => e.stopPropagation()}>
      <div className="paper">
        <small>Karar · Vaka {C.id}</small>
        <h2>{Q.q}</h2>
        <div className="opts">
          {Q.options.map((o) => (
            <button key={o.id} className="opt" onClick={() => onChoose(step, o.id)} disabled={state.step === 'ok'}>
              {step === 'who' && <img src={o.id === 'cin' ? (C.id === 1 ? `${BASE}cin.jpg` : `${BASE}kesit/gulsum_cin_1.webp`) : `${BASE}kesit/${o.id}.webp`} alt="" />}
              <span>{o.t}</span>
            </button>
          ))}
        </div>
        {state.step === 'ok' && <div className="stamp">İNSAN</div>}
        {state.step !== 'ok' && (
          <button className="kc-btn ghost small" onClick={onBack}>
            ← Sorguya dön
          </button>
        )}
      </div>
    </div>
  );
}

function Bitti({ stats, onAgain, onNext }) {
  const nx = CASES[C.id + 1];
  return (
    <div className="kc-end">
      <div className="paper">
        <small>Vaka {C.id} kapandı</small>
        <h2>{C.title}</h2>
        <div className="stars">{'★'.repeat(stats.stars) + '☆'.repeat(3 - stats.stars)}</div>
        <dl>
          <dt>Olay yeri süresi</dt>
          <dd>{fmt(stats.sceneTime)}</dd>
          <dt>Puan</dt>
          <dd>{stats.score}</dd>
          <dt>İpucu</dt>
          <dd>{stats.hints}</dd>
          <dt>Yanlış karar</dt>
          <dd>{stats.wrong}</dd>
        </dl>
        <p>Dedenin defterinde yeni bir sayfa açıldı. Sıradaki vaka: {C.next}{nx ? '' : ' · yakında'}</p>
        <div className="row">
          {nx && (
            <button
              className="kc-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNext(nx.id);
              }}
            >
              Sıradaki vaka
            </button>
          )}
          <button
            className="kc-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAgain();
            }}
          >
            Menüye dön
          </button>
          <a className="kc-btn ghost" href="/">
            Oyun salonu
          </a>
        </div>
      </div>
    </div>
  );
}

function Portrait({ line, side }) {
  return <img className={'kc-cut talk ' + side} src={pic(line)} alt="" key={pic(line)} />;
}

function SubBox({ line, compact }) {
  const sp = SPEAKERS[line.s] || { name: '', color: '#fff' };
  return (
    <div className={'kc-sub' + (compact ? ' compact' : '')} key={line.t}>
      <b style={{ color: sp.color }}>{sp.name}</b>
      <span>{line.t}</span>
    </div>
  );
}
