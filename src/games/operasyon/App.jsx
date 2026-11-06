import { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/Game.js';
import { ROLES, portrait } from './game/chars.js';
import { WEAPONS, PRIMARIES, ICON } from './game/weapons.js';
import * as S from './game/sfx.js';
import './op.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const DEBUG = QS.has('debug') || TEST;
const IS_TOUCH = QS.has('touch') || (typeof window !== 'undefined' && ('ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)));
const ROLE_LIST = ['komando', 'ozel', 'istihbarat', 'destek'];
const load = () => {
  try {
    return JSON.parse(localStorage.getItem('op-prefs') || '{}');
  } catch {
    return {};
  }
};
const fmt = (t) => {
  const s = Math.max(0, Math.floor(t));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

function WIcon({ id, className, fill = '#fff' }) {
  return (
    <svg className={className} viewBox="0 0 100 32" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {(ICON[id] || []).map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />)}
    </svg>
  );
}
function Emblem() {
  return (
    <svg className="op-emblem" viewBox="0 0 40 46" aria-hidden="true">
      <path d="M20 2 L37 8 V24 C37 34 29 41 20 44 C11 41 3 34 3 24 V8 Z" fill="#12203a" stroke="#f2c230" strokeWidth="2.5" />
      <path d="M20 10 L23 18 H31 L24.5 23 L27 31 L20 26 L13 31 L15.5 23 L9 18 H17 Z" fill="#f2c230" />
    </svg>
  );
}

const DIRS = [['K', 0], ['KD', 45], ['D', 90], ['GD', 135], ['G', 180], ['GB', 225], ['B', 270], ['KB', 315]];
function Compass({ heading }) {
  const deg = ((-heading * 180) / Math.PI + 720) % 360;
  const items = [];
  for (const [l, d] of DIRS)
    for (const off of [-360, 0, 360]) {
      const rel = d + off - deg;
      if (Math.abs(rel) <= 75) items.push(<span key={l + off} className={l.length === 1 ? 'main' : ''} style={{ left: `${50 + (rel / 75) * 50}%` }}>{l}</span>);
    }
  return <div className="op-compass">{items}<i /></div>;
}

function Minimap({ map, rects, size }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !map) return;
    const c = cv.getContext('2d');
    const W = cv.width, sc = W / 62, cx = W / 2, cy = W / 2;
    const cos = Math.cos(map.yaw), sin = Math.sin(map.yaw);
    const tr = (x, z) => {
      const dx = x - map.px, dz = z - map.pz;
      return [cx + (dx * cos - dz * sin) * sc, cy - (-dx * sin - dz * cos) * sc];
    };
    c.clearRect(0, 0, W, W);
    c.fillStyle = '#0c1424';
    c.fillRect(0, 0, W, W);
    const poly = (x0, z0, x1, z1, fill, stroke) => {
      c.beginPath();
      [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(([x, z], i) => {
        const [X, Y] = tr(x, z);
        i ? c.lineTo(X, Y) : c.moveTo(X, Y);
      });
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 1;
        c.stroke();
      }
    };
    poly(-36, -28, 36, 28, '#18233a', '#2c3c5c');
    for (const r of rects) poly(r[0], r[1], r[2], r[3], '#56627a', '#8493b0');
    const dot = (x, z, col, r = 3.2) => {
      const [X, Y] = tr(x, z);
      c.beginPath();
      c.arc(X, Y, r, 0, 6.3);
      c.fillStyle = col;
      c.fill();
    };
    if (map.pad) {
      const [X, Y] = tr(map.pad[0], map.pad[1]);
      c.strokeStyle = map.pad[2] ? '#f2c230' : '#6b7690';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(X, Y, 6 * sc, 0, 6.3);
      c.stroke();
      c.fillStyle = c.strokeStyle;
      c.font = `700 ${Math.round(W * 0.12)}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('H', X, Y + 1);
    }
    map.hostages.forEach((h) => dot(h[0], h[1], h[2] ? '#5fd07a' : '#f2c230', 3.6));
    map.friends.forEach((f) => dot(f[0], f[1], '#4aa3ff'));
    map.enemies.forEach((e) => dot(e[0], e[1], '#e5483a', 3.6));
    // oyuncu oku
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(cx, cy - 6);
    c.lineTo(cx + 4.5, cy + 4.5);
    c.lineTo(cx, cy + 2);
    c.lineTo(cx - 4.5, cy + 4.5);
    c.closePath();
    c.fill();
    // kuzey işareti
    const nxs = (0 * cos - -1 * sin), nup = -(0 * sin) - -1 * cos; // kuzey (0,-1)
    const na = Math.atan2(nxs, nup);
    const rr = W / 2 - 9;
    c.fillStyle = '#f2c230';
    c.font = `700 ${Math.round(W * 0.1)}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('K', cx + Math.sin(na) * rr, cy - Math.cos(na) * rr);
  }, [map, rects]);
  return <canvas ref={ref} className="op-minimap" width={size * 2} height={size * 2} style={{ width: size, height: size }} />;
}

function Stick({ onMove }) {
  const base = useRef(null);
  const id = useRef(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  const upd = (e) => {
    const r = base.current.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = r.width / 2, L = Math.hypot(dx, dy);
    if (L > m) {
      dx = (dx / L) * m;
      dy = (dy / L) * m;
    }
    setK({ x: dx, y: dy });
    onMove(dx / m, -dy / m);
  };
  const end = () => {
    id.current = null;
    setK({ x: 0, y: 0 });
    onMove(0, 0);
  };
  return (
    <div
      ref={base}
      className="op-stick"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        id.current = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        upd(e);
      }}
      onPointerMove={(e) => id.current === e.pointerId && upd(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <i style={{ transform: `translate(${k.x}px, ${k.y}px)` }} />
    </div>
  );
}

export default function App() {
  const prefs = useRef(load()).current;
  const cv = useRef(null);
  const game = useRef(null);
  const look = useRef({});
  const [screen, setScreen] = useState('menu');
  const [role, setRole] = useState(ROLE_LIST.includes(prefs.role) ? prefs.role : 'komando');
  const [weapon, setWeapon] = useState(PRIMARIES.includes(prefs.weapon) ? prefs.weapon : 'm4');
  const [nick, setNick] = useState(prefs.nick || 'Enes');
  const [sound, setSound] = useState(prefs.sound !== false);
  const [hud, setHud] = useState(null);
  const [locked, setLocked] = useState(false);
  const [userPause, setUserPause] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [end, setEnd] = useState(null);
  const [how, setHow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('op-prefs', JSON.stringify({ role, weapon, nick, sound }));
    } catch {}
  }, [role, weapon, nick, sound]);
  useEffect(() => S.setSound(sound), [sound]);

  useEffect(() => {
    const g = new Game(cv.current, {
      touch: IS_TOUCH,
      cb: {
        onHud: setHud,
        onLock: setLocked,
        onToast: (text) => {
          const id = Math.random();
          setToasts((t) => [...t.slice(-2), { id, text }]);
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
        },
        onEnd: (s) => {
          setEnd(s);
          setScreen('end');
        },
      },
    });
    game.current = g;
    setReady(true);
    if (TEST) window.__op = g;
    return () => {
      g.dispose();
      game.current = null;
    };
  }, []);

  const paused = screen === 'play' && !TEST && hud?.mode === 'play' && hud.phase === 'play' && (userPause || (!IS_TOUCH && !locked));
  useEffect(() => {
    game.current?.setPaused(!!paused);
  }, [paused]);

  const begin = useCallback(() => {
    const g = game.current;
    if (!g) return;
    S.unlock();
    setEnd(null);
    setToasts([]);
    setUserPause(false);
    g.start({ role, weapon, nick: nick.trim() || 'Enes' });
    setScreen('play');
    if (!IS_TOUCH && !TEST) g.cv.requestPointerLock?.();
  }, [role, weapon, nick]);
  useEffect(() => {
    if (ready && QS.has('quick')) {
      const g = game.current;
      g.start({ role: QS.get('role') || 'komando', weapon: QS.get('w') || 'm4', nick: 'Enes' });
      setScreen('play');
    }
  }, [ready]);
  const toMenu = () => {
    game.current?.toMenu();
    setScreen('menu');
    setHud(null);
    setUserPause(false);
  };
  const resume = () => {
    setUserPause(false);
    if (!IS_TOUCH) game.current?.cv.requestPointerLock?.();
  };
  const openPause = () => {
    if (document.pointerLockElement) document.exitPointerLock?.();
    setUserPause(true);
  };

  const g = game.current;
  const lookStart = (e) => {
    look.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const lookMove = (e) => {
    const l = look.current[e.pointerId];
    if (!l) return;
    game.current?.look(e.clientX - l.x, e.clientY - l.y);
    l.x = e.clientX;
    l.y = e.clientY;
  };
  const lookEnd = (e) => delete look.current[e.pointerId];
  const hold = (fn) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      fn(true);
    },
    onPointerUp: () => fn(false),
    onPointerCancel: () => fn(false),
    onLostPointerCapture: () => fn(false),
  });
  const tap = (fn) => hold((v) => v && fn());

  const h = hud && hud.mode === 'play' ? hud : null;
  const rects = g?.mapRects || [];
  const me = h?.team?.[0];
  const hpSeg = h ? Math.ceil((h.hp / h.maxHp) * 10) : 0;

  return (
    <div className={'op-root' + (IS_TOUCH ? ' touch' : '')}>
      <canvas ref={cv} className="op-canvas" />

      {screen !== 'play' && screen !== 'end' && <div className="op-shade" />}

      {screen === 'menu' && (
        <div className="op-menu">
          <a className="op-back" href="/">← Oyun Salonu</a>
          <div className="op-logo">
            <Emblem />
            <div>
              <h1>OPERASYON</h1>
              <h2><i />KURTARMA<i /></h2>
              <small>BİRLİKTE DAHA GÜÇLÜ</small>
            </div>
          </div>
          <div className="op-menu-btns">
            <button className="op-btn primary" onClick={() => setScreen('char')}>Göreve başla</button>
            <button className="op-btn" onClick={() => setHow(true)}>Nasıl oynanır</button>
            <button className="op-btn" onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
            <button className="op-btn dis" disabled>4 kişilik online · yakında</button>
          </div>
          <p className="op-fine">Tamamen kurgusal bir görev. Takım arkadaşların botlardır; online co-op sonraki sürümde.</p>
        </div>
      )}

      {screen === 'char' && (
        <div className="op-page">
          <button className="op-link" onClick={() => setScreen('menu')}>← Geri</button>
          <h3 className="op-ptitle">KARAKTER SEÇİMİ</h3>
          <div className="op-chars">
            {ROLE_LIST.map((r) => (
              <button key={r} className={'op-char' + (role === r ? ' sel' : '')} onClick={() => setRole(r)}>
                <img src={portrait(r, 120)} alt="" />
                <b>{ROLES[r].name}</b>
                <small>{ROLES[r].desc}</small>
              </button>
            ))}
          </div>
          <label className="op-nick">Takma adın <input value={nick} maxLength={12} onChange={(e) => setNick(e.target.value)} /></label>
          <button className="op-btn primary wide" onClick={() => setScreen('weapon')}>Devam</button>
        </div>
      )}

      {screen === 'weapon' && (
        <div className="op-page">
          <button className="op-link" onClick={() => setScreen('char')}>← Geri</button>
          <h3 className="op-ptitle">SİLAH SEÇİMİ</h3>
          <div className="op-wsel">
            <div className="op-wlist">
              {PRIMARIES.map((w) => (
                <button key={w} className={'op-witem' + (weapon === w ? ' sel' : '')} onClick={() => setWeapon(w)}>
                  <WIcon id={w} className="mini" />
                  <span>{WEAPONS[w].name}</span>
                </button>
              ))}
              <div className="op-witem fixed"><WIcon id="pistol" className="mini" /><span>Tabanca · yan silah</span></div>
            </div>
            <div className="op-wprev">
              <WIcon id={weapon} className="big" />
              {['Hasar', 'Hız', 'İsabet', 'Menzil'].map((n, i) => (
                <div key={n} className="op-stat"><span>{n}</span><div><i style={{ width: WEAPONS[weapon].stats[i] + '%' }} /></div></div>
              ))}
              <div className="op-gear">Ekipman: 3 el bombası · {ROLES[role].med} ilk yardım · {ROLES[role].drone} keşif dronu</div>
              <button className="op-btn primary" onClick={() => setScreen('brief')}>Seç</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'brief' && (
        <div className="op-page">
          <button className="op-link" onClick={() => setScreen('weapon')}>← Geri</button>
          <div className="op-brief">
            <h3>1. OPERASYON — SANAYİ TESİSİ</h3>
            <p>Terk edilmiş bir sanayi bölgesinde silahlı bir grup rehine tutuyor. Tesise sız, rehineleri kurtar ve tahliye helikopterine ulaş. Silah sesi tüm tesisi uyandırır; siper al, ekibinle hareket et.</p>
            <ul>
              <li>Tesise sız</li>
              <li>Rehineleri kurtar (0/3)</li>
              <li>Tahliye noktasına ulaş</li>
            </ul>
            <div className="op-brief-me">
              <img src={portrait(role, 64)} alt="" />
              <span>{ROLES[role].name} · {WEAPONS[weapon].name}</span>
            </div>
            <button className="op-btn primary wide" onClick={begin}>Göreve çık</button>
          </div>
        </div>
      )}

      {screen === 'play' && h && (
        <div className={'op-hud' + (h.ads > 0.3 ? ' ads' : '')}>
          {h.scoped && (
            <div className="op-scope"><i className="h" /><i className="v" /></div>
          )}
          <div className="op-hurt" style={{ opacity: Math.min(0.75, h.hurt) }} />
          {h.hp < h.maxHp * 0.3 && <div className="op-low" />}
          {h.dmg.map((d) => (
            <div key={d.id} className="op-dmg" style={{ transform: `translate(-50%,-50%) rotate(${-d.rel}rad)`, opacity: d.a }}><i /></div>
          ))}
          <button className="op-x" onClick={openPause} aria-label="Duraklat">✕</button>

          <div className="op-tl">
            <Minimap map={h.map} rects={rects} size={IS_TOUCH ? 92 : 128} />
            <div className="op-mission op-panel">
              <div className="op-mtitle"><Emblem />Operasyon: Demir Vadi</div>
              {h.objectives.map((o, i) => (
                <div key={i} className={'op-obj' + (o.done ? ' done' : '')}><b>{o.done ? '✔' : ''}</b><span>{o.text}</span></div>
              ))}
            </div>
          </div>

          <Compass heading={h.heading} />
          <div className="op-banner"><i />{h.banner}</div>

          <div className="op-tr">
            <div className="op-chip op-panel"><span>⏱ {fmt(h.time)}</span><span>👤 {h.aliveCount}/4</span></div>
            <div className="op-team">
              {h.team.map((m, i) => (
                <div key={i} className={'op-mate' + (m.dead ? ' dead' : '')}>
                  <img src={portrait(m.role, 72)} alt="" />
                  <div className="bar"><i style={{ width: Math.max(0, (m.hp / m.maxHp) * 100) + '%' }} /></div>
                </div>
              ))}
            </div>
          </div>

          {h.wp && (
            <div className={'op-wp ' + h.wp.kind + (h.wp.edge ? ' edge' : '')} style={{ left: h.wp.x + '%', top: h.wp.y + '%' }}>
              <div className="ico">{h.wp.kind === 'hostage' ? '👥' : h.wp.kind === 'evac' ? 'H' : '◆'}</div>
              <span>{h.wp.dist} m</span>
            </div>
          )}

          {!h.scoped && h.ads < 0.5 && <div className="op-cross"><i /><i /><i /><i /></div>}
          {h.hit && <div key={h.hit.id} className={'op-hitm' + (h.hit.kill ? ' kill' : '') + (h.hit.head ? ' head' : '')} />}

          {h.prompt && (
            <div className="op-prompt">
              {!IS_TOUCH && <kbd>E</kbd>} <span>{h.prompt}</span>
              {h.progress > 0 && <div className="bar"><i style={{ width: h.progress * 100 + '%' }} /></div>}
            </div>
          )}
          {h.evacHold > 0 && <div className="op-prompt up"><span>Helikoptere biniliyor…</span><div className="bar"><i style={{ width: h.evacHold * 100 + '%' }} /></div></div>}

          <div className="op-radio">
            {toasts.map((t) => <div key={t.id} className="op-toast">{t.text}</div>)}
          </div>

          <div className="op-bl">
            <div className="op-me op-panel">
              <img src={portrait(role, 96)} alt="" />
              <div>
                <b>{me?.name}</b>
                <div className="hp"><em>+</em>{h.hp}</div>
                <div className="segs">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < hpSeg ? (h.hp < h.maxHp * 0.3 ? 'on low' : 'on') : ''} />)}</div>
              </div>
            </div>
            <div className="op-gear-row">
              {[['Q', '💣', h.gear.nade], ['G', '✚', h.gear.med], ['F', '🛰', h.gear.drone]].map(([k, ic, n]) => (
                <div key={k} className={'op-slot' + (n <= 0 ? ' empty' : '')}><span>{ic}</span><kbd>{k}</kbd><b>{n}</b></div>
              ))}
            </div>
          </div>

          <div className="op-br op-panel">
            <div className="main">
              <WIcon id={h.wid} className="wic" />
              <div className="ammo">{h.reload >= 0 ? <em>…</em> : <b className={h.ammo <= 5 ? 'low' : ''}>{h.ammo}</b>}<small>/ {h.reserve}</small></div>
              <kbd className="sl">{h.slot + 1}</kbd>
            </div>
            <div className="sec"><WIcon id={h.slot === 0 ? 'pistol' : g?.slots?.[0]?.id} className="wic s" fill="#9fb0cc" /><kbd className="sl">{h.slot === 0 ? 2 : 1}</kbd></div>
            {h.reload >= 0 && <div className="rl"><i style={{ width: h.reload * 100 + '%' }} /></div>}
          </div>

          {DEBUG && <div className="op-dbg">FPS {h.fps}</div>}
          {h.reveal > 0 && <div className="op-drone">DRON · {Math.ceil(h.reveal)} sn</div>}

          {IS_TOUCH && (
            <>
              <div className="op-lookzone" onPointerDown={lookStart} onPointerMove={lookMove} onPointerUp={lookEnd} onPointerCancel={lookEnd} />
              <div className="op-touch">
                <Stick onMove={(x, y) => game.current?.setMove(x, y)} />
                <div className="op-tbtns">
                  <button className="fire" {...hold((v) => game.current?.setFire(v))}>Ateş</button>
                  <button className="ads" {...tap(() => game.current?.toggleAds())}>Nişan</button>
                  <button className="jump" {...tap(() => game.current?.jump())}>Zıpla</button>
                  <button className="rel" {...tap(() => game.current?.doReload())}>R</button>
                  <button className="swp" {...tap(() => game.current?.setSlot(game.current.slot ? 0 : 1))}>Silah</button>
                  <button className="nade" {...tap(() => game.current?.throwNade())}>Bomba</button>
                  <button className="med" {...tap(() => game.current?.useMed())}>Şifa</button>
                  <button className="drn" {...tap(() => game.current?.useDrone())}>Dron</button>
                  <button className="crh" {...tap(() => game.current?.toggleCrouch())}>Eğil</button>
                  <button className={'use' + (h.prompt ? ' on' : '')} {...hold((v) => game.current?.setInteract(v))}>E</button>
                </div>
              </div>
            </>
          )}

          {paused && (
            <div className="op-modal">
              <div className="op-card">
                <h3>DURAKLATILDI</h3>
                <button className="op-btn primary" onClick={resume}>Devam et</button>
                <button className="op-btn" onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
                <button className="op-btn" onClick={toMenu}>Ana menü</button>
                {!IS_TOUCH && <p>WASD yürü · Shift koş · Boşluk zıpla · C eğil · R doldur · 1/2 silah · Sağ tık nişan · Q bomba · G ilk yardım · F dron · E (basılı) rehine kurtar</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {screen === 'end' && end && (
        <div className="op-modal">
          <div className="op-card end">
            <small>{end.win ? 'GÖREV TAMAMLANDI' : 'GÖREV BAŞARISIZ'}</small>
            <h3 className={end.win ? 'win' : 'lose'}>{end.win ? 'Rehineler güvende!' : 'Operasyon başarısız'}</h3>
            <div className="op-res">
              <div><b>{fmt(end.time)}</b><span>Süre</span></div>
              <div><b>{end.rescued}/3</b><span>Rehine</span></div>
              <div><b>{end.kills}/{end.total}</b><span>Etkisiz</span></div>
              <div><b>{end.alive}/4</b><span>Ekip</span></div>
            </div>
            <button className="op-btn primary" onClick={begin}>Tekrar oyna</button>
            <button className="op-btn" onClick={() => setScreen('char')}>Karakter / silah değiştir</button>
            <button className="op-btn" onClick={toMenu}>Ana menü</button>
          </div>
        </div>
      )}

      {how && (
        <div className="op-modal" onClick={() => setHow(false)}>
          <div className="op-card how">
            <h3>NASIL OYNANIR</h3>
            <ul>
              <li><b>Hedef:</b> tesise sız, 3 rehineyi kurtar (E tuşunu basılı tut), helikopter inince rehinelerle birlikte pistte bekle.</li>
              <li><b>Kontroller:</b> WASD yürü, Shift koş, Boşluk zıpla, C eğil, fare nişan/ateş, sağ tık dürbün, R doldur, 1/2 silah, Q bomba, G ilk yardım, F dron.</li>
              <li><b>Telefonda:</b> sol çubuk yürü, ekranın sağını sürükleyerek bak, düğmelerle ateş et.</li>
              <li><b>İpucu:</b> silah sesi düşmanları uyandırır. Siperden çık-gir, takım arkadaşların seni takip eder ve ateş eder.</li>
            </ul>
            <button className="op-btn primary" onClick={() => setHow(false)}>Tamam</button>
          </div>
        </div>
      )}
    </div>
  );
}
