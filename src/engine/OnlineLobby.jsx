// Ortak online oda ekranı: oda kur / koda katıl, rakip gelince oyunu başlatır.
// Kullanım: <OnlineLobby game="hirsiz" path="/hirsiz" nick="Ada" initialCode="" onStart={({net, host, nicks}) => ...} onBack={() => ...} />
import { useEffect, useRef, useState } from 'react';
import './OnlineLobby.css';

export default function OnlineLobby({ game, path, nick, initialCode = '', onStart, onBack }) {
  const [kind, setKind] = useState(initialCode ? 'join' : 'host');
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [room, setRoom] = useState(null);
  const [peer, setPeer] = useState(null);
  const [copied, setCopied] = useState(false);
  const r = useRef(null);
  const started = useRef(false);
  const nickRef = useRef(nick);
  nickRef.current = nick;

  const go = async () => {
    setErr('');
    setBusy(true);
    const O = await import('./online.js');
    try {
      const rm = kind === 'host' ? await O.createRoom(game) : await O.joinRoom(code);
      r.current = rm;
      const hello = () => rm.sendState({ hi: 1, n: nickRef.current, x: 0, y: 0 });
      hello();
      rm.onState = (s) => {
        if (s && s.hi) {
          setPeer({ n: s.n || 'Arkadaşın' });
          hello();
        }
      };
      rm.onLeave = () => setPeer(null);
      setRoom({ code: rm.code, host: kind === 'host' });
    } catch (e) {
      setErr(O.explain(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!room || !peer || started.current) return;
    const t = setTimeout(() => {
      started.current = true;
      const host = room.host;
      onStart({ net: r.current, host, nicks: host ? [nickRef.current, peer.n] : [peer.n, nickRef.current] });
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [room, peer]);

  useEffect(
    () => () => {
      if (!started.current) r.current?.leave?.();
    },
    [],
  );

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

  const back = () => {
    r.current?.leave?.();
    r.current = null;
    onBack();
  };

  if (room) {
    return (
      <div className="ol-card">
        <p className="ol-small">{room.host ? 'Odan hazır. Bu kodu arkadaşına gönder:' : 'Odaya girdin'}</p>
        <div className="ol-code">{room.code}</div>
        {room.host && (
          <button className="ol-btn" onClick={copy}>
            {copied ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
          </button>
        )}
        <p className="ol-small">{peer ? (peer.n || 'Arkadaşın') + ' geldi, oyun başlıyor…' : room.host ? 'Arkadaşın bekleniyor…' : 'Kurucu bekleniyor…'}</p>
        <button className="ol-btn" onClick={back}>
          Vazgeç
        </button>
      </div>
    );
  }
  return (
    <div className="ol-card">
      <div className="ol-tabs">
        <button className={'ol-chip' + (kind === 'host' ? ' on' : '')} onClick={() => setKind('host')}>
          Oda kur
        </button>
        <button className={'ol-chip' + (kind === 'join' ? ' on' : '')} onClick={() => setKind('join')}>
          Koda katıl
        </button>
      </div>
      {kind === 'host' ? (
        <p className="ol-small">Bir oda kuralım, sana 4 harfli bir kod vereceğim. Kodu ya da bağlantıyı arkadaşına gönder.</p>
      ) : (
        <label className="ol-field">
          Oda kodu
          <input
            value={code}
            maxLength={6}
            placeholder="ABCD"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
          />
        </label>
      )}
      {err && <p className="ol-err">{err}</p>}
      <button className="ol-btn primary" disabled={busy || (kind === 'join' && code.trim().length < 4)} onClick={go}>
        {busy ? 'Bağlanıyor…' : kind === 'host' ? 'Odayı kur' : 'Katıl'}
      </button>
      <button className="ol-btn" onClick={back}>
        Geri
      </button>
    </div>
  );
}
