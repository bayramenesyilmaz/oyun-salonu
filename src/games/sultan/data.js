// Sultanlık Yolu: binalar, askerler, seferler, rütbeler, hikâye. Tüm isimler kurgusaldır.
export const GRID = 12;
export const RES = { a: 'Altın', o: 'Odun', y: 'Yemek' };

// tip: n ad, sz kaplama, max seviye, c maliyet tabanı, t süre tabanı (sn), hp, prod üretim, cap depo, def savunma
export const B = {
  konak: { n: 'Konak', sz: 2, max: 8, c: { a: 400, o: 300 }, t: 30, hp: 900, d: 'Köyün kalbi. Seviyesi diğer binaların sınırını belirler. Biraz altın, odun ve yemek de saklar.' },
  tarla: { n: 'Tarla', sz: 2, max: 8, c: { a: 60, o: 40 }, t: 10, hp: 220, prod: 'y', rate: 260, d: 'Yemek üretir. Askerler yemekle eğitilir.' },
  oduncu: { n: 'Oduncu', sz: 2, max: 8, c: { a: 80, o: 0 }, t: 12, hp: 240, prod: 'o', rate: 220, d: 'Odun üretir. Binalar odunla yapılır.' },
  maden: { n: 'Altın madeni', sz: 2, max: 8, c: { a: 0, o: 90 }, t: 14, hp: 260, prod: 'a', rate: 200, d: 'Altın üretir.' },
  ambar: { n: 'Ambar', sz: 2, max: 8, c: { a: 120, o: 120 }, t: 18, hp: 400, cap: 1500, d: 'Altın, odun ve yemek depolama sınırını artırır.' },
  kisla: { n: 'Kışla', sz: 2, max: 6, c: { a: 150, o: 200 }, t: 25, hp: 450, d: 'Asker eğitir. Seviyesi yeni asker türlerini açar.' },
  ordugah: { n: 'Ordugâh', sz: 2, max: 6, c: { a: 120, o: 150 }, t: 20, hp: 350, d: 'Ordu kapasitesini artırır.' },
  kule: { n: 'Okçu kulesi', sz: 1, max: 8, c: { a: 200, o: 150 }, t: 25, hp: 420, def: { r: 5, dps: 13, kind: 'ok' }, d: 'Menzildeki tek askere ok atar.' },
  top: { n: 'Top tabyası', sz: 1, max: 6, c: { a: 450, o: 300 }, t: 45, hp: 600, def: { r: 4, dmg: 34, rate: 1.7, splash: 0.9, kind: 'top' }, d: 'Yavaş ama alan hasarı verir. Kalabalıklara karşı etkili.' },
  sur: { n: 'Sur', sz: 1, max: 8, c: { a: 40, o: 60 }, t: 3, hp: 380, d: 'Düşmanı yavaşlatır. Askerler önce suru yıkmak zorunda kalır.' },
  demirci: { n: 'Demirci', sz: 2, max: 5, c: { a: 400, o: 400 }, t: 60, hp: 500, d: 'Askerlerinin seviyesini yükseltir (can ve hasar).' },
  usta: { n: 'Usta evi', sz: 1, max: 1, c: { a: 500, o: 300 }, t: 20, hp: 250, d: 'Bir usta daha: aynı anda iki inşaat.' },
};
// konak seviyesine göre her binadan kaç tane olabilir
export const LIMIT = {
  konak: [1, 1, 1, 1, 1, 1, 1, 1], tarla: [1, 2, 2, 3, 3, 4, 4, 5], oduncu: [1, 2, 2, 3, 3, 4, 4, 5], maden: [1, 1, 2, 2, 3, 3, 4, 4],
  ambar: [1, 1, 2, 2, 2, 3, 3, 4], kisla: [1, 1, 1, 2, 2, 2, 3, 3], ordugah: [1, 1, 1, 2, 2, 3, 3, 3], kule: [1, 2, 2, 3, 4, 4, 5, 6],
  top: [0, 0, 1, 1, 2, 2, 3, 3], sur: [0, 10, 18, 26, 34, 40, 46, 52], demirci: [0, 0, 1, 1, 1, 1, 1, 1], usta: [0, 1, 1, 1, 1, 1, 1, 1],
};
export const cost = (k, lv) => { const c = B[k].c, f = Math.pow(k === 'sur' ? 1.6 : 1.85, lv - 1); return { a: Math.round(c.a * f / 5) * 5, o: Math.round(c.o * f / 5) * 5 }; };
export const btime = (k, lv) => Math.min(6 * 3600, Math.round(B[k].t * Math.pow(k === 'sur' ? 1.5 : 2.25, lv - 1)));
export const bhp = (k, lv) => Math.round(B[k].hp * (1 + 0.38 * (lv - 1)));
export const prodRate = (k, lv) => (B[k].rate ? Math.round(B[k].rate * (1 + 0.55 * (lv - 1))) : 0);
export const prodCap = (k, lv) => prodRate(k, lv) * 2;
export const armyCapOf = (lv) => 15 + lv * 10;

export const T = {
  piyade: { n: 'Piyade', hp: 70, dps: 11, r: 0.7, sp: 1.1, sz: 1, cost: 25, t: 5, kisla: 1, col: '#e8505b', d: 'Ucuz ve dengeli. En yakın binaya saldırır.' },
  okcu: { n: 'Okçu', hp: 34, dps: 10, r: 3.2, sp: 1.25, sz: 1, cost: 45, t: 7, kisla: 2, col: '#3fb27f', d: 'Uzaktan ok atar, surların arkasını vurabilir.' },
  atli: { n: 'Atlı', hp: 170, dps: 18, r: 0.7, sp: 2.1, sz: 3, cost: 130, t: 14, kisla: 3, col: '#f08c00', pref: 'res', d: 'Çok hızlı. Önce tarla, maden ve ambarlara koşar.' },
  kocbasi: { n: 'Koçbaşı', hp: 320, dps: 60, r: 0.8, sp: 0.7, sz: 5, cost: 280, t: 25, kisla: 4, col: '#8d6e63', pref: 'def', d: 'Yavaş ama binalara büyük hasar. Önce savunma kulelerine gider.' },
  muhafiz: { n: 'Muhafız', hp: 760, dps: 34, r: 0.75, sp: 0.85, sz: 8, cost: 520, t: 40, kisla: 5, col: '#5c7cfa', pref: 'def', d: 'Zırhlı dev. Savunmaların ateşini üstüne çeker.' },
};
export const tStat = (k, smith) => { const f = 1 + 0.15 * (smith || 0); return { ...T[k], hp: Math.round(T[k].hp * f), dps: T[k].dps * f }; };

export const RANKS = [
  { n: 'Çırak', d: 'Komutan Alper\'in yanında işe başladın.', req: [] },
  { n: 'Er', d: 'Artık ordunun bir parçasısın.', req: [['konak', 2], ['sefer', 2]], gem: 10 },
  { n: 'Onbaşı', d: 'Küçük bir birliğin başındasın.', req: [['sefer', 5], ['egit', 25]], gem: 15 },
  { n: 'Çavuş', d: 'Askerler sana güveniyor.', req: [['konak', 3], ['yagma', 1]], gem: 20 },
  { n: 'Komutan yardımcısı', d: 'Alper Komutan seni sağ kolu yaptı.', req: [['sefer', 10], ['kule', 2]], gem: 25 },
  { n: 'Komutan', d: 'Kendi ordunu yönetiyorsun.', req: [['konak', 4], ['sefer', 14], ['yildiz', 25]], gem: 30 },
  { n: 'Paşa', d: 'Saray seni tanıyor.', req: [['konak', 5], ['sefer', 18], ['yagma', 5]], gem: 40 },
  { n: 'Vezir', d: 'Divanda söz sahibisin.', req: [['konak', 6], ['sefer', 24], ['yildiz', 55]], gem: 50 },
  { n: 'Sadrazam', d: 'Sultanın en yakınısın.', req: [['konak', 7], ['sefer', 29], ['yagma', 12]], gem: 70 },
  { n: 'Sultan', d: 'Gökyurt\'un yeni sultanı sensin!', req: [['konak', 8], ['sefer', 30]], gem: 150 },
];
export const REQ_TXT = { konak: (v) => `Konak ${v}. seviye`, sefer: (v) => `${v} sefer kazan`, egit: (v) => `${v} asker eğit`, yagma: (v) => `${v} yağma kazan`, kule: (v) => `${v} okçu kulesi`, yildiz: (v) => `${v} sefer yıldızı topla` };

export const CHAPTERS = [
  { n: 'Sınır Köyleri', intro: [['alper', 'Hoş geldin çırak. Gökyurt\'un sınır köylerini haydutlar basıyor. Köyünü kur, asker yetiştir.'], ['alper', 'Önce bir tarla ve oduncu yap. Sonra kışlada piyade eğit, ilk seferimize çıkalım.']], outro: [['alper', 'Haydutları dağıttın! Ama elebaşının üstünde Kara Han\'ın mührü vardı...'], ['sevda', 'Ben Vezir Sevda. Sultan seni izliyor. Kara Han ormandan ilerliyor, yola çık.']] },
  { n: 'Orman Yolu', intro: [['sevda', 'Kara Han\'ın öncüleri ormana kamp kurdu. Okçu kuleleri ağaçların arasında, dikkat.']], outro: [['alper', 'Orman temiz. Kervanlar yine yola çıkabilir. Senin gibi bir komutan yardımcım olduğu için şanslıyım.']] },
  { n: 'Tuz Gölü', intro: [['sevda', 'Tuz Gölü\'nde kervanlarımız esir alındı. Atlılarınla hızlı vur, ambarları geri al.']], outro: [['sevda', 'Kervanlar özgür! Sultan seni Paşa yapmayı düşünüyor. Ama Kara Han dağ kalelerini güçlendiriyor.']] },
  { n: 'Dağ Kaleleri', intro: [['alper', 'Dağ kaleleri taş surlarla çevrili. Koçbaşı olmadan geçemeyiz.']], outro: [['alper', 'Son kale de düştü. Yolun sonu Kara Han\'ın sarayı.'], ['sevda', 'Sultan yaşlandı. Kara Han\'ı yenen kişi tahta geçecek. O kişi sen olabilirsin.']] },
  { n: 'Kara Han\'ın Sarayı', intro: [['karahan', 'Demek o çırak sensin. Sarayıma gel de surlarımın nasıl olduğunu gör!']], outro: [['karahan', 'Bu... imkânsız. Bir çırak...'], ['sevda', 'Kara Han yenildi! Gökyurt halkı yeni sultanını alkışlıyor.'], ['alper', 'Seni ilk gün çırak olarak almıştım. Şimdi sana sultanım diyorum.']] },
];
export const WHO = { alper: { n: 'Komutan Alper', c: '#e8505b' }, sevda: { n: 'Vezir Sevda', c: '#7c6cf0' }, karahan: { n: 'Kara Han', c: '#222' }, narr: { n: '', c: '#555' } };
export const SEFER_NAMES = [
  'Değirmen yolu', 'Haydut çiftliği', 'Kuyu başı', 'Taş köprü', 'Yanık ahır', 'Haydut elebaşı',
  'Orman girişi', 'Ağaç kulesi', 'Avcı kampı', 'Dere kenarı', 'Kesik orman', 'Öncü karargâhı',
  'Tuz yolu', 'Kervansaray', 'Göl kıyısı', 'Beyaz tepe', 'Tuzcu köyü', 'Esir pazarı',
  'Dağ eteği', 'Kartal geçidi', 'Demir kale', 'Buz vadisi', 'Gözcü tepesi', 'Kara kale',
  'Sarayın dış surları', 'Hendek', 'Muhafız kışlası', 'Hazine dairesi', 'Kule kapısı', 'Kara Han\'ın tahtı',
];

// küçük deterministik rastgele
export function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// sefer/bot köyü üretimi: power 1..30
export function genVillage(power, seed) {
  const R = rng(seed * 7919 + power * 31 + 1);
  const ri = (a, b) => Math.floor(a + R() * (b - a + 1));
  const kl = Math.min(8, 1 + Math.floor(power / 4));
  const dl = Math.max(1, Math.min(8, 1 + Math.floor(power / 3.6)));
  const occ = Array.from({ length: GRID }, () => Array(GRID).fill(0));
  const bs = [];
  const place = (k, lv, x, y) => {
    const s = B[k].sz;
    if (x < 1 || y < 1 || x + s > GRID - 1 || y + s > GRID - 1) return false;
    for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) if (occ[y + j][x + i]) return false;
    for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) occ[y + j][x + i] = 1;
    bs.push({ k, lv, x, y }); return true;
  };
  const c = GRID / 2 - 1;
  place('konak', kl, c, c);
  const nK = 1 + Math.floor(power / 4) + (power % 6 === 0 ? 1 : 0), nT = Math.max(0, Math.floor((power - 6) / 5)) + (power % 6 === 0 && power > 6 ? 1 : 0);
  const near = (k, lv, rad) => { for (let t = 0; t < 60; t++) { const a = R() * Math.PI * 2, d = rad * (0.6 + R() * 0.5); if (place(k, lv, Math.round(c + Math.cos(a) * d), Math.round(c + Math.sin(a) * d))) return; } };
  for (let i = 0; i < nK; i++) near('kule', dl, 2.6);
  for (let i = 0; i < nT; i++) near('top', Math.max(1, dl - 2), 2.2);
  const res = ['tarla', 'maden', 'oduncu', 'ambar'];
  const nR = 2 + Math.min(5, Math.floor(power / 4));
  for (let i = 0; i < nR; i++) near(res[i % 4], Math.max(1, kl - ri(0, 1)), 3.6);
  if (power >= 4) near('kisla', Math.max(1, kl - 2), 3.8);
  // surlar: konak çevresinde halka
  if (power >= 5) {
    const r = power >= 18 ? 3 : 2, wl = Math.max(1, dl - 1);
    for (let i = -r; i <= r + 1; i++) for (const [x, y] of [[c + i, c - r], [c + i, c + r + 1], [c - r, c + i], [c + r + 1, c + i]]) {
      if (power < 12 && (i === 0 || i === 1) && R() < 0.8) continue; // ilk surlarda kapı boşluğu
      place('sur', wl, x, y);
    }
  }
  return bs;
}

export function seferLoot(i) { const p = i + 1; return { a: 150 + p * p * 22, o: 150 + p * p * 22, y: 120 + p * p * 15 }; }

export function newVillage() {
  return [
    { id: 1, k: 'konak', lv: 1, x: 5, y: 5 },
    { id: 2, k: 'tarla', lv: 1, x: 2, y: 3 },
    { id: 3, k: 'kisla', lv: 1, x: 8, y: 3 },
    { id: 4, k: 'ordugah', lv: 1, x: 8, y: 7 },
    { id: 5, k: 'kule', lv: 1, x: 4, y: 8 },
  ];
}
