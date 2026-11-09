// Lig Efsanesi: veri, oyuncu üretimi, lig/kupa, ekonomi. Tüm isimler kurgusaldır.
export const FIRST = ['Emre', 'Can', 'Burak', 'Mert', 'Kaan', 'Arda', 'Efe', 'Yusuf', 'Ömer', 'Ali', 'Hakan', 'Serkan', 'Tolga', 'Onur', 'Barış', 'Volkan', 'Cem', 'Deniz', 'Kerem', 'Eren', 'Umut', 'Oğuz', 'Selim', 'Furkan', 'Tuna', 'Doruk', 'Batu', 'Alp', 'Mehmet', 'Kemal', 'Orhan', 'Sinan', 'Taylan', 'Berk', 'Ozan', 'Recep', 'Halil', 'Yiğit', 'Koray', 'Erdem'];
export const LAST = ['Kaya', 'Demir', 'Yıldız', 'Çelik', 'Şahin', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Erdoğdu', 'Yalçın', 'Güneş', 'Bulut', 'Tekin', 'Acar', 'Ateş', 'Uçar', 'Sarı', 'Toprak', 'Bozkurt', 'Keskin', 'Duman', 'Eren', 'Turan', 'Coşkun', 'Ekinci', 'Tunç', 'Akın'];
const PLACES = ['Çamlıca', 'Kuyubaşı', 'Yıldıztepe', 'Esentepe', 'Gülbahçe', 'Karapınar', 'Akdere', 'Taşlık', 'Söğütlü', 'Kavaklı', 'Değirmendere', 'Bayırbaşı', 'Ilıca', 'Kocapınar', 'Sarıyurt', 'Gökçeada', 'Narlıdere', 'Yeşilova', 'Dumlupınar', 'Mavikent', 'Altınkum', 'Kızılırmak', 'Fındıklı', 'Erguvan', 'Martı', 'Poyraz', 'Kartaltepe', 'Ayışığı', 'Yıldırımköy', 'Lodos'];
const SUFF = ['Spor', 'Gençlik', 'FK', 'Gücü', 'İdman Yurdu', 'Belediyespor', 'Yıldızları', 'Kartalları', 'United', 'Atletik'];
export const COLORS = [['#e03131', '#ffffff'], ['#1c7ed6', '#ffd43b'], ['#2b8a3e', '#ffffff'], ['#7048e8', '#ffd43b'], ['#f08c00', '#1a1a2e'], ['#111111', '#ffffff'], ['#c2255c', '#ffe066'], ['#0b7285', '#ffffff'], ['#ffd43b', '#1c3faa'], ['#5f3dc4', '#ff8787']];
export const POS = { KL: 'Kaleci', DF: 'Defans', OS: 'Orta saha', FV: 'Forvet' };

export const LEAGUES = [
  { n: 'Mahalle Ligi', lo: 36, hi: 50, prize: 400, win: 120, fans: 200 },
  { n: 'İlçe Ligi', lo: 44, hi: 56, prize: 700, win: 180, fans: 500 },
  { n: 'Bölgesel Amatör', lo: 50, hi: 62, prize: 1100, win: 260, fans: 1200 },
  { n: '3. Lig', lo: 56, hi: 67, prize: 1700, win: 380, fans: 3000 },
  { n: '2. Lig', lo: 61, hi: 72, prize: 2600, win: 520, fans: 7000 },
  { n: '1. Lig', lo: 66, hi: 77, prize: 4000, win: 720, fans: 15000 },
  { n: 'Süper Lig', lo: 71, hi: 84, prize: 6500, win: 1000, fans: 40000 },
];

export const FACILITIES = {
  stad: { n: 'Stadyum', d: 'Her iç saha maçında bilet geliri', max: 8, cost: (l) => 600 * Math.pow(1.8, l) },
  saha: { n: 'Antrenman sahası', d: 'Antrenman ucuzlar, oyuncular maçlarda daha hızlı gelişir', max: 8, cost: (l) => 500 * Math.pow(1.75, l) },
  saglik: { n: 'Sağlık merkezi', d: 'Kondisyon daha hızlı dolar, sakatlıklar kısalır', max: 6, cost: (l) => 450 * Math.pow(1.8, l) },
  altyapi: { n: 'Altyapı', d: 'Her sezon daha iyi bir genç oyuncu çıkar', max: 6, cost: (l) => 700 * Math.pow(1.8, l) },
  scout: { n: 'Gözlemci ağı', d: 'Transfer pazarına daha iyi oyuncular gelir', max: 6, cost: (l) => 650 * Math.pow(1.8, l) },
};

let SEED = Date.now() % 100000;
export const rand = () => { SEED = (SEED * 16807 + 11) % 2147483647; return SEED / 2147483647; };
export const ri = (a, b) => Math.floor(a + rand() * (b - a + 1));
export const pick = (a) => a[Math.floor(rand() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let UID = 1;
export const newId = () => 'p' + Date.now().toString(36) + (UID++).toString(36) + Math.floor(rand() * 1e4).toString(36);

export function ovr(p) {
  if (p.pos === 'KL') return Math.round(p.def * 0.7 + p.hiz * 0.2 + p.pas * 0.1);
  if (p.pos === 'DF') return Math.round(p.def * 0.5 + p.hiz * 0.25 + p.pas * 0.15 + p.sut * 0.1);
  if (p.pos === 'OS') return Math.round(p.pas * 0.4 + p.hiz * 0.2 + p.sut * 0.2 + p.def * 0.2);
  return Math.round(p.sut * 0.45 + p.hiz * 0.35 + p.pas * 0.15 + p.def * 0.05);
}
export const SPECIAL = { KL: 'Refleks', DF: 'Sert savunma', OS: 'Usta pasör', FV: 'Golcü' };
export function genPlayer(pos, base, age) {
  age = age || ri(18, 32);
  const v = () => clamp(Math.round(base + (rand() * 2 - 1) * 8), 25, 95);
  const p = { id: newId(), n: pick(FIRST) + ' ' + pick(LAST), pos, age, hiz: v(), sut: v(), pas: v(), def: v(), fit: 100, inj: 0, goals: 0, ast: 0, apps: 0, num: 0 };
  const bump = (k, d) => (p[k] = clamp(p[k] + d, 25, 97));
  if (pos === 'KL') { bump('def', 9); bump('sut', -12); }
  if (pos === 'DF') { bump('def', 7); bump('sut', -6); }
  if (pos === 'OS') { bump('pas', 7); }
  if (pos === 'FV') { bump('sut', 8); bump('def', -8); bump('hiz', 3); }
  p.pot = clamp(ovr(p) + Math.max(0, 27 - age) * ri(1, 3), ovr(p), 95);
  return p;
}
export const value = (p) => Math.round((Math.pow(ovr(p), 2.4) / 90) * (p.age < 24 ? 1.4 : p.age > 30 ? 0.7 : 1) / 10) * 10;
export const wage = (p) => Math.round(value(p) / 60);

export function genTeam(lvl, name, cols) {
  const L = LEAGUES[lvl];
  const base = ri(L.lo + 2, L.hi - 3);
  const ps = [genPlayer('KL', base), genPlayer('DF', base), genPlayer('OS', base), genPlayer('OS', base), genPlayer('FV', base), genPlayer('DF', base - 4), genPlayer('FV', base - 4)];
  ps.forEach((p, i) => (p.num = [1, 4, 8, 10, 9, 5, 11][i]));
  const c = cols || pick(COLORS);
  return { id: 't' + newId(), name: name || pick(PLACES) + ' ' + pick(SUFF), c1: c[0], c2: c[1], form: pick(['1-2-1', '2-1-1', '2-2', '1-1-2']), tactic: pick(['dengeli', 'dengeli', 'pres', 'kontra', 'hucum']), players: ps, start: ps.slice(0, 5).map((p) => p.id) };
}

export function teamPower(T) {
  const ids = T.start || T.players.slice(0, 5).map((p) => p.id);
  const ps = ids.map((id) => T.players.find((p) => p.id === id)).filter(Boolean);
  if (!ps.length) return 0;
  return Math.round(ps.reduce((s, p) => s + ovr(p) * (0.85 + 0.15 * (p.fit ?? 100) / 100), 0) / ps.length);
}

// Çift devreli fikstür (round robin, "circle" yöntemi)
export function fixtures(ids) {
  const n = ids.length, arr = ids.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const rd = [];
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; rd.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(rd);
    arr.splice(1, 0, arr.pop());
  }
  return rounds.concat(rounds.map((rd) => rd.map(([a, b]) => [b, a])));
}

export function quickResult(pa, pb, homeAdv = 2) {
  const d = pa + homeAdv - pb;
  const la = clamp(1.5 + d * 0.09, 0.2, 4.5), lb = clamp(1.5 - d * 0.09, 0.2, 4.5);
  const pois = (l) => { let k = 0, p = Math.exp(-l), s = p, u = rand(); while (u > s && k < 9) { k++; p *= l / k; s += p; } return k; };
  return [pois(la), pois(lb)];
}

export function newSeason(save, lvl) {
  const L = LEAGUES[lvl];
  const ai = [];
  for (let i = 0; i < 7; i++) ai.push(genTeam(lvl));
  const ids = [save.club.id, ...ai.map((t) => t.id)];
  const table = {}; ids.forEach((id) => (table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  // kupa: 8 takım, 3 tur (çeyrek, yarı, final)
  const cupTeams = [save.club.id];
  const cupAi = [];
  for (let i = 0; i < 7; i++) { const t = genTeam(clamp(lvl + ri(-1, 1), 0, LEAGUES.length - 1)); cupAi.push(t); cupTeams.push(t.id); }
  return {
    n: (save.season?.n || 0) + 1, lvl, league: L.n, ai, cupAi, fx: fixtures(ids), md: 0, table, results: [],
    cup: { round: 0, teams: cupTeams, alive: cupTeams.slice(), at: [3, 7, 11], done: false, won: false, log: [] },
  };
}

export function findTeam(save, id) {
  if (id === save.club.id) return save.club;
  return save.season.ai.find((t) => t.id === id) || save.season.cupAi.find((t) => t.id === id) || null;
}

export function sortedTable(save) {
  const s = save.season;
  return Object.entries(s.table).map(([id, r]) => ({ id, ...r, team: findTeam(save, id) })).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

export const ACH = [
  { id: 'w1', n: 'İlk galibiyet', d: 'Bir maç kazan', g: 5, ok: (s) => s.stats.w >= 1 },
  { id: 'w10', n: 'Seri galip', d: 'Toplam 10 maç kazan', g: 10, ok: (s) => s.stats.w >= 10 },
  { id: 'w50', n: 'Kazanma makinesi', d: 'Toplam 50 maç kazan', g: 30, ok: (s) => s.stats.w >= 50 },
  { id: 'g50', n: 'Gol yağmuru', d: 'Toplam 50 gol at', g: 10, ok: (s) => s.stats.gf >= 50 },
  { id: 'g200', n: 'Gol fabrikası', d: 'Toplam 200 gol at', g: 30, ok: (s) => s.stats.gf >= 200 },
  { id: 'big', n: 'Farklı galibiyet', d: 'Bir maçı 5 farkla kazan', g: 8, ok: (s) => s.stats.bigWin },
  { id: 'played', n: 'Sahada', d: '5 maçı kendin yönet', g: 6, ok: (s) => s.stats.played >= 5 },
  { id: 'up1', n: 'Mahalleden çıkış', d: 'İlçe Ligi\'ne yüksel', g: 10, ok: (s) => s.club.maxLvl >= 1 },
  { id: 'up3', n: 'Profesyonel', d: '3. Lig\'e yüksel', g: 20, ok: (s) => s.club.maxLvl >= 3 },
  { id: 'up6', n: 'Süper Lig', d: 'Süper Lig\'e yüksel', g: 50, ok: (s) => s.club.maxLvl >= 6 },
  { id: 'champ', n: 'Şampiyon', d: 'Bir lig şampiyonluğu kazan', g: 15, ok: (s) => s.trophies.some((t) => t.k === 'lig') },
  { id: 'cup', n: 'Kupa sahibi', d: 'Kupayı kazan', g: 15, ok: (s) => s.trophies.some((t) => t.k === 'kupa') },
  { id: 'double', n: 'Duble', d: 'Aynı sezon lig ve kupa', g: 30, ok: (s) => s.stats.double },
  { id: 'superchamp', n: 'Efsane', d: 'Süper Lig şampiyonu ol', g: 100, ok: (s) => s.trophies.some((t) => t.k === 'lig' && t.lvl === 6) },
  { id: 'star', n: 'Yıldız kadro', d: 'Gücü 80 üstü bir oyuncu al', g: 15, ok: (s) => s.club.players.some((p) => ovr(p) >= 80) },
  { id: 'fac', n: 'Tesisleşme', d: 'Tüm tesisleri en az 3. seviyeye çıkar', g: 20, ok: (s) => Object.keys(FACILITIES).every((k) => (s.fac[k] || 0) >= 3) },
  { id: 'online', n: 'Dostluk maçı', d: 'Başka bir oyuncunun takımıyla oyna', g: 8, ok: (s) => s.stats.friendly >= 1 },
];

export function newSave(name, cols) {
  const club = genTeam(0, name, cols);
  club.id = 'me';
  // başlangıç kadrosu zayıf ama dengeli
  club.players = [genPlayer('KL', 44, 24), genPlayer('DF', 44, 21), genPlayer('DF', 42, 29), genPlayer('OS', 45, 20), genPlayer('OS', 43, 26), genPlayer('FV', 46, 19), genPlayer('FV', 42, 27)];
  club.players.forEach((p, i) => (p.num = [1, 4, 5, 8, 10, 9, 11][i]));
  club.start = [club.players[0], club.players[1], club.players[3], club.players[4], club.players[5]].map((p) => p.id);
  club.form = '1-2-1'; club.tactic = 'dengeli'; club.maxLvl = 0;
  const save = { v: 1, club, coins: 1500, gems: 10, fac: { stad: 0, saha: 0, saglik: 0, altyapi: 0, scout: 0 }, stats: { w: 0, d: 0, l: 0, gf: 0, ga: 0, played: 0, friendly: 0 }, trophies: [], ach: {}, news: [], market: [], mdTime: Date.now(), lastTick: Date.now(), half: 120, history: [] };
  save.season = newSeason(save, 0);
  refreshMarket(save);
  save.news.unshift({ t: Date.now(), x: `${name} kuruldu! Başkan senden Mahalle Ligi'nde iyi bir sezon bekliyor.` });
  return save;
}

export function refreshMarket(save) {
  const lvl = save.season.lvl, L = LEAGUES[lvl], sc = save.fac.scout || 0;
  save.market = [];
  const poss = ['KL', 'DF', 'DF', 'OS', 'OS', 'FV', 'FV', 'OS'];
  for (let i = 0; i < 8; i++) {
    const base = ri(L.lo, L.hi) + sc * 1.5 + (i === 7 ? 4 : 0);
    const p = genPlayer(poss[i], base, i === 6 ? ri(17, 20) : undefined);
    p.price = value(p);
    save.market.push(p);
  }
}

// gerçek zamanlı kondisyon yenilenmesi (saatte ~12, sağlık merkeziyle artar)
export function tick(save) {
  const now = Date.now(), h = (now - (save.lastTick || now)) / 3600000;
  save.lastTick = now;
  const rate = 12 + (save.fac.saglik || 0) * 4;
  for (const p of save.club.players) p.fit = Math.min(100, p.fit + h * rate);
}

export function trainCost(save, p) {
  return Math.round((60 + ovr(p) * ovr(p) * 0.09) * (1 - (save.fac.saha || 0) * 0.07));
}
export function train(save, p, stat) {
  const c = trainCost(save, p);
  if (save.coins < c || p[stat] >= 97) return false;
  const cap = Math.max(p.pot, ovr(p)) + 4;
  if (ovr(p) >= cap) return 'cap';
  save.coins -= c; p[stat] = Math.min(97, p[stat] + 1); p.fit = Math.max(30, p.fit - 6);
  return true;
}
