import { useEffect, useRef, useState } from 'react';
import { Arena, WIN_SCORE } from './game/Arena.js';
import { HX, HZ, TEAM } from './game/map.js';
import RoomLobby from '../../engine/RoomLobby.jsx';
import { MemHub, createRoom, joinRoom } from '../../engine/oproom.js';
import * as S from '../bulutyaris/game/sfx.js';
import { setSamples } from '../../engine/models.js';
import './boyabaskin.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const readPrefs = () => { try { return JSON.parse(localStorage.getItem('bb-prefs') || '{}'); } catch { return {}; } };
const DIFFS = [['easy', 'Kolay'], ['normal', 'Normal'], ['hard', 'Zor']];

export default function App() {
  const cv = useRef(null), game = useRef(null), mm = useRef(null);
  const prefs = readPrefs();
  const [screen, setScreen] = useState(QS.get('oda') ? 'lobby' : 'menu');
  const [nick, setNick] = useState(prefs.nick || '');
  const [diff, setDiff] = useState(prefs.diff || 'normal');
  const [sound, setSound] = useState(prefs.sound !== false);
  const [h, setH] = useState(null);
  const [brief, setBrief] = useState(null);
  const [end, setEnd] = useState(null);
  const [how, setHow] = useState(false);
  const [msg, setMsg] = useState('');
  const stick = useRef({ id: null, ox: 0, oy: 0 }); const [knob, setKnob] = useState(null);
  const lk = useRef(null);

  useEffect(() => { try { localStorage.setItem('bb-prefs', JSON.stringify({ nick, diff, sound })); } catch { /* yok say */ } S.setSound(sound); setSamples(sound); }, [nick, diff, sound]);
  useEffect(() => {
    const g = new Arena(cv.current, { touch: IS_TOUCH, onHud: (x, mini) => { setH(x); drawMini(mm.current, mini, x); }, onBrief: setBrief, onEnd: (s) => { setEnd(s); setTimeout(() => setScreen('end'), 4200); }, onNetClosed: () => { g.toMenu(); setMsg('Kurucu odadan ayrıldı.'); setScreen('menu'); } });
    game.current = g;
    if (TEST) { window.__bb = g; window.__BB = { Arena, MemHub, createRoom, joinRoom }; }
    return () => g.dispose();
  }, []);

  const ready = () => Promise.race([game.current.assetP, new Promise((r) => setTimeout(r, 5000))]);
  const solo = async () => { await ready(); setEnd(null); setH(null); setMsg(''); game.current.start({ nick: nick.trim() || 'Sen', diff, auto: QS.has('auto') }); setScreen('play'); };
  const beginOnline = async (room, host, meta) => { await ready(); const g = game.current; setEnd(null); setH(null); setMsg(''); const on = g.attachOnline(room, meta); g.start({ online: on }); setScreen('play'); };
  useEffect(() => { if (QS.has('quick')) setTimeout(solo, 300); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    const k = { l: 0, r: 0, u: 0, d: 0 }; const upd = () => game.current?.setMove(k.r - k.l, k.u - k.d);
    const key = (down) => (e) => {
      const g = game.current; if (!g) return; const c = e.key.toLowerCase();
      if (c === 'arrowleft' || c === 'a') k.l = down ? 1 : 0; else if (c === 'arrowright' || c === 'd') k.r = down ? 1 : 0; else if (c === 'arrowup' || c === 'w') k.u = down ? 1 : 0; else if (c === 'arrowdown' || c === 's') k.d = down ? 1 : 0;
      else if (c === ' ') { if (down) g.jump(); e.preventDefault(); } else if (c === 'f' || c === 'enter') g.input.fire = down;
      upd();
    };
    const md = (e) => { if (e.button === 0 && e.target === cv.current) game.current && (game.current.input.fire = true); }, mu = () => { if (game.current) game.current.input.fire = false; };
    const mv = (e) => { if (document.pointerLockElement === cv.current) game.current?.look(e.movementX, e.movementY); };
    const d = key(true), u = key(false); addEventListener('keydown', d); addEventListener('keyup', u); addEventListener('mousedown', md); addEventListener('mouseup', mu); addEventListener('mousemove', mv);
    return () => { removeEventListener('keydown', d); removeEventListener('keyup', u); removeEventListener('mousedown', md); removeEventListener('mouseup', mu); removeEventListener('mousemove', mv); };
  }, []);

  const R = 50;
  const sd = (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); stick.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }); };
  const sm = (e) => { const s = stick.current; if (s.id !== e.pointerId) return; let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy); if (m > R) { dx = dx / m * R; dy = dy / m * R; } game.current?.setMove(dx / R, -dy / R); setKnob({ x: s.ox, y: s.oy, dx, dy }); };
  const su = (e) => { if (stick.current.id === e.pointerId) { stick.current.id = null; game.current?.setMove(0, 0); setKnob(null); } };
  const ld = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); lk.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
  const lm = (e) => { const d = lk.current; if (!d || d.id !== e.pointerId) return; game.current?.look(e.clientX - d.x, e.clientY - d.y); d.x = e.clientX; d.y = e.clientY; };
  const lu = (e) => { if (lk.current?.id === e.pointerId) lk.current = null; };
  const fire = (v) => (e) => { e.preventDefault(); if (game.current) game.current.input.fire = v; };

  const playing = screen === 'play' && h;
  const live = playing && h.phase === 'play';
  const myName = nick.trim() || 'Oyuncu';
  const tm = h ? TEAM[h.team] : TEAM[0];
  return (
    <div className="bb">
      <canvas ref={cv} className="bb-cv" onClick={(e) => { if (!IS_TOUCH && !document.pointerLockElement) e.currentTarget.requestPointerLock?.(); }} />
      {playing && (
        <>
          <div className="bb-hud">
            <div className="bb-top">
              <div className="bb-score"><b style={{ color: TEAM[0].css }}>{h.score[0]}</b><span>{String(Math.floor(h.timeLeft / 60))}:{String(h.timeLeft % 60).padStart(2, '0')}</span><b style={{ color: TEAM[1].css }}>{h.score[1]}</b></div>
              <small>İlk {WIN_SCORE} kurtarış kazanır{h.sudden ? ' · ALTIN KURTARIŞ' : ''}</small>
            </div>
            {live && <div className="bb-state" style={{ borderColor: tm.css }}>{h.state}</div>}
            {live && <div className="bb-compass" title={h.lab}><i style={{ transform: `rotate(${-h.rel * 180 / Math.PI}deg)` }}>▲</i><small>{Math.round(h.dist)}m · {h.lab}</small></div>}
            <canvas ref={mm} className="bb-mini" width="110" height="160" />
            <div className="bb-feed">{h.feed.map((f, i) => <div key={i} style={{ color: f.c }}>{f.t}</div>)}</div>
            {live && <div className="bb-cross" />}
            {live && <div className="bb-hp">{[0, 1, 2].map((i) => <b key={i} className={i < h.hp ? 'on' : ''} style={{ background: i < h.hp ? tm.css : undefined }} />)}</div>}
            {live && (h.buffs.speed > 0 || h.buffs.shield > 0 || h.buffs.triple > 0) && <div className="bb-buffs">{h.buffs.speed > 0 && <span>⚡ {h.buffs.speed}</span>}{h.buffs.shield > 0 && <span>🛡 {h.buffs.shield}</span>}{h.buffs.triple > 0 && <span>✦✦✦ {h.buffs.triple}</span>}</div>}
            {live && h.ft >= 0 && h.fp > 0 && <div className="bb-free"><i style={{ width: `${h.fp * 100}%`, background: TEAM[h.ft].css }} /><small>Serbest bırakılıyor…</small></div>}
            {h.msg && <div className="bb-msg">{h.msg}</div>}
            {h.count > 0 && <div className="bb-count" key={h.count}>{h.count}</div>}
            {h.big && <div className="bb-big" key={h.big}>{h.big}</div>}
            {h.dead && h.phase === 'play' && <div className="bb-dead"><b>VURULDUN!</b><span>{h.resp > 0 ? `${h.resp} sn sonra üste dönüyorsun` : ''}</span></div>}
            <div className="bb-vig" style={{ opacity: h.hit * 0.8 }} />
          </div>
          {live && (
            <>
              <div className="bb-zone stick" onPointerDown={sd} onPointerMove={sm} onPointerUp={su} onPointerCancel={su} />
              <div className="bb-zone look" onPointerDown={ld} onPointerMove={lm} onPointerUp={lu} onPointerCancel={lu} />
              {knob && <div className="bb-knob" style={{ left: knob.x - 52, top: knob.y - 52 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
              <button className="bb-fire" onPointerDown={fire(true)} onPointerUp={fire(false)} onPointerLeave={fire(false)} onPointerCancel={fire(false)}>ATEŞ</button>
              <button className="bb-jump" onPointerDown={(e) => { e.preventDefault(); game.current?.jump(); }}>ZIPLA</button>
            </>
          )}
          {brief && (
            <div className="bb-brief" onPointerDown={() => game.current?.briefTap()}>
              <small>ÖRDEK BEY KURTARMA · FİNAL</small><p>{brief.text}</p><em>{brief.i + 1}/{brief.n} · dokun: geç</em>
            </div>
          )}
          {end && h.phase === 'end' && <div className="bb-winner" style={{ color: TEAM[end.winner]?.css }}>{end.mine ? 'KAZANDINIZ!' : `${TEAM[end.winner]?.name} TAKIM KAZANDI`}</div>}
        </>
      )}
      {screen === 'menu' && (
        <div className="bb-menu">
          <div className="bb-logo"><small>3B TAKIM OYUNU</small><b>BOYA BASKINI</b><i>Ördek Bey’i Kurtar</i></div>
          {msg && <p className="bb-err">{msg}</p>}
          <p className="bb-sub">Boyalı toplarla iki takım karşı karşıya. Sahanın ortasındaki kafesten maskot Ördek Bey’i kurtarıp üssüne ilk götüren takım puan alır. Haritada güç artışları var: hız, kalkan, üçlü atış.</p>
          <label className="bb-name">Adın <input maxLength={12} value={nick} placeholder="Oyuncu" onChange={(e) => setNick(e.target.value)} /></label>
          <button className="bb-go" onClick={() => { setMsg(''); setScreen('lobby'); }}>ARKADAŞLARLA OYNA (2–4)</button>
          <div className="bb-chips">{DIFFS.map(([k, t]) => <button key={k} className={diff === k ? 'on' : ''} onClick={() => setDiff(k)}>{t}</button>)}</div>
          <button className="bb-go alt" onClick={solo}>BOTLARA KARŞI (2’ye 2)</button>
          <div className="bb-row"><button onClick={() => setHow(true)}>Nasıl oynanır</button><button onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
      {screen === 'lobby' && (
        <RoomLobby path="/boyabaskin" title="BOYA BASKINI · ONLİNE ODA" info={{ n: myName }} hostMeta={{ game: 'bb' }} initialCode={QS.get('oda') || ''}
          rowExtra={(p, u, i) => (i % 2 ? 'Mavi takım' : 'Kırmızı takım')}
          hostPanel={() => (<><label className="rl-fine">Adın <input className="rl-in small" maxLength={12} value={nick} placeholder="Oyuncu" onChange={(e) => setNick(e.target.value)} /></label><p className="rl-fine">Takımlar katılış sırasına göre: 1-3 kırmızı, 2-4 mavi. En az 2 kişi gerekir.</p></>)}
          guestNote={() => <label className="rl-fine">Adın <input className="rl-in small" maxLength={12} value={nick} placeholder="Oyuncu" onChange={(e) => setNick(e.target.value)} /></label>}
          buildStartMeta={() => ({})} onStart={beginOnline} onBack={() => setScreen('menu')} minPlayers={2} />
      )}
      {how && (
        <div className="bb-modal" onClick={() => setHow(false)}><div className="bb-card" onClick={(e) => e.stopPropagation()}>
          <h3>Nasıl oynanır</h3>
          <ul>
            <li>Sol başparmakla yürü, sağ yarıyı sürükleyerek etrafına bak, ATEŞ ile boya topu at, ZIPLA ile alçak siperlere çık.</li>
            <li>Kafese yaklaş ve bekle: Ördek Bey serbest kalır. Onu omzuna alıp kendi üssündeki halkaya götür, takımın 1 puan alır.</li>
            <li>Vurulursan 3 sn oyundan çıkarsın. Taşıyıcı vurulursa Ördek Bey yere düşer, kapan.</li>
            <li>Renkli küreleri topla: ⚡ hız, 🛡 kalkan, ✦ üçlü atış.</li>
            <li>İlk {WIN_SCORE} kurtarışa ulaşan takım kazanır. Küçük harita köşede.</li>
          </ul>
          <button className="bb-go small" onClick={() => setHow(false)}>Tamam</button>
        </div></div>
      )}
      {screen === 'end' && end && (
        <div className="bb-menu end">
          <div className="bb-logo"><small>{end.mine ? 'ŞAMPİYONLAR!' : 'MAÇ BİTTİ'}</small><b style={{ color: TEAM[end.winner]?.css }}>{TEAM[end.winner]?.name} TAKIM</b><i>{end.score[0]} – {end.score[1]}</i></div>
          <table className="bb-table"><thead><tr><th>Oyuncu</th><th>Kurtarış</th><th>Vuruş</th><th>Vurulma</th></tr></thead><tbody>{end.rows.map((r, i) => <tr key={i} className={r.me ? 'me' : ''}><td><i style={{ background: TEAM[r.team].css }} />{r.name}</td><td>{r.rescues}</td><td>{r.kills}</td><td>{r.deaths}</td></tr>)}</tbody></table>
          {end.solo && <button className="bb-go" onClick={solo}>TEKRAR OYNA</button>}
          <div className="bb-row"><button onClick={() => { game.current.toMenu(); setScreen('menu'); }}>Menü</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
    </div>
  );
}

function drawMini(cv, m, h) {
  if (!cv || !m || !h) return; const x = cv.getContext('2d'), W = cv.width, H = cv.height, flip = h.team === 1;
  const px = (X) => (((flip ? -X : X) + HX) / (HX * 2)) * W, pz = (Z) => (((flip ? -Z : Z) + HZ) / (HZ * 2)) * H;
  x.clearRect(0, 0, W, H); x.fillStyle = 'rgba(30,50,30,.72)'; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(229,72,58,.35)'; x.fillRect(0, flip ? 0 : H - 14, W, 14); x.fillStyle = 'rgba(47,127,216,.35)'; x.fillRect(0, flip ? H - 14 : 0, W, 14);
  x.fillStyle = 'rgba(210,215,230,.55)'; for (const b of m.boxes) { const X = px(b.x), Z = pz(b.z), w = Math.max(2, (b.w / (HX * 2)) * W), d = Math.max(2, (b.d / (HZ * 2)) * H); x.fillRect(X - w / 2, Z - d / 2, w, d); }
  for (const k of m.pk) if (k.on) { x.fillStyle = '#ffe36a'; x.fillRect(px(k.x) - 1.5, pz(k.z) - 1.5, 3, 3); }
  x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(px(m.duck.x), pz(m.duck.z), 4.5, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.stroke();
  for (const p of m.players) { if (p.dead) continue; x.fillStyle = TEAM[p.team].css; x.beginPath(); x.arc(px(p.x), pz(p.z), p.me ? 4.5 : 3.2, 0, 7); x.fill(); if (p.me) { x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke(); } }
}
