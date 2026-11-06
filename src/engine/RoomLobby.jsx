// Ortak 4 kişilik online oda ekranı (oproom.js üzerinden). Oda kur / koda katıl / oyuncu listesi / kurucu başlatır.
// onStart(room, host, meta) hem kurucuda hem katılanlarda çağrılır; oda sonrası oyuna devredilir.
import { useEffect, useRef, useState } from 'react';
import { createRoom, joinRoom, explain, MAX_PLAYERS } from './oproom.js';
import './RoomLobby.css';

export default function RoomLobby({ path, title = 'ONLİNE ODA', info, hostMeta = {}, initialCode = '', hostPanel, guestNote, rowExtra, buildStartMeta, onStart, onBack, minPlayers = 2 }) {
  const [kind, setKind] = useState(initialCode ? 'join' : 'host');
  const [code, setCode] = useState((initialCode || '').toUpperCase());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState({});
  const [meta, setMeta] = useState(null);
  const [copied, setCopied] = useState(false);
  const rr = useRef(null);
  const handed = useRef(false);
  const infoRef = useRef(info);
  infoRef.current = info;

  const wire = (rm, host) => {
    rr.current = rm;
    rm.on('players', (pl) => setPlayers({ ...pl }));
    rm.on('meta', (m) => {
      setMeta({ ...m });
      if (!host && m.st === 'play' && !handed.current) {
        handed.current = true;
        onStart(rm, false, m);
      }
    });
    rm.on('closed', () => {
      if (handed.current) return;
      rr.current = null;
      setRoom(null);
      setPlayers({});
      setMeta(null);
      setErr('Kurucu odadan ayrıldı.');
    });
    setRoom(rm);
    setPlayers({ ...rm.players });
    setMeta(rm.meta);
  };
  const go = async () => {
    setBusy(true);
    setErr('');
    try {
      wire(kind === 'host' ? await createRoom(infoRef.current, hostMeta) : await joinRoom(code, infoRef.current), kind === 'host');
    } catch (e) {
      setErr(explain(e));
    }
    setBusy(false);
  };
  const leave = () => {
    rr.current?.leave?.();
    rr.current = null;
    handed.current = false;
    setRoom(null);
    setPlayers({});
    setMeta(null);
  };
  const start = () => {
    const rm = rr.current;
    if (!rm || handed.current) return;
    const order = Object.keys(rm.players).sort().slice(0, MAX_PLAYERS);
    const m = { st: 'play', order, ...(buildStartMeta ? buildStartMeta(rm.players, order) : {}) };
    rm.setMeta(m);
    handed.current = true;
    onStart(rm, true, { ...rm.meta, ...m });
  };
  const copy = async () => {
    const url = location.origin + path + '?oda=' + room.code;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Bağlantıyı kopyala:', url);
    }
  };
  useEffect(() => {
    rr.current?.setInfo?.(info);
    // eslint-disable-next-line
  }, [JSON.stringify(info)]);
  useEffect(() => () => { if (!handed.current) rr.current?.leave?.(); }, []);

  const n = Object.keys(players).length;
  const list = Object.entries(players).sort(([a], [b]) => (a === room?.uid ? -1 : b === room?.uid ? 1 : a < b ? -1 : 1));
  return (
    <div className="rl">
      <button className="rl-link" onClick={() => { leave(); onBack(); }}>← Geri</button>
      <h3 className="rl-title">{title}</h3>
      {!room ? (
        <div className="rl-box">
          <div className="rl-tabs">
            <button className={kind === 'host' ? 'on' : ''} onClick={() => setKind('host')}>Oda kur</button>
            <button className={kind === 'join' ? 'on' : ''} onClick={() => setKind('join')}>Koda katıl</button>
          </div>
          {kind === 'host' ? (
            <p className="rl-fine">Oda kur, 4 harfli kodu ya da bağlantıyı arkadaşlarına gönder (en fazla 4 kişi).</p>
          ) : (
            <label className="rl-fine">Oda kodu
              <input className="rl-in" value={code} maxLength={6} placeholder="ABCD" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())} />
            </label>
          )}
          {err && <p className="rl-err">{err}</p>}
          <button className="rl-btn" disabled={busy || (kind === 'join' && code.length < 4)} onClick={go}>{busy ? 'Bağlanıyor…' : kind === 'host' ? 'Oda kur' : 'Katıl'}</button>
        </div>
      ) : (
        <div className="rl-box">
          <p className="rl-fine">Oda kodu</p>
          <div className="rl-code">{room.code}</div>
          <button className="rl-btn ghost" onClick={copy}>{copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}</button>
          <div className="rl-list">
            {list.map(([u, p]) => (
              <div key={u} className="rl-row">
                <b>{p.n || 'Oyuncu'}{u === room.uid ? ' (sen)' : ''}{u === meta?.host ? ' · kurucu' : ''}</b>
                <small>{rowExtra ? rowExtra(p, u) : ''}</small>
              </div>
            ))}
            {Array.from({ length: Math.max(0, MAX_PLAYERS - n) }).map((_, i) => <div key={'e' + i} className="rl-row empty">Boş yer</div>)}
          </div>
          {room.isHost ? (
            <>
              {hostPanel?.(room, players, meta)}
              <button className="rl-btn" disabled={n < minPlayers} onClick={start}>{n < minPlayers ? `En az ${minPlayers} kişi gerekli` : `Başlat (${n} kişi)`}</button>
            </>
          ) : (
            <p className="rl-fine">{guestNote ? guestNote(meta) : ''} Kurucunun başlatması bekleniyor…</p>
          )}
        </div>
      )}
    </div>
  );
}
