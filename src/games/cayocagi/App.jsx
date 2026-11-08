import { useEffect, useRef, useState } from 'react';
import './cayocagi.css';

const TEAS = { acik: { n: 'Açık', c: '#e8a85a' }, normal: { n: 'Normal', c: '#c9672a' }, koyu: { n: 'Koyu', c: '#7a2a14' }, tavsan: { n: 'Tavşan kanı', c: '#b8321a' } };
const TYPES = [
  { id: 'esnaf', n: 'Esnaf Cemal', skin: '#e0b088', hat: '#555', pat: 1, pay: 1 },
  { id: 'ogr', n: 'Öğrenci Elif', skin: '#f2c9a0', hat: '#4a8a6a', pat: 1.1, pay: 1 },
  { id: 'taksi', n: 'Taksici Kemal', skin: '#d6a070', hat: '#f2c230', pat: 0.9, pay: 1.1 },
  { id: 'muhtar', n: 'Muhtar Şükrü', skin: '#e8b88a', hat: '#6a4a3a', pat: 0.6, pay: 2 },
  { id: 'nuri', n: 'Nuri Amca', skin: '#e8c9a8', hat: '#c9c9c9', pat: 1.3, pay: 1.2, change: true },
  { id: 'mufettis', n: 'Müfettiş Bey', skin: '#d9b896', hat: '#222', pat: 0.8, pay: 3, strict: true },
];
const DAYS = [
  { goal: 25, time: 55, types: [0, 1, 2], title: 'Sabah Servisi', intro: 'ÇIRAK! Semaver dolu, bardaklar temiz, *kafan boş!* Hadi başla, ilk gün seni yıkmam.' },
  { goal: 45, time: 60, types: [0, 1, 2, 3], title: 'Muhtar Geliyor', intro: 'Bugün *Muhtar Şükrü* uğrayacak. Sabrı yok, bahşişi var. Sakın bekletme!' },
  { goal: 65, time: 65, types: [0, 1, 2, 3, 4], title: 'Nuri Amca Karar Veremiyor', intro: 'Nuri Amca siparişini hep değiştirir. *Dinle, not al, şaşırma!*' },
  { goal: 95, time: 70, types: [0, 1, 2, 3, 4], title: 'Maç Akşamı', intro: 'MAÇ VAR! Herkes çay isteyecek. *Tavşan kanı* da çıktı. Elin hızlı olsun!', rush: true },
  { goal: 130, time: 75, types: [0, 1, 2, 3, 4, 5], title: 'Müfettiş Günü', intro: 'Belediyeden *müfettiş* geliyor. Hata yaparsan ben değil, o seni yer. HATASIZ!' },
];
const UPS = [
  { id: 'semaver', n: 'Hızlı semaver', d: 'Çay daha hızlı dolar', c: 15 },
  { id: 'altin', n: 'Altın bardak', d: 'Kazanç %25 artar', c: 30 },
  { id: 'nane', n: 'Nane şekeri', d: 'Abi daha geç sinirlenir', c: 25 },
];
const GOOD = ['Hah, işte bu! ...Dur, sevinme daha.', 'Bu sefer doğru yaptın *evladım*.', 'Çay güzel olmuş, iltifat bekleme.', 'Aferin. Yürü, sıradaki bekliyor!'];
const BAD = ['BU NE?! Ben sana *bunu* mu öğrettim?!', 'Çayı mı yaktın, suyu mu kirlettin?! *Yeniden!*', 'Müşterinin istediği başka, sen başka!', 'Oğlum gözün nerede senin?! SİPARİŞE BAK!', 'Bu çay değil, *şeker şerbeti!*'];
const LATE = ['Müşteri bekletilir mi lan?! *ÇABUK OL!*', 'Gitti müşteri! Kasamı sen mi dolduracaksın?!', 'Bekleyen var! Elini çabuk tut *çırak!*'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const KEY = 'cayocagi-v1';
const load = () => { try { return { day: 0, coins: 0, up: {}, best: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { day: 0, coins: 0, up: {}, best: {} }; } };

function speak(text, on) {
  const ss = window.speechSynthesis; if (!on || !ss) return; ss.cancel();
  const v = ss.getVoices().find((x) => /^tr/i.test(x.lang));
  for (const part of text.split(/(\*[^*]+\*)/).filter(Boolean)) {
    const em = part.startsWith('*'); const u = new SpeechSynthesisUtterance(part.replace(/\*/g, '')); u.lang = 'tr-TR'; if (v) u.voice = v;
    u.pitch = em ? 0.75 : 0.55; u.rate = em ? 0.95 : 1.15; u.volume = 1; ss.speak(u);
  }
}
const clean = (t) => t.replace(/\*/g, '');
const orderText = (o) => `${TEAS[o.tea].n}, ${o.sugar ? o.sugar + ' şekerli' : 'şekersiz'}${o.lemon ? ', limonlu' : ''}${o.simit ? ', yanında simit' : ''}`;

function Glass({ tea, sugar, lemon, size = 44 }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 44 48" aria-hidden="true">
      <path d="M8 6 Q6 22 14 42 L30 42 Q38 22 36 6 Z" fill="#dde9f0" stroke="#8aa0b0" strokeWidth="1.5" />
      {tea && <path d="M9.5 12 Q8 24 15 40 L29 40 Q36 24 34.5 12 Z" fill={TEAS[tea].c} />}
      {lemon && <circle cx="34" cy="10" r="5" fill="#f2e04a" stroke="#c9b82a" />}
      {sugar > 0 && <g fill="#fff" stroke="#bbb" strokeWidth=".5">{Array.from({ length: sugar }).map((_, i) => <rect key={i} x={2 + i * 6} y="44" width="5" height="4" />)}</g>}
      <rect x="20" y="0" width="3" height="14" fill="#9aa" transform="rotate(10 21 7)" />
    </svg>
  );
}
function Abi({ anger, talk }) {
  const a = Math.min(1, anger / 100); const col = `rgb(${Math.round(224 + 20 * a)},${Math.round(176 - 100 * a)},${Math.round(136 - 90 * a)})`;
  return (
    <div className="co-abi">
      <svg viewBox="0 0 120 110" width="96" height="88" aria-label="Çaycı Abi">
        <rect x="30" y="76" width="60" height="34" rx="6" fill="#6a3a2a" />
        <circle cx="60" cy="48" r="30" fill={col} stroke="#3a2418" strokeWidth="3" />
        <path d="M32 30 Q60 6 88 30 L88 24 Q60 -2 32 24Z" fill="#c9c9c9" stroke="#3a2418" strokeWidth="2" />
        <path d={`M40 ${40 - a * 6} L54 ${44 + a * 6}`} stroke="#222" strokeWidth="4" strokeLinecap="round" /><path d={`M80 ${40 - a * 6} L66 ${44 + a * 6}`} stroke="#222" strokeWidth="4" strokeLinecap="round" />
        <circle cx="47" cy="50" r="3.5" fill="#222" /><circle cx="73" cy="50" r="3.5" fill="#222" />
        <path d="M42 64 Q60 56 78 64 Q60 70 42 64Z" fill="#222" />
        <ellipse cx="60" cy="76" rx={8 + a * 4} ry={2 + a * 6} fill="#5a1a1a" />
        {a > 0.55 && <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8"><path d="M26 22 Q20 14 26 8" fill="none" /><path d="M94 22 Q100 14 94 8" fill="none" /></g>}
      </svg>
      <div className="co-bubble">{clean(talk)}</div>
    </div>
  );
}
function Person({ c, onClick }) {
  const t = TYPES[c.t]; const p = Math.max(0, c.pat / c.max);
  return (
    <button className={'co-cust' + (p < 0.3 ? ' hurry' : '')} onClick={onClick}>
      <svg viewBox="0 0 60 60" width="54" height="54" aria-hidden="true"><rect x="12" y="38" width="36" height="22" rx="8" fill="#4a6cb0" /><circle cx="30" cy="26" r="14" fill={t.skin} stroke="#3a2418" strokeWidth="2" />
        <path d="M16 22 Q30 6 44 22Z" fill={t.hat} />{c.t === 5 && <g fill="none" stroke="#111" strokeWidth="2"><circle cx="24" cy="27" r="4" /><circle cx="36" cy="27" r="4" /></g>}
        <circle cx="24" cy="27" r="1.6" fill="#222" /><circle cx="36" cy="27" r="1.6" fill="#222" /><path d="M24 34 Q30 38 36 34" stroke="#222" strokeWidth="2" fill="none" transform={p < 0.3 ? 'translate(0 3) scale(1 -1) translate(0 -68)' : ''} /></svg>
      <b>{t.n}</b>
      <div className="co-ord"><Glass tea={c.o.tea} sugar={c.o.sugar} lemon={c.o.lemon} size={26} />{c.o.simit && <i className="co-simit" />}</div>
      <small>{orderText(c.o)}</small>
      <div className="co-pat"><div style={{ width: p * 100 + '%', background: p > 0.5 ? '#6bd07a' : p > 0.25 ? '#f2c230' : '#e0243a' }} /></div>
    </button>
  );
}

export default function App() {
  const [sv, setSv] = useState(load);
  const [scr, setScr] = useState('menu');
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem('co-voice') !== '0'; } catch (e) { return true; } });
  const [, force] = useState(0);
  const G = useRef(null); const svr = useRef(sv); svr.current = sv; const vr = useRef(voice); vr.current = voice;
  const save = (fn) => setSv((o) => { const n = fn(JSON.parse(JSON.stringify(o))); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch (e) {} return n; });
  useEffect(() => { document.title = 'Çay Ocağı'; window.speechSynthesis && window.speechSynthesis.getVoices(); }, []);
  const talk = (t) => { G.current.line = t; speak(t, vr.current); };

  const startDay = (i) => {
    const d = DAYS[i], up = svr.current.up;
    G.current = { i, d, t: d.time, money: 0, anger: 0, cust: [], glass: null, simit: false, pour: 0, next: 1.5, serv: 0, bad: 0, lost: 0, id: 0, line: clean(d.intro), up, over: null, tips: 0 };
    setScr('play'); speak(d.intro, vr.current);
  };
  useEffect(() => {
    if (scr !== 'play') return;
    const id = setInterval(() => {
      const g = G.current; if (!g || g.over) return; const dt = 0.1, day = g.i + 1, aMul = (g.up.nane ? 0.75 : 1) * (g.d.types.includes(5) ? 1.4 : 1);
      g.t -= dt; g.pour = Math.max(0, g.pour - dt); g.anger = Math.max(0, g.anger - dt * 0.25);
      g.next -= dt; const slots = g.d.rush ? 5 : 4;
      if (g.next <= 0 && g.cust.length < slots) {
        const ti = pick(g.d.types), t = TYPES[ti]; const strengths = day >= 4 ? ['acik', 'normal', 'koyu', 'tavsan'] : ['acik', 'normal', 'koyu'];
        const o = { tea: pick(strengths), sugar: Math.floor(Math.random() * 4), lemon: day >= 2 && Math.random() < 0.3, simit: day >= 2 && Math.random() < 0.35 };
        const max = Math.max(11, 24 - day * 1.8) * t.pat; g.cust.push({ id: ++g.id, t: ti, o, pat: max, max, changed: false });
        g.next = Math.max(1.6, (g.d.rush ? 3.2 : 5.5) - day * 0.5) * (0.7 + Math.random() * 0.6);
      }
      for (const c of g.cust) {
        c.pat -= dt;
        if (TYPES[c.t].change && !c.changed && c.pat < c.max * 0.55) { c.changed = true; c.o = { ...c.o, sugar: (c.o.sugar + 2) % 4, tea: c.o.tea === 'koyu' ? 'acik' : 'koyu' }; talk('Nuri Amca: DUR EVLADIM, fikrimi değiştirdim! *' + TEAS[c.o.tea].n + '* olsun!'); }
      }
      const gone = g.cust.filter((c) => c.pat <= 0);
      if (gone.length) { g.cust = g.cust.filter((c) => c.pat > 0); g.lost += gone.length; g.anger += 12 * gone.length * aMul; talk(pick(LATE)); }
      if (g.anger >= 100) { g.over = 'boom'; speak('YETER! *ÇAYI BIRAKIYORUM!* Çık dükkanımdan!', vr.current); }
      else if (g.t <= 0) { g.over = g.money >= g.d.goal ? 'win' : 'short'; if (g.over === 'win') speak('Hmm... hedef tamam. *Fena değil* çırak.', vr.current); else speak('Kasa eksik! *Bu aybaşı maaş yok!*', vr.current); }
      if (g.over === 'win') save((o) => { o.day = Math.max(o.day, g.i + 1); o.coins += Math.round(g.money); o.best[g.i] = Math.max(o.best[g.i] || 0, Math.round(g.money)); return o; });
      force((x) => x + 1);
    }, 100);
    return () => clearInterval(id);
  }, [scr]);

  const g = G.current;
  const pourTea = (tea) => { if (!g || g.over || g.pour > 0 || g.glass) return; g.glass = { tea, sugar: 0, lemon: false }; g.pour = g.up.semaver ? 0.25 : 0.6; force((x) => x + 1); };
  const sugar = () => { if (!g || g.over || !g.glass || g.glass.sugar >= 3) return; g.glass.sugar++; force((x) => x + 1); };
  const lemon = () => { if (!g || g.over || !g.glass) return; g.glass.lemon = !g.glass.lemon; force((x) => x + 1); };
  const simit = () => { if (!g || g.over) return; g.simit = !g.simit; force((x) => x + 1); };
  const trash = () => { if (!g || g.over) return; g.glass = null; g.simit = false; force((x) => x + 1); };
  const serve = (c) => {
    if (!g || g.over) return; if (!g.glass) { talk('Önce çayı doldur çırak, elinde ne var?!'); return; } if (g.pour > 0) return;
    let diff = 0; if (g.glass.tea !== c.o.tea) diff++; if (g.glass.sugar !== c.o.sugar) diff++; if (g.glass.lemon !== c.o.lemon) diff++; if (g.simit !== c.o.simit) diff++;
    const aMul = (g.up.nane ? 0.75 : 1) * (g.d.types.includes(5) ? 1.4 : 1);
    if (diff === 0) { const pay = (4 + (c.o.sugar ? 0.5 : 0) + (c.o.lemon ? 1 : 0) + (c.o.simit ? 2 : 0)) * TYPES[c.t].pay * (g.up.altin ? 1.25 : 1) * (0.8 + 0.4 * (c.pat / c.max)); g.money += pay; g.serv++; g.anger = Math.max(0, g.anger - 6); talk(pick(GOOD)); }
    else { g.bad++; g.money = Math.max(0, g.money - 1); g.anger += (10 + diff * 5) * aMul; talk(pick(BAD)); }
    g.cust = g.cust.filter((x) => x.id !== c.id); g.glass = null; g.simit = false; force((x) => x + 1);
  };
  const buy = (u) => save((o) => { if (!o.up[u.id] && o.coins >= u.c) { o.up[u.id] = 1; o.coins -= u.c; } return o; });
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} setSv({ day: 0, coins: 0, up: {}, best: {} }); };
  const toggleVoice = () => { const v = !voice; setVoice(v); try { localStorage.setItem('co-voice', v ? '1' : '0'); } catch (e) {} if (!v && window.speechSynthesis) window.speechSynthesis.cancel(); };

  if (scr === 'menu') return (
    <div className="co co-menu"><h1>ÇAY OCAĞI</h1><p className="co-sub">Sinirli Çaycı Abi'nin çırağısın. Siparişi doğru yap, Abi'yi patlatma.</p>
      <button className="pri" onClick={() => setScr('days')}>{sv.day ? 'Devam' : 'Başla'}</button>
      <button onClick={toggleVoice}>Abi'nin sesi: {voice ? 'Açık' : 'Kapalı'}</button>
      {sv.day > 0 && <button onClick={reset}>Baştan başla</button>}
      <p className="co-how">Çay seç, şeker ve limon ekle, gerekirse simit al; sonra müşteriye dokun. Sipariş farklıysa Abi sinirlenir. Bekleyen müşteri gidince de. Sesi cihazın Türkçe sesiyle verir.</p></div>
  );
  if (scr === 'days') return (
    <div className="co co-menu"><h1>Günler</h1><p className="co-sub">Kasa: {sv.coins} TL</p>
      <div className="co-list">{DAYS.map((d, i) => <button key={i} disabled={i > sv.day} onClick={() => startDay(i)}><b>{i + 1}. {d.title}</b><small>Hedef {d.goal} TL · {d.time} sn{sv.best[i] ? ` · en iyi ${sv.best[i]} TL` : ''}</small></button>)}</div>
      <h3>Geliştirmeler</h3>
      <div className="co-list">{UPS.map((u) => <button key={u.id} disabled={sv.up[u.id] || sv.coins < u.c} onClick={() => buy(u)}><b>{u.n}</b><small>{sv.up[u.id] ? 'Alındı' : `${u.c} TL · ${u.d}`}</small></button>)}</div>
      <button onClick={() => setScr('menu')}>Geri</button></div>
  );
  if (!g) return null;
  return (
    <div className="co">
      <div className="co-top"><span>{g.d.title}</span><b>{Math.round(g.money)} / {g.d.goal} TL</b><span>{Math.max(0, Math.ceil(g.t))} sn</span></div>
      <div className="co-anger"><div style={{ width: Math.min(100, g.anger) + '%' }} /><em>Abi'nin siniri</em></div>
      <Abi anger={g.anger} talk={g.line} />
      <div className="co-row">{g.cust.map((c) => <Person key={c.id} c={c} onClick={() => serve(c)} />)}{!g.cust.length && <span className="co-wait">Müşteri bekleniyor…</span>}</div>
      <div className="co-station">
        <div className="co-glass">{g.glass ? <Glass tea={g.pour > 0 ? null : g.glass.tea} sugar={g.glass.sugar} lemon={g.glass.lemon} size={50} /> : <span>Bardak yok</span>}{g.simit && <i className="co-simit big" />}{g.pour > 0 && <small>doluyor…</small>}</div>
        <div className="co-btns">
          {Object.entries(TEAS).map(([k, t]) => <button key={k} onClick={() => pourTea(k)} disabled={!!g.glass} style={{ borderColor: t.c }}>{t.n}</button>)}
          <button onClick={sugar} disabled={!g.glass || g.glass.sugar >= 3}>Şeker +1</button><button onClick={lemon} disabled={!g.glass} className={g.glass && g.glass.lemon ? 'on' : ''}>Limon</button>
          <button onClick={simit} className={g.simit ? 'on' : ''}>Simit</button><button onClick={trash}>Çöp</button>
        </div>
      </div>
      {g.over && (
        <div className="co-ov"><h2>{g.over === 'win' ? 'Gün tamam!' : g.over === 'boom' ? 'Abi patladı!' : 'Hedef tutmadı'}</h2>
          <p>{g.over === 'win' ? `Kazanç ${Math.round(g.money)} TL. Abi: "Fena değil."` : g.over === 'boom' ? 'Abi çayı bıraktı, seni kapıdan çıkardı.' : `${Math.round(g.money)} / ${g.d.goal} TL. Kasa eksik.`}</p>
          <p className="co-sub">Doğru servis: {g.serv} · Hata: {g.bad} · Giden müşteri: {g.lost}</p>
          {g.over === 'win' && g.i + 1 < DAYS.length && <button className="pri" onClick={() => startDay(g.i + 1)}>Sonraki gün</button>}
          {g.over === 'win' && g.i + 1 >= DAYS.length && <p className="co-sub">Tüm günleri bitirdin. Abi seni ortak yapmayı düşünüyor.</p>}
          {g.over !== 'win' && <button className="pri" onClick={() => startDay(g.i)}>Tekrar dene</button>}
          <button onClick={() => { if (window.speechSynthesis) window.speechSynthesis.cancel(); setScr('days'); }}>Günler / Geliştir</button></div>
      )}
    </div>
  );
}
