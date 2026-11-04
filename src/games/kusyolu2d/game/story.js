// Kuşyolu 2D — Bölüm 1 metinleri. Kişiler, yerler ve olaylar kurgudur.
// 3B sürümdeki replikler aynen kullanılır; böylece mevcut seslendirmeler de çalışır.
import { SPEAKERS, CHAPTER1 } from '../../kusyolu/game/story.js';

export const SPEAKERS2 = {
  ...SPEAKERS,
  nevin: { name: 'Nevin Teyze', color: '#f4b8d8' },
  hayri: { name: 'Hayri Amca', color: '#e8d4a0' },
  cocuk: { name: 'Minik Ece', color: '#ffe48a' },
};

export const C1 = CHAPTER1;

export const ROOF = {
  allTalked: [
    { s: 'elif', t: 'Arda, buraya gel. Çatının ucundan gökyüzü bütün açık.' },
    { s: 'elif', t: 'Bir iddia: beş meteor saymadan aşağı inmek yok.' },
  ],
  watchStart: [{ s: 'elif', t: 'Gözünü kırpma. Bir tane kayınca hemen söyle.' }],
  counted: ['Bir!', 'İki!', 'Üç! Bu parlaktı.', 'Dört!', 'Beş!'],
  door: [{ s: 'mert', t: 'Önden sen in Arda. Biz arkandayız.' }],
};

export const STAIRS = {
  nevin: [
    { s: 'nevin', t: 'Oğlum, o ses neydi? Camlar zangır zangır titredi!' },
    { s: 'arda', t: 'Bir şey düştü Nevin Teyze, galiba meteor. Sen içeride kal.' },
    { s: 'nevin', t: 'Meteor mu? Aman Allah’ım. Dikkat edin, üşütmeyin bari.' },
  ],
  flicker: [
    { s: 'kaan', t: 'Işıklara bak. Bütün apartman göz kırpıyor.' },
    { s: 'mert', t: 'Elektrik dalgalanıyor. Düşen şey her neyse bir alan yayıyor.' },
  ],
  ece: [
    { s: 'cocuk', t: 'Abla! Gökten yeşil bir şey düştü, ben gördüm!' },
    { s: 'zeynep', t: 'Biz de gördük canım. Hadi içeri, annen merak etmesin.' },
  ],
  exit: [{ s: 'kaan', t: 'Arsa sokağın sonunda. Koşun!' }],
};

export const STREET = {
  start: [{ s: 'zeynep', t: 'Arabaların alarmı çalıyor. Bütün mahalle uyanacak.' }],
  hayri: [
    { s: 'hayri', t: 'Gençler, bu saatte nereye böyle? Bir şey patladı, duydunuz mu?' },
    { s: 'kaan', t: 'Duyduk Hayri Amca. Ona bakmaya gidiyoruz!' },
    { s: 'hayri', t: 'Aman yaklaşmayın. Ben polisi aradım bile.' },
    { s: 'mert', t: 'O zaman hızlı olmamız lazım.' },
  ],
  dog: [{ s: 'elif', t: 'Köpekler de hissetmiş. Hepsi aynı yöne havlıyor.' }],
  lamp: [{ s: 'arda', t: 'Sokak lambaları da sönüp yanıyor. Arsaya yaklaştıkça artıyor.' }],
  fence: [{ s: 'kaan', t: 'Çitte bir delik var, ben hep buradan girerim. Eğilin.' }],
};

export const ARSA = {
  end: [{ s: 'anlatici', t: 'O gece mahalle bir meteor konuştu. Biz ise elimizde atan bir kalple eve döndük.' }],
};

export const CHAPTERS2D = [
  { id: 1, title: 'Göktaşı', place: 'Kızılkaya Mahallesi · Ağustos · 23.40', open: true },
  { id: 2, title: 'Kor', place: 'Mahalle sokakları · 00.20' },
  { id: 3, title: 'Depo', place: 'Eski vinç deposu' },
  { id: 4, title: 'Hazırlık', place: 'Depo · üç hafta sonra' },
  { id: 5, title: 'Kalkış', place: 'Kızılkaya · şafak' },
  { id: 6, title: 'Boşluk', place: 'Dünya ile Ay arası' },
  { id: 7, title: 'İniş', place: 'Ay · Kapı' },
];
