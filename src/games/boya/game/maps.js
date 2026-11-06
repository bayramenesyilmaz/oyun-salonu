// Boya Savaşı haritaları. Kutu: [x, z, genişlik, derinlik, yükseklik, renk, tabanY?]
// `half` listesi 180° döndürülüp yansıtılır (adil harita), `center` olduğu gibi kalır.
const rot = ([x, z, w, d, h, c, y]) => [-x, -z, w, d, h, c, y];

function mk(id, name, desc, o) {
  const boxes = [...o.center, ...o.half, ...o.half.map(rot)];
  const S = o.half_ - 3;
  return {
    id,
    name,
    desc,
    half: o.half_,
    sky: o.sky,
    fog: o.fog,
    g1: o.g1,
    g2: o.g2,
    wall: o.wall,
    boxes,
    spawns: [
      [[-5, -S], [5, -S]],
      [[5, S], [-5, S]],
    ],
  };
}

export const MAPS = [
  mk('liman', 'Konteyner Limanı', 'Kutular, geçitler, yakın dövüş köşeleri', {
    half_: 22,
    sky: '#8fd3f4',
    fog: '#bfe6f7',
    g1: '#7fcf6a',
    g2: '#74c45f',
    wall: '#f4f1e8',
    center: [[0, 0, 2.4, 2.4, 1.1, '#ffd23f']],
    half: [
      [-8, -6, 6, 2.4, 2.6, '#ff7a45'],
      [7, -10, 2.4, 6, 2.6, '#3fa3ff'],
      [-14, -11, 6, 2.4, 2.6, '#ffd23f'],
      [0, -4.5, 2.4, 6, 2.6, '#46c37b'],
      [-3, -12, 1.6, 1.6, 1.6, '#c98a4b'],
      [-3, -12, 1.6, 1.6, 1.6, '#e0a463', 1.6],
      [4, -14, 1.6, 1.6, 1.6, '#c98a4b'],
      [-13, -3, 1.6, 1.6, 1.6, '#c98a4b'],
      [12, -4, 1.6, 1.6, 1.6, '#c98a4b'],
      [16, -14, 1.6, 1.6, 1.6, '#c98a4b'],
      [-5, -9, 4, 0.6, 1.1, '#cfd8dc'],
      [10, -2, 0.6, 4, 1.1, '#cfd8dc'],
      [-18, -6, 0.6, 4, 1.1, '#cfd8dc'],
    ],
  }),
  mk('kasaba', 'Oyuncak Kasaba', 'Renkli bloklar, merdivenli orta kule', {
    half_: 20,
    sky: '#ffd9a8',
    fog: '#ffe9cc',
    g1: '#ffb3d1',
    g2: '#ffa3c6',
    wall: '#ffffff',
    center: [
      [0, 0, 5, 5, 2.7, '#ffd23f'],
      [3.1, 0, 1.2, 3, 1.8, '#ff7a45'],
      [4.3, 0, 1.2, 3, 1.2, '#ff9a5c'],
      [5.5, 0, 1.2, 3, 0.6, '#ffb98a'],
    ],
    half: [
      [-8, -8, 3, 3, 1.8, '#ff4d9d'],
      [8, -6, 2, 2, 1.2, '#46c37b'],
      [-13, -3, 2, 6, 1.2, '#3fa3ff'],
      [12, -13, 4, 2, 2.4, '#ff7a45'],
      [-4, -14, 2, 2, 2.4, '#a66bff'],
      [5, -11, 2, 2, 1.2, '#3fa3ff'],
      [-9, -1, 0.6, 4, 1.1, '#ffffff'],
      [14, -7, 4, 0.6, 1.1, '#ffffff'],
    ],
  }),
  mk('cati', 'Çatı Katı', 'Alçak siperler, su tankları, orta platform', {
    half_: 18,
    sky: '#7fb4ff',
    fog: '#bcd8ff',
    g1: '#b9c2cc',
    g2: '#aab4bf',
    wall: '#e9eef3',
    center: [
      [0, 0, 8, 4, 0.9, '#7a8a99'],
      [-4.8, 0, 1.4, 4, 0.45, '#95a4b3'],
      [4.8, 0, 1.4, 4, 0.45, '#95a4b3'],
    ],
    half: [
      [-8, -5, 2.5, 2.5, 1.6, '#cfd8dc'],
      [7, -8, 3, 3, 2.6, '#3fa3ff'],
      [-12, -11, 3, 3, 2.6, '#3fa3ff'],
      [4, -4, 0.8, 0.8, 3, '#ff7a45'],
      [-3, -9, 5, 0.6, 1.2, '#f4f1e8'],
      [11, -2, 0.6, 5, 1.2, '#f4f1e8'],
      [-13, -3, 2, 2, 1.3, '#ffd23f'],
    ],
  }),
];
