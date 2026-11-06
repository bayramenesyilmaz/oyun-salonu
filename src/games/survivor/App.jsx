import { useEffect, useRef, useState } from 'react';
import { Party, COLORS } from './game/Party.js';
import RoomLobby from '../../engine/RoomLobby.jsx';
import { MemHub, createRoom, joinRoom } from '../../engine/oproom.js';
import * as S from '../bulutyaris/game/sfx.js';
import './survivor.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const readPrefs = () => { try { return JSON.parse(localStorage.getItem('sv-prefs') || '{}'); } catch { return {}; } };
const meta0 = { current: null };

export default function App() {
  const cv = useRef(null);
  const game = useRef(null);
  const prefs = readPrefs();
  const [screen, setScreen] = useState(QS.get('oda') ? 'lobby' : 'menu');
  const [nick, setNick] = useState(prefs.nick || '');
  const [mode, setMode] = useState(prefs.mode || 'ffa');
  const [sound, setSound] = useState(prefs.sound !== false);
  const [h, setH] = useState(null);
  const [res, setRes] = useState(null);
  const [fin, setFin] = useState(null);
  const [how, setHow] = useState(false);
  const [msg, setMsg] = useState('');
  const stick = useRef({ id: null, ox: 0, oy: 0 });
  const [knob, setKnob] = useState(null);
  const drag = useRef(null);
  const [aim, setAim] = useState(null);

  useEffect(() => {
    try { localStorage.setItem('sv-prefs', JSON.stringify({ nick, mode, sound })); } catch { /* yok say */ }
    S.setSound(sound);
  }, [nick, mode, sound]);

  useEffect(() => {
    const g = new Party(cv.current, {
      touch: IS_TOUCH,
      onHud: (x) => { setH(x); if (x.phase !== 'result') setRes((r) => (r ? null : r)); },
      onResult: setRes,
      onFinal: (f) => { setFin(f); setScreen('final'); },
      onNetClosed: () => { g.toMenu(); setMsg('Kurucu odadan ayrıldı.'); setScreen('menu'); },
    });
    game.current = g;
    if (TEST) { window.__party = g; window.__SV = { Party, MemHub, createRoom, joinRoom }; }
    return () => g.dispose();
  }, []);

  const solo = () => { setFin(null); setRes(null); setH(null); game.current.start({ mode: 'solo', nick: nick.trim() || 'Sen' }); setScreen('play'); };
  const beginOnline = (room, host, meta) => {
    const g = game.current;
    setFin(null); setRes(null); setH(null); setMsg('');
    const on = g.attachOnline(room, meta);
    g.start({ mode: meta.mode === 'team' ? 'team' : 'ffa', online: on });
    setScreen('play');
  };
  useEffect(() => { if (QS.has('quick')) setTimeout(solo, 300); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    const k = { l: 0, r: 0, u: 0, d: 0 };
    const upd = () => game.current?.setMove(k.r - k.l, k.u - k.d);
    const key = (down) => (e) => {
      const g = game.current; if (!g) return;
      const c = e.key.toLowerCase();
      if (c === 'arrowleft' || c === 'a') { k.l = down ? 1 : 0; upd(); }
      else if (c === 'arrowright' || c === 'd') { k.r = down ? 1 : 0; upd(); }
      else if (c === 'arrowup' || c === 'w') { k.u = down ? 1 : 0; upd(); }
      else if (c === 'arrowdown' || c === 's') { k.d = down ? 1 : 0; upd(); }
      else if (c === ' ' && down) { g.act(); e.preventDefault(); }
    };
    const d = key(true), u = key(false);
    addEventListener('keydown', d); addEventListener('keyup', u);
    return () => { removeEventListener('keydown', d); removeEventListener('keyup', u); };
  }, []);

  const R = 52;
  const sd = (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); stick.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }); };
  const sm = (e) => {
    const s = stick.current; if (s.id !== e.pointerId) return;
    let dx = e.clientX - s.ox, dy = e.clientY - s.oy; const m = Math.hypot(dx, dy);
    if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R; }
    game.current?.setMove(dx / R, -dy / R); setKnob({ x: s.ox, y: s.oy, dx, dy });
  };
  const su = (e) => { if (stick.current.id === e.pointerId) { stick.current.id = null; game.current?.setMove(0, 0); setKnob(null); } };
  const fd = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; setAim({ x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY }); };
  const fm = (e) => { const d = drag.current; if (d && d.id === e.pointerId) setAim({ x: d.x, y: d.y, cx: e.clientX, cy: e.clientY }); };
  const fu = (e) => { const d = drag.current; if (d && d.id === e.pointerId) { game.current?.flick(e.clientX - d.x, e.clientY - d.y); drag.current = null; setAim(null); } };
  const playing = screen === 'play';
  const myName = nick.trim() || 'Rakip';
  const NickBox = () => <label className="rl-fine">Adın <input className="rl-in small" maxLength={12} value={nick} placeholder="Rakip" onChange={(e) => setNick(e.target.value)} /></label>;
  const showRes = res && h?.phase === 'result';

  return (
    <div className={'sv' + (IS_TOUCH ? ' touch' : '')}>
      <canvas ref={cv} className="sv-cv" />
      {playing && h && (
        <div className="sv-hud">
          <div className="sv-top">
            <div className="sv-pill"><small>TUR</small><b>{h.round + 1}</b><small>/ {h.rounds}{h.double ? ' · ÇİFT PUAN' : ''}</small></div>
            {h.timeLeft > 0 && <div className="sv-pill"><b>{h.timeLeft}</b><small>sn</small></div>}
          </div>
          {h.text && <div className="sv-info">{h.text}</div>}
          {h.toast && <div className="sv-toast">{h.toast}</div>}
          {h.count > 0 && <div className="sv-count" key={h.count}>{h.count}</div>}
          {h.go && <div className="sv-count go">BAŞLA!</div>}
          {h.ending && <div className="sv-count end">BİTTİ</div>}
          {h.phase === 'wait' && <div className="sv-wait">Oyun başlıyor…</div>}
          {h.intro && (
            <div className="sv-intro"><small>TUR {h.round + 1}</small><b>{h.title}</b><p>{h.rules}</p></div>
          )}
          {!h.alive && h.phase === 'play' && <div className="sv-wait">Elendin, izliyorsun</div>}
        </div>
      )}
      {playing && h && (h.phase === 'play' || h.phase === 'count' || h.phase === 'intro') && (
        <>
          {h.lane ? (
            <div className="sv-zone flick" onPointerDown={fd} onPointerMove={fm} onPointerUp={fu} onPointerCancel={fu} />
          ) : (
            <>
              <div className="sv-zone stick" onPointerDown={sd} onPointerMove={sm} onPointerUp={su} onPointerCancel={su} />
              {knob && <div className="sv-knob" style={{ left: knob.x - 52, top: knob.y - 52 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
              {h.act && <button className="sv-btn" onPointerDown={(e) => { e.preventDefault(); game.current?.act(); }}>{h.act}</button>}
            </>
          )}
          {aim && <svg className="sv-aim"><line x1={aim.x} y1={aim.y} x2={aim.cx} y2={aim.cy} /><circle cx={aim.x} cy={aim.y} r="8" /></svg>}
          {h.lane && !aim && <div className="sv-tip">Parmağını yukarı doğru kaydırıp bırak</div>}
        </>
      )}
      {showRes && (
        <div className="sv-menu res">
          <div className="sv-logo"><small>TUR {res.round + 1} SONUCU</small><b>{res.title}</b></div>
          <ol className="sv-order">{res.rows.map((r, i) => <li key={i} className={r.me ? 'me' : ''}><i style={{ background: hex(r.color) }} /><b>{r.name}</b><span>+{r.pts}</span><small>{r.total}</small></li>)}</ol>
          {res.teams && <div className="sv-teams"><span style={{ color: '#ff8f84' }}>Kırmızı {res.teams[0]}</span><span style={{ color: '#8fc0ff' }}>Mavi {res.teams[1]}</span></div>}
          <p className="sv-fine">{res.last ? 'Final sonucu geliyor…' : 'Sıradaki tur birazdan başlıyor'}</p>
        </div>
      )}
      {screen === 'menu' && (
        <div className="sv-menu">
          <div className="sv-logo"><small>ÇILGIN YARIŞMA</small><b>SURVIVOR</b></div>
          {msg && <p className="sv-err">{msg}</p>}
          <p className="sv-sub">5 turluk mini oyun yarışması: suya it, hedefleri devir, halka at, deliğe sok, engel parkuru. 4 kişiye kadar online, herkes tek ya da 2'ye 2.</p>
          <NickBox />
          <button className="sv-go" onClick={() => { setMsg(''); setScreen('lobby'); }}>ARKADAŞLARLA OYNA</button>
          <div className="sv-row">
            <button onClick={solo}>Tek başına dene</button>
            <button onClick={() => setHow(true)}>Nasıl oynanır</button>
            <button onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
            <a href="/">Ana sayfa</a>
          </div>
        </div>
      )}
      {screen === 'lobby' && (
        <RoomLobby
          path="/survivor" title="SURVIVOR · ONLİNE ODA" info={{ n: myName }} hostMeta={{ game: 'sv', mode }} initialCode={QS.get('oda') || ''}
          rowExtra={(p, u, i) => (meta0.current?.mode === 'team' ? (i % 2 ? 'Mavi takım' : 'Kırmızı takım') : '')}
          hostPanel={(room, pl) => (
            <>
              <NickBox />
              <div className="sv-modes">
                <button className={mode === 'ffa' ? 'on' : ''} onClick={() => { setMode('ffa'); room.setMeta({ mode: 'ffa' }); meta0.current = { mode: 'ffa' }; }}><b>Herkes tek</b><small>Bireysel puan</small></button>
                <button className={mode === 'team' ? 'on' : ''} onClick={() => { setMode('team'); room.setMeta({ mode: 'team' }); meta0.current = { mode: 'team' }; }}><b>2'ye 2</b><small>Takım puanı toplanır</small></button>
              </div>
              {mode === 'team' && <p className="rl-fine">Takımlar katılış sırasına göre: 1-3 kırmızı, 2-4 mavi ({Object.keys(pl).length} kişi var).</p>}
            </>
          )}
          guestNote={(m) => { meta0.current = m; return <><NickBox />Mod: {m?.mode === 'team' ? "2'ye 2 takım" : 'herkes tek'}.</>; }}
          buildStartMeta={() => ({ mode })}
          onStart={beginOnline} onBack={() => setScreen('menu')} minPlayers={2}
        />
      )}
      {how && (
        <div className="sv-modal" onClick={() => setHow(false)}>
          <div className="sv-card" onClick={(e) => e.stopPropagation()}>
            <h3>Nasıl oynanır</h3>
            <ul>
              <li>5 tur var. Her turda sıralamana göre puan alırsın (1. en çok). Son tur çift puan.</li>
              <li>Suya it ve Engel parkurunda sol başparmakla yürü, sağdaki düğmeyle atıl/zıpla.</li>
              <li>Hedefleri devir, Halka at ve Deliğe sok turlarında ekranı yukarı doğru kaydırıp bırak: yön ve güç kaydırmandan gelir.</li>
              <li>2'ye 2 modda takım arkadaşlarının puanı toplanır. Takım arkadaşını itmezsin.</li>
              <li>Tek başına denersen yalnız oynarsın, puanını kendi rekorunla kıyasla.</li>
            </ul>
            <button className="sv-go small" onClick={() => setHow(false)}>Tamam</button>
          </div>
        </div>
      )}
      {screen === 'final' && fin && (
        <div className="sv-menu res">
          <div className="sv-logo"><small>{fin.solo ? 'YARIŞMA BİTTİ' : fin.mine ? 'KAZANDIN!' : 'KAZANAN'}</small><b>{fin.winner}</b></div>
          <ol className="sv-order">{fin.rows.map((r, i) => <li key={i} className={r.me ? 'me' : ''}><i style={{ background: hex(r.color) }} /><b>{r.name}</b><small>{r.total} puan</small></li>)}</ol>
          {fin.teams && <div className="sv-teams"><span style={{ color: '#ff8f84' }}>Kırmızı {fin.teams[0]}</span><span style={{ color: '#8fc0ff' }}>Mavi {fin.teams[1]}</span></div>}
          {!game.current?.net && <button className="sv-go" onClick={solo}>TEKRAR OYNA</button>}
          <div className="sv-row"><button onClick={() => { game.current.toMenu(); setScreen('menu'); }}>Menü</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
    </div>
  );
}
void COLORS;
