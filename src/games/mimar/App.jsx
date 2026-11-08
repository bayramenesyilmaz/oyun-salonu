import { useEffect, useRef, useState } from 'react';
import './mimar.css';
import { ITEMS, RECIPES, CLUES, CLUE_RECIPES, INTRO, OUTRO } from './data.js';
import { drawPerson } from '../kizilag/game/draw.js';

const KEY = 'mimar-v1';
const fresh = () => ({ scene: 'studio', inv: [], clues: [], flags: {}, started: false, done: false });
const load = () => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return fresh(); } };
const WHO = { agent: ['SESSİZ', '#9fd0ff', 'agent'], elif: ['ELİF', '#ff9ac0', 'elif'], narr: ['', '#e8ecff', 'narr'] };
const VOICE = { agent: [0.82, 0.95], elif: [1.3, 1.05], narr: [0.95, 0.95] };

function speak(text, who, on) {
  const ss = window.speechSynthesis; if (!on || !ss) return;
  ss.cancel();
  const v = ss.getVoices().find((x) => /^tr/i.test(x.lang)); const P = VOICE[who] || [1, 1];
  for (const part of text.split(/(\*[^*]+\*)/).filter(Boolean)) {
    const em = part.startsWith('*'); const u = new SpeechSynthesisUtterance(part.replace(/\*/g, ''));
    u.lang = 'tr-TR'; if (v) u.voice = v; u.pitch = Math.min(2, P[0] + (em ? 0.25 : 0)); u.rate = P[1] * (em ? 0.85 : 1); u.volume = em ? 1 : 0.9; ss.speak(u);
  }
}
const clean = (t) => t.replace(/\*/g, '');

function Portrait({ who }) {
  const r = useRef();
  useEffect(() => { const c = r.current.getContext('2d'); c.clearRect(0, 0, 200, 240); if (who === 'narr') return; drawPerson(c, { x: 100, y: 228, face: 1, kind: who, scale: 2.4, aim: 0, gun: false, t: 0 }); }, [who]);
  return <canvas ref={r} width={200} height={240} className="mm-portrait" />;
}
function Chip({ id, sel, onClick, clue }) {
  const it = clue ? { n: CLUES[id].n, c: '#e0243a', g: '?' } : ITEMS[id];
  return <button className={'mm-chip' + (sel ? ' sel' : '')} onClick={onClick} title={it.n}><i style={{ background: it.c }}>{it.g}</i><span>{it.n}</span></button>;
}

// ---- sahneler ----
const H = ({ x, y, w, h, id, on, label, hide }) => (hide ? null : <rect x={x} y={y} width={w} height={h} fill="transparent" className="mm-hot" onClick={() => on(id)}><title>{label}</title></rect>);

function Studio({ s, on }) {
  const f = s.flags;
  return (
    <svg viewBox="0 0 800 450" className="mm-scene" role="img" aria-label="Mimar'ın atölyesi">
      <rect width="800" height="450" fill="#4a3a34" /><rect y="330" width="800" height="120" fill="#2d221d" />
      <rect x="330" y="70" width="140" height="130" fill="#14204a" stroke="#2a1d18" strokeWidth="6" /><circle cx="420" cy="110" r="16" fill="#e8ecff" /><path d="M400 70V200M330 135H470" stroke="#2a1d18" strokeWidth="4" />
      <circle cx="275" cy="90" r="28" fill="#e8dcc0" stroke="#2a1d18" strokeWidth="4" /><path d="M275 90V70M275 90L292 96" stroke="#2a1d18" strokeWidth="3" />
      <rect x="40" y="120" width="80" height="70" rx="4" fill="#5a5e70" stroke="#2a1d18" strokeWidth="3" /><circle cx="80" cy="155" r="14" fill="#8a96b8" /><rect x="58" y="172" width="44" height="8" fill="#2a1d18" />
      <rect x="150" y="110" width="70" height="70" fill="#d9c8a0" stroke="#2a1d18" strokeWidth="5" /><circle cx="185" cy="140" r="14" fill="#8a7a60" /><path d="M165 168L185 150L205 168Z" fill="#8a7a60" />
      <polygon points="80,260 300,240 300,255 80,275" fill="#d9c8a0" /><rect x="90" y="275" width="10" height="55" fill="#2a1d18" /><rect x="280" y="255" width="10" height="75" fill="#2a1d18" />{!f.table && <polygon points="160,252 200,248 190,262" fill="#c9b88a" />}
      <rect x="310" y="290" width="40" height="40" rx="4" fill="#6a6e80" stroke="#2a1d18" strokeWidth="3" /><path d="M318 290L330 280L342 290" fill="#d9d2c0" />
      <rect x="400" y="250" width="120" height="80" rx="4" fill="#6a4a30" stroke="#2a1d18" strokeWidth="3" /><rect x="410" y="262" width="100" height="26" fill="#7a5a3a" stroke="#2a1d18" /><rect x="410" y="296" width="100" height="26" fill="#7a5a3a" stroke="#2a1d18" /><circle cx="460" cy="275" r="4" fill="#f2c230" /><circle cx="460" cy="309" r="4" fill="#f2c230" />
      <rect x="330" y="385" width="230" height="45" fill={f.rug ? '#6a2a30' : '#8a2a36'} transform={f.rug ? 'rotate(-6 445 407)' : ''} /><rect x="340" y="392" width="210" height="6" fill="#d9b86a" transform={f.rug ? 'rotate(-6 445 407)' : ''} />
      <rect x="540" y="290" width="40" height="40" fill="#9a5a36" stroke="#2a1d18" strokeWidth="3" /><path d="M560 290C540 260 530 250 520 250M560 290C575 262 590 252 600 255" stroke="#3a8a3a" strokeWidth="5" fill="none" />
      <rect x="610" y="50" width="150" height="280" fill="#5a3a24" stroke="#2a1d18" strokeWidth="4" />
      {[0, 1, 2, 3].map((r) => <g key={r}><rect x="618" y={58 + r * 68} width="134" height="6" fill="#2a1d18" />{[0, 1, 2, 3, 4, 5, 6].map((c) => <rect key={c} x={622 + c * 18} y={62 + r * 68 + (c % 3) * 3} width="14" height={52 - (c % 3) * 3} fill={['#8a2a36', '#2a5a8a', '#3a8a5a', '#8a7a2a'][(c + r) % 4]} />)}</g>)}
      <H x={80} y={235} w={225} h={95} id="table" on={on} label="Çizim masası" /><H x={308} y={285} w={45} h={45} id="bin" on={on} label="Çöp kutusu" />
      <H x={330} y={385} w={230} h={50} id="rug" on={on} label="Halı" /><H x={540} y={285} w={45} h={45} id="pot" on={on} label="Saksı" />
      <H x={400} y={250} w={120} h={80} id="drawer" on={on} label="Çekmeceli dolap" /><H x={150} y={110} w={70} h={70} id="photo" on={on} label="Fotoğraf" />
      <H x={247} y={62} w={56} h={56} id="clock" on={on} label="Saat" /><H x={40} y={120} w={80} h={70} id="safe" on={on} label="Kasa" />
      <H x={610} y={50} w={150} h={280} id="shelf" on={on} label="Kitaplık" />
    </svg>
  );
}
function Secret({ s, on }) {
  const lit = s.inv.includes('torchOn'); const [p, setP] = useState({ x: 400, y: 225 });
  const mv = (e) => { const r = e.currentTarget.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; setP({ x: ((t.clientX - r.left) / r.width) * 800, y: ((t.clientY - r.top) / r.height) * 450 }); };
  return (
    <svg viewBox="0 0 800 450" className="mm-scene" onMouseMove={mv} onTouchMove={mv} onTouchStart={mv}>
      <defs><radialGradient id="mmlight" gradientUnits="userSpaceOnUse" cx={p.x} cy={p.y} r="230"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="0.65" stopColor="#000" stopOpacity="0.15" /><stop offset="1" stopColor="#000" stopOpacity="0.97" /></radialGradient></defs>
      <rect width="800" height="450" fill="#2a2630" /><rect y="330" width="800" height="120" fill="#1b1820" />
      <rect x="70" y="60" width="240" height="180" fill="#3a3340" stroke="#14111a" strokeWidth="5" />
      <path d="M110 100L200 150L280 100M110 200L200 150L280 200" stroke="#e0243a" strokeWidth="2" fill="none" /><rect x="100" y="90" width="40" height="30" fill="#d9c8a0" /><rect x="260" y="90" width="40" height="30" fill="#d9c8a0" /><rect x="100" y="190" width="40" height="30" fill="#8a96b8" /><circle cx="200" cy="150" r="22" fill="none" stroke="#e0243a" strokeWidth="3" />
      <rect x="370" y="270" width="130" height="60" fill="#5a3a24" stroke="#14111a" strokeWidth="4" /><rect x="400" y="248" width="60" height="22" fill="#d9c8a0" stroke="#14111a" strokeWidth="2" />
      <rect x="530" y="285" width="80" height="45" rx="4" fill="#3a4050" stroke="#14111a" strokeWidth="3" />{!s.flags.knife && <g stroke="#cfd6ee" strokeWidth="3"><path d="M545 300L595 300M545 310L595 310M545 320L595 320" /></g>}
      <rect x="650" y="150" width="100" height="180" rx="6" fill="#4a5060" stroke="#14111a" strokeWidth="4" /><circle cx="700" cy="215" r="22" fill="#2a2e3a" stroke="#8a96b8" strokeWidth="3" /><rect x="690" y="270" width="20" height="30" fill="#e0243a" />
      <H x={70} y={60} w={240} h={180} id="board" on={on} label="Delil panosu" hide={!lit} /><H x={370} y={245} w={130} h={85} id="diary" on={on} label="Masa ve günlük" hide={!lit} />
      <H x={530} y={285} w={80} h={45} id="knives" on={on} label="Kutu" hide={!lit} /><H x={650} y={150} w={100} h={180} id="vault" on={on} label="Kasa" hide={!lit} />
      <H x={0} y={0} w={60} h={450} id="back" on={on} label="Geri" />
      <text x="30" y="225" fill="#cfd6ee" fontSize="22" textAnchor="middle">◀</text>
      <rect x="0" y="0" width="800" height="450" fill={lit ? 'url(#mmlight)' : '#000'} style={{ pointerEvents: 'none' }} />
      {!lit && <text x="400" y="225" fill="#8a96b8" fontSize="26" textAnchor="middle" style={{ pointerEvents: 'none' }}>Çok karanlık. Işık gerek.</text>}
    </svg>
  );
}

function Keypad({ onDone }) {
  const [v, setV] = useState('');
  const add = (d) => { const n = (v + d).slice(0, 4); setV(n); if (n.length === 4) setTimeout(() => onDone(n), 150); };
  return (
    <div className="mm-ov"><div className="mm-pad"><div className="mm-disp">{v.padEnd(4, '·')}</div>
      <div className="mm-keys">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => <button key={d} onClick={() => add(d)}>{d}</button>)}<button onClick={() => setV('')}>Sil</button><button onClick={() => onDone(null)}>Kapat</button></div></div></div>
  );
}

function Fight({ onWin, onLose }) {
  const [st, setSt] = useState({ e: 0, d: 1, knives: 3, hp: 3, msg: 'Biri geliyor!', cine: '', t: 0, ring: 1, near: false });
  const ref = useRef(st); ref.current = st;
  const set = (p) => setSt((s) => ({ ...s, ...p }));
  useEffect(() => {
    let last = performance.now(), id;
    const loop = (n) => {
      const dt = Math.min(0.05, (n - last) / 1000); last = n; const s = ref.current;
      if (!s.cine && s.msg !== 'dead') {
        let { d, ring, near, hp, t } = s; t += dt; let msg = s.msg;
        if (!near) { d -= dt * 0.045; if (d <= 0.26) { near = true; ring = 1; msg = 'Yakın dövüş: tam zamanında SAVUŞTUR!'; } }
        else { ring -= dt * 0.7; if (ring <= 0) { hp -= 1; ring = 1; msg = 'Vuruldun!'; if (hp <= 0) { setTimeout(onLose, 600); msg = 'dead'; } } }
        setSt((x) => ({ ...x, d, ring, near, hp, t, msg }));
      } else if (s.cine) setSt((x) => ({ ...x, t: x.t + dt }));
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id);
  }, []);
  const kill = (kind) => {
    const e = ref.current.e; set({ cine: kind });
    setTimeout(() => { if (e >= 1) { onWin(); return; } set({ cine: '', e: e + 1, d: 1, near: false, ring: 1, msg: 'Bir tane daha!' }); }, 1400);
  };
  const throwK = () => {
    const s = ref.current; if (s.cine || s.near || s.knives <= 0) return; const m = 0.5 + 0.5 * Math.sin(s.t * 3.2);
    if (Math.abs(m - 0.5) < 0.13) kill('throw'); else set({ knives: s.knives - 1, d: Math.max(0.2, s.d - 0.1), msg: 'Iska! Bıçak boşa gitti.' });
  };
  const parry = () => {
    const s = ref.current; if (s.cine || !s.near) return;
    if (s.ring < 0.4 && s.ring > 0.05) kill('melee'); else set({ ring: 1, msg: 'Çok erken! Halka daralınca vur.' });
  };
  const m = 0.5 + 0.5 * Math.sin(st.t * 3.2), ex = 170 + st.d * 520;
  return (
    <div className={'mm-fight' + (st.cine ? ' cine ' + st.cine : '')}>
      <svg viewBox="0 0 800 450" className="mm-scene mm-fs">
        <rect width="800" height="450" fill="#2a2630" /><rect y="330" width="800" height="120" fill="#1b1820" />
        <g transform="translate(120 330)"><rect x="-8" y="-60" width="16" height="42" rx="5" fill="#4a6cb0" stroke="#10131f" strokeWidth="2" /><circle cx="0" cy="-72" r="11" fill="#f2c9a0" stroke="#10131f" strokeWidth="2" /><rect x="-7" y="-18" width="6" height="18" fill="#2a3c6a" /><rect x="1" y="-18" width="6" height="18" fill="#2a3c6a" /></g>
        <g transform={`translate(${ex} 330)`} opacity={st.cine ? 0.9 : 1}><rect x="-9" y="-62" width="18" height="44" rx="5" fill="#4a1f2a" stroke="#10131f" strokeWidth="2" transform={st.cine ? 'rotate(-80 0 0)' : ''} /><circle cx="0" cy="-75" r="11" fill="#e8b88a" stroke="#10131f" strokeWidth="2" transform={st.cine ? 'translate(-50 60)' : ''} /></g>
        {st.cine === 'throw' && <path d={`M135 270L${ex - 10} 262`} stroke="#fff" strokeWidth="4" />}
        {st.cine && <text x="400" y="120" textAnchor="middle" fill="#ffe08a" fontSize="40" fontWeight="800">{st.cine === 'throw' ? 'İSABET' : 'KARŞI ATAK'}</text>}
      </svg>
      <div className="mm-fhud"><span>{'♥'.repeat(Math.max(0, st.hp))}</span><span>Bıçak: {st.knives}</span><span>{st.e + 1}/2</span></div>
      <div className="mm-fmsg">{st.msg === 'dead' ? 'Yenildin…' : st.msg}</div>
      {!st.near ? (
        <div className="mm-fbar"><div className="mm-zone" /><div className="mm-mark" style={{ left: m * 100 + '%' }} /></div>
      ) : (
        <div className="mm-ringbox"><div className="mm-ring" style={{ transform: `scale(${0.2 + st.ring * 0.8})` }} /><div className="mm-ring tgt" /></div>
      )}
      <div className="mm-fbtn"><button className="pri" onClick={throwK} disabled={st.near || st.knives <= 0}>FIRLAT</button><button onClick={parry} disabled={!st.near}>SAVUŞTUR</button></div>
    </div>
  );
}

export default function App() {
  const [s, setS] = useState(load);
  const [scr, setScr] = useState('menu');
  const [talk, setTalk] = useState(null);
  const [msg, setMsg] = useState(null);
  const [sel, setSel] = useState(null);
  const [board, setBoard] = useState(false);
  const [bsel, setBsel] = useState(null);
  const [pad, setPad] = useState(false);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem('mimar-voice') !== '0'; } catch (e) { return true; } });
  const sref = useRef(s); sref.current = s;
  const save = (fn) => setS((o) => { const n = fn(JSON.parse(JSON.stringify(o))); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch (e) {} return n; });
  useEffect(() => { document.title = 'Mimar Dosyası'; if (window.speechSynthesis) window.speechSynthesis.getVoices(); }, []);
  const cap = 5 + (s.flags.bag ? 4 : 0);
  const say = (lines, then) => { setTalk({ lines, i: 0, then }); speak(lines[0][1], lines[0][0], voice); };
  const note = (t, who = 'agent') => { setMsg(t); speak(t, who, voice); };
  const nextTalk = () => { if (!talk) return; if (talk.i + 1 < talk.lines.length) { const l = talk.lines[talk.i + 1]; setTalk({ ...talk, i: talk.i + 1 }); speak(l[1], l[0], voice); } else { const t = talk.then; setTalk(null); window.speechSynthesis && window.speechSynthesis.cancel(); t && t(); } };

  const free = () => cap - sref.current.inv.length;
  const takeItems = (key, items, clues, text, after) => {
    const cur = sref.current;
    if (cur.flags[key]) return note(after || 'Burada artık bir şey yok.');
    if (free() < items.length) return note('Envanterin dolu! Birleştirebileceğin şeyleri birleştir.');
    save((o) => { o.flags[key] = true; o.inv.push(...items); (clues || []).forEach((c) => !o.clues.includes(c) && o.clues.push(c)); return o; });
    note(text);
  };
  const addClue = (c, text) => { save((o) => { if (!o.clues.includes(c)) o.clues.push(c); return o; }); note(text); };

  const on = (id) => {
    const cur = sref.current, has = (i) => cur.inv.includes(i);
    switch (id) {
      case 'table': return cur.flags.table ? note('Çizim masası artık boş.') : (() => { if (free() < 1) return note('Envanterin dolu!'); save((o) => { o.flags.table = true; o.flags.bag = true; o.inv.push('plan1'); return o; }); note('Masada yırtık bir plan parçası var. Masanın altında eski bir deri çanta da duruyor. *Envanter genişledi!*'); })();
      case 'bin': return takeItems('bin', ['plan2'], ['note'], 'Çöpte yırtık bir plan parçası ve buruşuk bir not var.', 'Çöp kutusunda başka bir şey yok.');
      case 'rug': return takeItems('rug', ['battery'], [], 'Halının altına bir pil saklanmış.', 'Halının altı boş.');
      case 'pot': return takeItems('pot', ['key'], [], 'Saksının toprağında küçük bir anahtar gizli.', 'Saksıda başka bir şey yok.');
      case 'drawer':
        if (cur.flags.drawer) return note('Çekmece boş.');
        if (!has('key')) return note('Çekmece kilitli. Küçük bir anahtar gerek.');
        if (free() < 1) return note('Envanterin dolu!');
        save((o) => { o.flags.drawer = true; o.inv = o.inv.filter((x) => x !== 'key'); o.inv.push('torch', 'plan3'); return o; });
        return note('Çekmecede pilsiz bir el feneri ve planın son parçası var.');
      case 'photo': return addClue('photo', 'Fotoğrafın altında el yazısı: *Mart\'ın on dördü.*');
      case 'clock': return addClue('clock', 'Saat üç on beşte durmuş. Bu bir tesadüf olmamalı.');
      case 'safe':
        if (cur.flags.safe) return note('Kasa boş.');
        return setPad(true);
      case 'shelf':
        if (has('fullplan')) { save((o) => { o.scene = 'secret'; o.flags.opened = true; return o; }); return note('Plana göre kitaplığın arkasında geçit var! Bir cilde basınca kitaplık kaydı.'); }
        return addClue('bookshelf', 'Bazı ciltler diğerlerinden temiz. Kitaplığın arkasında bir şey olabilir; planı bulmalıyız.');
      case 'back': save((o) => { o.scene = 'studio'; return o; }); return;
      case 'board': return addClue('board', 'Pano: Kule\'nin planı, bir tersane fotoğrafı ve ağ içinde göz sembolü.');
      case 'knives':
        if (cur.flags.knife) return note('Kutu boş.');
        if (free() < 1) return note('Envanterin dolu!');
        save((o) => { o.flags.knife = true; o.inv.push('knife'); return o; }); return note('Üç dengeli fırlatma bıçağı. İşe yarar.');
      case 'vault':
        if (cur.flags.seal) return note('Kasa boş.');
        if (!has('redcard')) return note('Kasanın kart okuyucusu yanıp sönüyor. Bir erişim kartı lazım.');
        if (free() < 0) return note('Envanterin dolu!');
        save((o) => { o.flags.seal = true; o.inv.push('seal'); return o; }); return note('Kart okundu. İçinde Mimar\'ın mührü var.');
      case 'diary':
        if (!cur.flags.knife) return note('Günlük masada. Ama bir şey ters; yanında silah olmadan okumak riskli. Etrafa bak.');
        save((o) => { if (!o.clues.includes('diary')) o.clues.push('diary'); return o; });
        say([['agent', 'Günlükte *tersane* geçiyor. Ağın yedeği orada.'], ['narr', 'Arkandan bir ayak sesi... Mimar\'ın adamları geliyor!']], () => setScr('fight'));
        return;
      default:
    }
  };
  const keyDone = (c) => {
    setPad(false); if (c == null) return;
    if (c === '1403') { if (free() < 1) return note('Doğru kod ama envanterin dolu! Yer aç.'); save((o) => { o.flags.safe = true; o.inv.push('redcard'); if (!o.clues.includes('cardviz')) o.clues.push('cardviz'); return o; }); note('Kasa açıldı! İçinde kırmızı bir kart ve bir kartvizit var.'); }
    else note('Yanlış kod. Fotoğraf ve saat bir ipucu olabilir.');
  };
  const invTap = (id) => {
    if (sel === id) { setSel(null); return; }
    if (!sel) { setSel(id); note(ITEMS[id].d); return; }
    const r = RECIPES.find(([p]) => (p[0] === sel && p[1] === id) || (p[1] === sel && p[0] === id));
    if (!r) { setSel(null); return note('Bunlar birleşmez.'); }
    save((o) => { o.inv = o.inv.filter((x, i, a) => !(x === sel && a.indexOf(x) === i) && !(x === id && a.indexOf(x) === i)); o.inv.push(r[1]); return o; }); setSel(null); note(r[2]);
  };
  const clueTap = (id) => {
    if (bsel === id) { setBsel(null); return; }
    if (!bsel) { setBsel(id); return; }
    const r = CLUE_RECIPES.find(([p]) => (p[0] === bsel && p[1] === id) || (p[1] === bsel && p[0] === id));
    setBsel(null);
    if (!r) return note('Bu iki ipucu birbirine bağlanmıyor.');
    save((o) => { if (!o.clues.includes(r[1])) o.clues.push(r[1]); return o; }); note(r[2]);
  };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} setS(fresh()); setSel(null); setBsel(null); };
  const start = () => { if (!s.started) { save((o) => { o.started = true; return o; }); setScr('play'); say(INTRO, null); } else setScr('play'); };
  const win = () => { save((o) => { o.done = true; o.scene = 'secret'; return o; }); setScr('play'); say(OUTRO, () => setScr('end')); };
  const toggleVoice = () => { const v = !voice; setVoice(v); try { localStorage.setItem('mimar-voice', v ? '1' : '0'); } catch (e) {} if (!v && window.speechSynthesis) window.speechSynthesis.cancel(); };

  if (scr === 'fight') return <div className="mm"><Fight onWin={win} onLose={() => { setScr('fight0'); setTimeout(() => setScr('fight'), 50); }} /></div>;
  if (scr === 'fight0') return <div className="mm" />;
  if (scr === 'menu') return (
    <div className="mm mm-menu">
      <h1>MİMAR DOSYASI</h1><p className="mm-sub">Kızıl Ağ sonrası. Delil topla, birleştir, gizli odayı bul.</p>
      <button className="pri" onClick={start}>{s.started ? 'Devam' : 'Başla'}</button>
      <button onClick={toggleVoice}>Seslendirme: {voice ? 'Açık' : 'Kapalı'}</button>
      {s.started && <button onClick={reset}>Baştan başla</button>}
      <p className="mm-how">Nesnelere dokun: ara, topla. Envanterde iki eşyaya sırayla dokunarak birleştir. Delil panosunda iki ipucunu birleştir. Seslendirme cihazının Türkçe sesini kullanır; ses yoksa yazı yeterli.</p>
    </div>
  );
  if (scr === 'end') return (
    <div className="mm mm-menu"><h1>Dosya kapandı</h1><p className="mm-sub">{s.flags.seal ? 'Mimar\'ın mührünü de buldun: tam başarı!' : 'Kasadaki mührü bulursan tam başarı olur.'}</p>
      <p className="mm-how">Toplanan ipucu: {s.clues.length}/{Object.keys(CLUES).length}</p>
      <button className="pri" onClick={() => { save((o) => { o.scene = 'secret'; return o; }); setScr('play'); }}>Odaya dön</button><button onClick={() => { reset(); setScr('menu'); }}>Baştan oyna</button></div>
  );

  return (
    <div className="mm">
      <div className="mm-top"><b>{s.scene === 'studio' ? 'Mimar\'ın atölyesi' : 'Gizli oda'}</b><span><button onClick={() => { setBoard(true); setBsel(null); }}>Delil panosu ({s.clues.length})</button> <button onClick={() => setScr('menu')}>Menü</button></span></div>
      <div className="mm-stage">{s.scene === 'studio' ? <Studio s={s} on={on} /> : <Secret s={s} on={on} />}</div>
      <div className="mm-inv">
        {s.inv.map((id, i) => <Chip key={id + i} id={id} sel={sel === id} onClick={() => invTap(id)} />)}
        {Array.from({ length: Math.max(0, cap - s.inv.length) }).map((_, i) => <span key={'e' + i} className="mm-empty" />)}
      </div>
      {msg && <div className="mm-msg" onClick={() => setMsg(null)}>{clean(msg)}<i>dokun ▸</i></div>}
      {talk && (() => { const [who, text] = talk.lines[talk.i], w = WHO[who] || WHO.narr; return (
        <div className="mm-talk" onClick={nextTalk}><div className="mm-box">{who !== 'narr' && <Portrait who={who} />}<div><b style={{ color: w[1] }}>{w[0]}</b><p style={{ fontStyle: who === 'narr' ? 'italic' : 'normal' }}>{clean(text)}</p><i>dokun ▸</i></div></div></div>); })()}
      {pad && <Keypad onDone={keyDone} />}
      {board && (
        <div className="mm-ov"><div className="mm-board"><h3>Delil panosu</h3><p className="mm-hint">İki ipucuna sırayla dokunarak bağlantı kur.</p>
          <div className="mm-clues">{s.clues.map((c) => <button key={c} className={'mm-clue' + (bsel === c ? ' sel' : '')} onClick={() => clueTap(c)}><b>{CLUES[c].n}</b><span>{CLUES[c].d}</span></button>)}{!s.clues.length && <span>Henüz ipucu yok.</span>}</div>
          <button className="pri" onClick={() => setBoard(false)}>Kapat</button></div></div>
      )}
    </div>
  );
}
