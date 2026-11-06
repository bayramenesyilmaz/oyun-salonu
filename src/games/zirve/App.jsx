import { useEffect, useRef, useState } from 'react';
import { Climb, COLORS, TEAM_COLORS } from './game/Climb.js';
import RoomLobby from '../../engine/RoomLobby.jsx';
import { MemHub, createRoom, joinRoom } from '../../engine/oproom.js';
import * as S from '../bulutyaris/game/sfx.js';
import './zirve.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(0).padStart(2, '0')}`;
const readPrefs = () => { try { return JSON.parse(localStorage.getItem('zv-prefs') || '{}'); } catch { return {}; } };

export default function App() {
  const cv = useRef(null);
  const game = useRef(null);
  const prefs = readPrefs();
  const [screen, setScreen] = useState(QS.get('oda') ? 'lobby' : 'menu');
  const [nick, setNick] = useState(prefs.nick || '');
  const [mode, setMode] = useState(prefs.mode || 'ffa');
  const [sound, setSound] = useState(prefs.sound !== false);
  const [h, setH] = useState(null);
  const [end, setEnd] = useState(null);
  const [how, setHow] = useState(false);
  const [msg, setMsg] = useState('');
  const stick = useRef({ id: null, ox: 0, oy: 0 });
  const [knob, setKnob] = useState(null);
  const camDrag = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('zv-prefs', JSON.stringify({ nick, mode, sound })); } catch { /* yok say */ }
    S.setSound(sound);
  }, [nick, mode, sound]);

  useEffect(() => {
    const g = new Climb(cv.current, {
      touch: IS_TOUCH,
      onHud: setH,
      onEnd: (s) => { setEnd(s); setScreen('end'); },
      onNetClosed: () => { g.toMenu(); setMsg('Kurucu odadan ayrıldı.'); setScreen('menu'); },
    });
    game.current = g;
    if (TEST) { window.__climb = g; window.__ZV = { Climb, MemHub, createRoom, joinRoom }; }
    return () => g.dispose();
  }, []);

  const solo = () => { setEnd(null); setH(null); game.current.start({ seed: 1 + Math.floor(Math.random() * 9999), mode: 'solo', nick: nick.trim() || 'Sen', color: 0 }); setScreen('play'); };
  const beginOnline = (room, host, meta) => {
    const g = game.current;
    setEnd(null); setH(null); setMsg('');
    const on = g.attachOnline(room, meta);
    g.start({ seed: meta.seed || 1, mode: meta.mode || 'ffa', online: on });
    setScreen('play');
  };
  useEffect(() => { if (QS.has('quick')) setTimeout(solo, 300); /* eslint-disable-next-line */ }, []);

  // klavye
  useEffect(() => {
    const k = { l: 0, r: 0, u: 0, d: 0 };
    const upd = () => game.current?.setMove(k.r - k.l, k.u - k.d);
    const key = (down) => (e) => {
      const g = game.current;
      if (!g) return;
      const c = e.key.toLowerCase();
      if (c === 'arrowleft' || c === 'a') { k.l = down ? 1 : 0; upd(); }
      else if (c === 'arrowright' || c === 'd') { k.r = down ? 1 : 0; upd(); }
      else if (c === 'arrowup' || c === 'w') { k.u = down ? 1 : 0; upd(); }
      else if (c === 'arrowdown' || c === 's') { k.d = down ? 1 : 0; upd(); }
      else if (c === ' ' && down) { g.jump(); e.preventDefault(); }
      else if (c === 'e' && down) g.throwRock();
      else if ((c === 'q' || c === 'c') && down) g.cutNear();
    };
    const d = key(true), u = key(false);
    addEventListener('keydown', d); addEventListener('keyup', u);
    return () => { removeEventListener('keydown', d); removeEventListener('keyup', u); };
  }, []);

  const R = 52;
  const sd = (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); stick.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY }; setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }); };
  const sm = (e) => {
    const s = stick.current;
    if (s.id !== e.pointerId) return;
    let dx = e.clientX - s.ox, dy = e.clientY - s.oy;
    const m = Math.hypot(dx, dy);
    if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R; }
    game.current?.setMove(dx / R, -dy / R);
    setKnob({ x: s.ox, y: s.oy, dx, dy });
  };
  const su = (e) => { if (stick.current.id === e.pointerId) { stick.current.id = null; game.current?.setMove(0, 0); setKnob(null); } };
  const cd = (e) => { camDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const cm = (e) => { const c = camDrag.current; if (c && c.id === e.pointerId) { game.current?.rotateCam(e.clientX - c.x, e.clientY - c.y); c.x = e.clientX; c.y = e.clientY; } };
  const cu = () => { camDrag.current = null; };
  const g = () => game.current;
  const playing = screen === 'play';
  const myName = nick.trim() || 'Dağcı';
  const NickBox = () => <label className="rl-fine">Adın <input className="rl-in small" maxLength={12} value={nick} placeholder="Dağcı" onChange={(e) => setNick(e.target.value)} /></label>;

  return (
    <div className={'zv' + (IS_TOUCH ? ' touch' : '')}>
      <canvas ref={cv} className="zv-cv" />
      {playing && h && (
        <div className="zv-hud">
          <div className="zv-top"><div className="zv-pill"><b>{h.height}</b><small>/ {h.top} m</small></div><div className="zv-pill rk"><small>KAYA</small><b>{h.rocks}</b></div><div className="zv-pill"><small>{fmt(h.time)}</small></div></div>
          <div className="zv-bar">{h.players.map((p, i) => <i key={i} className={p.me ? 'me' : ''} style={{ bottom: Math.min(1, p.h) * 100 + '%', background: hex(p.color) }} />)}<span>ZİRVE</span></div>
          {h.toast && <div className="zv-toast">{h.toast}</div>}
          {h.count > 0 && <div className="zv-count" key={h.count}>{h.count}</div>}
          {h.go && <div className="zv-count go">TIRMAN!</div>}
          {h.stun && <div className="zv-stun" />}
        </div>
      )}
      {playing && (
        <>
          <div className="zv-zone stick" onPointerDown={sd} onPointerMove={sm} onPointerUp={su} onPointerCancel={su} />
          <div className="zv-zone cam" onPointerDown={cd} onPointerMove={cm} onPointerUp={cu} onPointerCancel={cu} />
          {knob && <div className="zv-knob" style={{ left: knob.x - 52, top: knob.y - 52 }}><i style={{ transform: `translate(${knob.dx}px,${knob.dy}px)` }} /></div>}
          <button className="zv-btn jump" onPointerDown={(e) => { e.preventDefault(); g()?.jump(); }}>ZIPLA</button>
          <button className="zv-btn rock" onPointerDown={(e) => { e.preventDefault(); g()?.throwRock(); }}>KAYA AT</button>
          {h?.canCut && <button className="zv-btn cut" onPointerDown={(e) => { e.preventDefault(); g()?.cutNear(); }}>İP KES</button>}
          {!IS_TOUCH && <div className="zv-keys">WASD yürü · Boşluk zıpla · E kaya at · Q ip kes · fareyle sürükle: kamera</div>}
        </>
      )}
      {screen === 'menu' && (
        <div className="zv-menu">
          <div className="zv-logo"><small>ONLİNE DAĞ TIRMANIŞI</small><b>ZİRVE</b></div>
          {msg && <p className="zv-err">{msg}</p>}
          <p className="zv-sub">Uzun bir dağ yolu, kopabilen iplerle dik duvarlar. Rakiplerine kaya at, ipini kes, önce zirveye ulaş. 4 kişi: herkes tek ya da 2'ye 2.</p>
          <NickBox />
          <button className="zv-go" onClick={() => { setMsg(''); setScreen('lobby'); }}>ARKADAŞLARLA TIRMAN</button>
          <div className="zv-row">
            <button onClick={solo}>Tek başına dene</button>
            <button onClick={() => setHow(true)}>Nasıl oynanır</button>
            <button onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
            <a href="/">Ana sayfa</a>
          </div>
        </div>
      )}
      {screen === 'lobby' && (
        <RoomLobby
          path="/zirve"
          title="ZİRVE · ONLİNE ODA"
          info={{ n: myName }}
          hostMeta={{ game: 'zv', mode }}
          initialCode={QS.get('oda') || ''}
          rowExtra={(p, u, i) => (meta0.current?.mode === 'team' ? (i % 2 ? 'Mavi takım' : 'Kırmızı takım') : '')}
          hostPanel={(room, pl) => (
            <>
              <NickBox />
              <div className="zv-modes">
                <button className={mode === 'ffa' ? 'on' : ''} onClick={() => { setMode('ffa'); room.setMeta({ mode: 'ffa' }); meta0.current = { mode: 'ffa' }; }}><b>Herkes tek</b><small>İlk zirveye çıkan kazanır</small></button>
                <button className={mode === 'team' ? 'on' : ''} onClick={() => { setMode('team'); room.setMeta({ mode: 'team' }); meta0.current = { mode: 'team' }; }}><b>2'ye 2</b><small>Takımın ikisi de çıkmalı</small></button>
              </div>
              {mode === 'team' && <p className="rl-fine">Takımlar odaya katılış sırasına göre: 1-3 kırmızı, 2-4 mavi ({Object.keys(pl).length} kişi var).</p>}
            </>
          )}
          guestNote={(m) => { meta0.current = m; return <><NickBox />Mod: {m?.mode === 'team' ? "2'ye 2 takım" : 'herkes tek'}.</>; }}
          buildStartMeta={() => ({ mode, seed: 1 + Math.floor(Math.random() * 99999) })}
          onStart={beginOnline}
          onBack={() => setScreen('menu')}
          minPlayers={2}
        />
      )}
      {how && (
        <div className="zv-modal" onClick={() => setHow(false)}>
          <div className="zv-card" onClick={(e) => e.stopPropagation()}>
            <h3>Nasıl oynanır</h3>
            <ul>
              <li>Sol başparmakla yürü, sağ tarafı sürükleyerek kamerayı çevir. ZIPLA ile boşlukları ve basamakları aş.</li>
              <li>Dik duvarlarda ipe doğru yürü, yakalarsın. İleri/geri iterek tırman, ZIPLA ile bırak.</li>
              <li>Yerdeki gri kayaları topla (en çok 3). KAYA AT rakibi yakındaysa ona doğru atar, çarpan sersemler ve düşebilir.</li>
              <li>İpin tepesine yakınken İP KES: ipteki herkes düşer. İp 22 saniye sonra yeniden asılır.</li>
              <li>Yeşil bayraklı kamplar kayıt noktasıdır. Düşersen son kampa dönersin.</li>
              <li>2'ye 2 modda takım arkadaşına kaya atamazsın, ikinizin de zirveye çıkması gerekir.</li>
            </ul>
            <button className="zv-go small" onClick={() => setHow(false)}>Tamam</button>
          </div>
        </div>
      )}
      {screen === 'end' && end && (
        <div className="zv-menu end">
          <div className="zv-logo"><small>{end.solo ? 'ZİRVEYE ULAŞTIN' : end.mode === 'team' ? (end.mine ? 'TAKIMIN KAZANDI' : 'RAKİP TAKIM KAZANDI') : end.mine ? 'KAZANDIN' : `${end.winner || 'Biri'} KAZANDI`}</small><b>{fmt(end.time)}</b></div>
          <ol className="zv-order">{end.rows.map((r, i) => <li key={i} className={r.me ? 'me' : ''}><i style={{ background: hex(r.color) }} /><b>{r.name}</b><small>{r.fin ? fmt(r.fin) : r.h + ' m'}</small></li>)}</ol>
          {!game.current?.net && <button className="zv-go" onClick={solo}>TEKRAR TIRMAN</button>}
          <div className="zv-row"><button onClick={() => { game.current.toMenu(); setScreen('menu'); }}>Menü</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
    </div>
  );
}
const meta0 = { current: null };
