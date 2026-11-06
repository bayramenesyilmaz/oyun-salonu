import { useCallback, useEffect, useRef, useState } from 'react';
import { Race, CAR_COLORS } from './game/Race.js';
import { TRACKS } from './game/track.js';
import RoomLobby from '../../engine/RoomLobby.jsx';
import { MemHub, createRoom, joinRoom } from '../../engine/oproom.js';
import * as S from './game/sfx.js';
import './yaris.css';

const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const IS_TOUCH = QS.has('touch') || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const readPrefs = () => { try { return JSON.parse(localStorage.getItem('by-prefs') || '{}'); } catch { return {}; } };

export default function App() {
  const cv = useRef(null);
  const game = useRef(null);
  const prefs = readPrefs();
  const [screen, setScreen] = useState(QS.get('oda') ? 'lobby' : 'menu');
  const [color, setColor] = useState(Number.isInteger(prefs.color) ? prefs.color : 0);
  const [sound, setSound] = useState(prefs.sound !== false);
  const [track, setTrackId] = useState(TRACKS.some((t) => t.id === prefs.track) ? prefs.track : 'bulut');
  const [nick, setNick] = useState(prefs.nick || '');
  const [h, setH] = useState(null);
  const [end, setEnd] = useState(null);
  const [how, setHow] = useState(false);
  const [msg, setMsg] = useState('');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('by-prefs', JSON.stringify({ color, sound, track, nick })); } catch { /* yok say */ }
    S.setSound(sound);
  }, [color, sound, track, nick]);

  useEffect(() => {
    const g = new Race(cv.current, {
      touch: IS_TOUCH,
      onHud: (x) => setH(x),
      onEnd: (r) => { setEnd({ ...r, order: g.standings() }); setScreen('end'); },
      onNetClosed: () => { g.toMenu(); setOnline(false); setMsg('Kurucu odadan ayrıldı.'); setScreen('menu'); },
    });
    game.current = g;
    g.setTrack(TRACKS.some((t) => t.id === prefs.track) ? prefs.track : 'bulut');
    if (TEST) { window.__race = g; window.__BY = { Race, MemHub, createRoom, joinRoom }; }
    return () => g.dispose();
    // eslint-disable-next-line
  }, []);

  const pickTrack = (id) => { setTrackId(id); game.current?.setTrack(id); };
  const begin = useCallback(() => {
    setEnd(null);
    setH(null);
    setOnline(false);
    game.current.setTrack(track);
    game.current.start(CAR_COLORS[color]);
    setScreen('play');
  }, [color, track]);
  const beginOnline = (room, host, meta) => {
    const g = game.current;
    setEnd(null); setH(null); setMsg(''); setOnline(true);
    g.setTrack(meta.track || 'bulut');
    const on = g.attachOnline(room, meta);
    g.start(CAR_COLORS[color], on);
    setScreen('play');
  };

  useEffect(() => {
    if (QS.has('quick')) setTimeout(() => begin(), 300);
  }, [begin]);

  // klavye
  useEffect(() => {
    const st = { l: 0, r: 0 };
    const upd = () => game.current?.setSteer(st.r - st.l);
    const key = (down) => (e) => {
      const g = game.current;
      if (!g) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') { st.l = down ? 1 : 0; upd(); }
      else if (k === 'arrowright' || k === 'd') { st.r = down ? 1 : 0; upd(); }
      else if (k === ' ' || k === 'arrowup' || k === 'w') { g.setNitro(down); e.preventDefault(); }
      else if (k === 'arrowdown' || k === 's' || k === 'shift') g.setBrake(down);
      else if ((k === 'f' || k === 'e') && down) g.fireItem();
    };
    const d = key(true), u = key(false);
    addEventListener('keydown', d);
    addEventListener('keyup', u);
    return () => { removeEventListener('keydown', d); removeEventListener('keyup', u); };
  }, []);

  const hold = (fn) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); fn(true); },
    onPointerUp: () => fn(false),
    onPointerCancel: () => fn(false),
    onPointerLeave: () => fn(false),
    onContextMenu: (e) => e.preventDefault(),
  });
  const g = () => game.current;
  const playing = screen === 'play';
  const tdef = TRACKS.find((t) => t.id === track);
  const myName = nick.trim() || 'Pilot';
  const trackChips = (cur, on) => (
    <div className="by-tracks">
      {TRACKS.map((t) => <button key={t.id} className={cur === t.id ? 'on' : ''} onClick={() => on(t.id)}><b>{t.name}</b><small>{t.desc}</small></button>)}
    </div>
  );

  return (
    <div className={'by' + (IS_TOUCH ? ' touch' : '')}>
      <canvas ref={cv} className="by-cv" />
      {playing && h && (
        <div className="by-hud">
          <div className="by-top">
            <div className="by-pill"><b>{h.rank}</b>/{h.total}<small>sıra</small></div>
            {h.item && <div className="by-pill item"><small>EŞYA</small><b>{h.itemName}</b></div>}
            <div className="by-pill"><b>{h.lap}</b>/{h.laps}<small>tur</small></div>
          </div>
          {(h.combo || h.air > 0) && <div className="by-combo">{h.combo || `HAVADA +${h.air}`}</div>}
          {h.toast && <div className="by-toast">{h.toast}</div>}
          {h.count > 0 && <div className="by-count" key={h.count}>{h.count}</div>}
          {h.go && <div className="by-count go">BAŞLA!</div>}
          <div className="by-speed"><b>{h.speed}</b><small>km/s</small></div>
          <div className={'by-nitro' + (h.nitroOn ? ' on' : '')}><i style={{ width: h.nitro * 100 + '%' }} /><small>NİTRO</small></div>
        </div>
      )}
      {playing && (
        <>
          <div className="by-zone left" {...hold((v) => g()?.setSteer(v ? -1 : 0))} />
          <div className="by-zone right" {...hold((v) => g()?.setSteer(v ? 1 : 0))} />
          <button className="by-btn nitro" {...hold((v) => g()?.setNitro(v))}>NİTRO</button>
          <button className={'by-btn brake' + (h?.inAir ? ' flip' : '')} {...hold((v) => g()?.setBrake(v))}>{h?.inAir ? 'TAKLA' : 'FREN'}</button>
          {h?.item && <button className="by-btn fire" onPointerDown={(e) => { e.preventDefault(); g()?.fireItem(); }}>{h.item === 'mine' ? 'BIRAK' : h.item === 'nitro' ? 'KULLAN' : 'ATEŞ'}</button>}
          {!IS_TOUCH && <div className="by-keys">← → direksiyon · Boşluk nitro · S fren / havada takla · F eşya</div>}
        </>
      )}
      {screen === 'menu' && (
        <div className="by-menu">
          <div className="by-logo"><small>BULUT ÜSTÜ</small><b>YARIŞ</b></div>
          {msg && <p className="by-err">{msg}</p>}
          {trackChips(track, pickTrack)}
          <div className="by-colors">
            {CAR_COLORS.map((c, i) => <button key={c} className={color === i ? 'on' : ''} style={{ background: hex(c) }} onClick={() => setColor(i)} aria-label={'Renk ' + (i + 1)} />)}
          </div>
          <button className="by-go" onClick={begin}>YARIŞA BAŞLA</button>
          <div className="by-row">
            <button onClick={() => { setMsg(''); setScreen('lobby'); }}>Arkadaşlarla online</button>
            <button onClick={() => setHow(true)}>Nasıl oynanır</button>
            <button onClick={() => setSound(!sound)}>Ses: {sound ? 'açık' : 'kapalı'}</button>
            <a href="/">Ana sayfa</a>
          </div>
          <small className="by-fine">{tdef?.laps} tur · {tdef?.name} · botlara ya da arkadaşlarına karşı</small>
        </div>
      )}
      {screen === 'lobby' && (
        <RoomLobby
          path="/bulutyaris"
          title="ONLİNE YARIŞ · 4 KİŞİ"
          info={{ n: myName, c: color }}
          hostMeta={{ game: 'by', track }}
          initialCode={QS.get('oda') || ''}
          rowExtra={(p) => <span className="by-dot" style={{ background: hex(CAR_COLORS[(p.c || 0) % 6]) }} />}
          hostPanel={(room) => (
            <>
              <label className="rl-fine">Adın <input className="rl-in small" maxLength={12} value={nick} placeholder="Pilot" onChange={(e) => setNick(e.target.value)} /></label>
              {trackChips(track, (id) => { pickTrack(id); room.setMeta({ track: id }); })}
              <div className="by-colors">{CAR_COLORS.map((c, i) => <button key={c} className={color === i ? 'on' : ''} style={{ background: hex(c) }} onClick={() => setColor(i)} />)}</div>
            </>
          )}
          guestNote={(m) => <><label className="rl-fine">Adın <input className="rl-in small" maxLength={12} value={nick} placeholder="Pilot" onChange={(e) => setNick(e.target.value)} /></label><span className="by-colors">{CAR_COLORS.map((c, i) => <button key={c} className={color === i ? 'on' : ''} style={{ background: hex(c) }} onClick={() => setColor(i)} />)}</span>Pist: {TRACKS.find((t) => t.id === m?.track)?.name || '…'}.</>}
          buildStartMeta={() => ({ track })}
          onStart={beginOnline}
          onBack={() => setScreen('menu')}
          minPlayers={2}
        />
      )}
      {how && (
        <div className="by-modal" onClick={() => setHow(false)}>
          <div className="by-card" onClick={(e) => e.stopPropagation()}>
            <h3>Nasıl oynanır</h3>
            <ul>
              <li>Araba kendiliğinden gaza basar. Ekranın sol/sağ yarısına basılı tutarak yönlendir (bilgisayarda ok tuşları).</li>
              <li>Yolun tepelerinden ve sarı-siyah rampalardan havalanırsın. Hızlı girersen daha uzağa uçarsın.</li>
              <li>Havadayken TAKLA (fren) tuşunu basılı tutup bırak: düz inersen puan ve nitro kazanırsın, ters inersen kaza yaparsın.</li>
              <li>Mor ? kutularından roket, mayın ya da nitro al. Roket önündeki arabayı kovalar.</li>
              <li>Mavi oklu plaka hız verir. Turları ilk bitiren kazanır.</li>
            </ul>
            <button className="by-go small" onClick={() => setHow(false)}>Tamam</button>
          </div>
        </div>
      )}
      {screen === 'end' && end && (
        <div className="by-menu end">
          <div className="by-logo"><small>{end.rank === 1 ? 'KAZANDIN' : 'YARIŞ BİTTİ'}</small><b>{end.rank}. SIRA</b></div>
          <div className="by-stats"><span>Süre <b>{fmt(end.time)}</b></span><span>Hava puanı <b>{end.score}</b></span></div>
          <ol className="by-order">{end.order.map((o, i) => <li key={i} className={o.me ? 'me' : ''}><b>{i + 1}</b>{o.name}{o.fin ? <small>{fmt(o.fin)}</small> : <small>yolda</small>}</li>)}</ol>
          {!online && <button className="by-go" onClick={begin}>TEKRAR YARIŞ</button>}
          <div className="by-row"><button onClick={() => { game.current.toMenu(); setOnline(false); setScreen('menu'); }}>Menü</button><a href="/">Ana sayfa</a></div>
        </div>
      )}
    </div>
  );
}
