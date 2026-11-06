// Hapisten Kaçış bölümleri. Kutu: [x, z, genişlik, derinlik, yükseklik, renk, tabanY?]
const T = 1;
const W = (x0, z0, x1, z1, h = 6, c = '#d7dbe3') =>
  Math.abs(z1 - z0) < 1e-6 ? [(x0 + x1) / 2, z0, Math.abs(x1 - x0) + T, T, h, c] : [x0, (z0 + z1) / 2, T, Math.abs(z1 - z0) + T, h, c];
const stairs = (x0, z, dir, n, run, wid, rise, c) =>
  Array.from({ length: n }, (_, i) => [x0 + dir * (i * run + run / 2), z, run, wid, rise * (i + 1), c]);

export const CHAPTERS = [
  {
    id: 1,
    title: 'Bölüm 1 · Hücre',
    goal: 'Hücreden çık, iki basma plakasına aynı anda bas, kapıyı aç ve çıkışa git.',
    intro: [
      'Taşkale Hapishanesi. Gece yarısı. Dışarıda yağmur, içeride bir tek nöbetçi ayak sesi.',
      'Kaan ve Mert yan hücrelerde yatıyor. İkisi de haksız yere buraya düşmüş, ikisi de aynı planı biliyor.',
      'Duvarın deliğinden bir not geçmişti: "Anahtarlar yatakların altında. Kapılar sabaha kadar açık kalmaz. Gardiyanı atlat, birlikte çıkın."',
      'Birbirinizi bırakmayın. Bu gece ya ikiniz çıkarsınız ya da hiçbiriniz.',
    ],
    outro: ['Koridorun sonundaki kapı arkanızdan kapandı. Soğuk gece havası yüzünüze çarptı.', 'Ama bu sadece ilk duvardı. Önlerinde hücre blokları var.'],
    half: [34, 22],
    sky: '#2a3350', fog: '#2f3a5c', g1: '#9aa4b5', g2: '#8d97a9',
    star3: 150, star2: 240,
    boxes: [
      W(-28, -19, -28, -11), W(-18, -19, -18, -11), W(-8, -19, -8, -11), W(-28, -19, -8, -19),
      W(-28, -11, -25, -11), W(-21, -11, -15, -11), W(-11, -11, -8, -11),
      [-23, -16, 3, 1.4, 0.8, '#6b7a99'], [-13, -16, 3, 1.4, 0.8, '#6b7a99'],
      [-10, 2, 3, 3, 2.6, '#c98a4b'], [-2, 10, 4, 3, 2.6, '#c98a4b'], [8, 0, 3, 3, 2.6, '#d9a463'], [14, 12, 3, 5, 2.6, '#c98a4b'],
      [-20, 10, 6, 1.2, 2, '#8a96a8'], [0, -4, 1.6, 1.6, 6, '#aab3c0'], [0, 14, 1.6, 1.6, 6, '#aab3c0'], [18, -6, 1.6, 1.6, 6, '#aab3c0'],
      [24, 10, 6, 1.2, 2, '#8a96a8'], [-30, 8, 1.2, 8, 2, '#8a96a8'],
      W(30, -22, 30, -5), W(30, 5, 30, 22),
    ],
    spawns: [[-23, -14], [-13, -14]],
    spawnYaw: Math.PI,
    keys: [
      { id: 'ka', name: 'A hücre anahtarı', x: -23, z: -16, c: '#ffd23f' },
      { id: 'kb', name: 'B hücre anahtarı', x: -13, z: -16, c: '#ffd23f' },
    ],
    doors: [
      { id: 'dA', x: -23, z: -11, w: 4, d: 0.6, h: 5, need: ['ka'], c: '#ffd23f' },
      { id: 'dB', x: -13, z: -11, w: 4, d: 0.6, h: 5, need: ['kb'], c: '#ffd23f' },
      { id: 'dG', x: 30, z: 0, w: 1, d: 10, h: 6, plates: 'g1', c: '#ff4d5e' },
    ],
    plates: [
      { id: 'p1', g: 'g1', x: -26, z: 16 },
      { id: 'p2', g: 'g1', x: 21, z: -16 },
    ],
    guards: [
      { path: [[-18, -2], [-18, 14], [10, 14], [10, -2]] },
      { path: [[22, -8], [22, 14]] },
    ],
    exit: { x: 33, z: 0, w: 3, d: 9 },
    bot: 'Mert',
  },
  {
    id: 2,
    title: 'Bölüm 2 · Hücre Blokları',
    goal: 'İki anahtarı bul: kırmızı anahtar üst galeride, mavi anahtar plakalı kasada. İkisiyle çıkış kapısını aç.',
    intro: [
      'Hücre blokları: uzun koridorlar, demir kapılar, yankılanan adımlar. Gardiyanlar burada üç kişi.',
      'Mert fısıldadı: "Çıkış kapısı iki anahtarla açılıyor. Biri üst galerideki gözetleme odasında, biri de eski kasada."',
      'Kasanın kapısı iki plakaya aynı anda basınca açılıyor. Biriniz uzakta, biriniz ortada olmalı.',
      'Gardiyanı fark ederse "!" işareti çıkar. Taş atarak dikkatini başka yöne çekebilirsiniz.',
    ],
    outro: [
      'Çıkış kapısı gıcırdayarak açıldı. Karşıda mutfak ve çamaşırhane koridoru uzanıyordu.',
      'Hapishanenin kalbine girdiniz. Bölüm 3 ve sonrası: Mutfak, Avlu, Müdür Katı ve Tünel. Çok yakında.',
    ],
    half: [48, 34],
    sky: '#2a3350', fog: '#2f3a5c', g1: '#a3acbb', g2: '#949eb0',
    star3: 240, star2: 360,
    boxes: [
      // giriş odası ve hole geçit
      W(-36, -34, -36, -4), W(-36, 4, -36, 34),
      // mavi anahtar kasası (kuzeybatı), kapı boşluğu x[-28,-24]
      W(-34, -22, -29, -22), W(-23, -22, -18, -22), W(-34, -34, -34, -22), W(-18, -34, -18, -22),
      // doğu duvarı ve çıkış koridoru
      W(12, -34, 12, -6), W(12, 6, 12, 34),
      // galeri döşemesi (üst kat) ve merdiven
      [0, 22, 16, 16, 0.4, '#8f9bb0', 2.6],
      ...stairs(-18, 22, 1, 10, 1.0, 6, 0.3, '#7d8aa3'),
      // siperler
      [-26, 4, 3, 3, 2.6, '#c98a4b'], [-14, -8, 4, 3, 2.6, '#d9a463'], [-22, -14, 6, 1.2, 2, '#8a96a8'],
      [-4, 4, 3, 3, 2.6, '#c98a4b'], [6, -10, 3, 5, 2.6, '#d9a463'], [4, -22, 8, 1.2, 2, '#8a96a8'],
      [-8, -28, 2, 2, 6, '#aab3c0'], [-6, 12, 1.6, 1.6, 6, '#aab3c0'], [8, 12, 1.6, 1.6, 6, '#aab3c0'],
      [-30, 14, 1.2, 8, 2, '#8a96a8'], [-30, 28, 6, 1.2, 2, '#8a96a8'], [24, 18, 3, 3, 2.6, '#c98a4b'], [24, -18, 3, 3, 2.6, '#d9a463'],
    ],
    spawns: [[-44, -2], [-44, 2]],
    spawnYaw: -Math.PI / 2,
    keys: [
      { id: 'kr', name: 'Kırmızı anahtar', x: 4, z: 22, y: 3.0, c: '#ff4d5e' },
      { id: 'kb', name: 'Mavi anahtar', x: -26, z: -30, c: '#3fa3ff' },
    ],
    doors: [
      { id: 'dV', x: -26, z: -22, w: 4, d: 0.6, h: 6, plates: 'g2', c: '#ff4d5e' },
      { id: 'dX', x: 12, z: 0, w: 1, d: 12, h: 6, need: ['kr', 'kb'], c: '#ffd23f' },
    ],
    plates: [
      { id: 'q1', g: 'g2', x: -32, z: 28 },
      { id: 'q2', g: 'g2', x: 6, z: -14 },
    ],
    guards: [
      { path: [[-30, -5], [-10, -5], [-10, 10], [-30, 10]] },
      { path: [[0, -4], [26, -4], [26, 12], [0, 12]] },
      { path: [[-18, 28], [8, 28]] },
    ],
    exit: { x: 45, z: 0, w: 3, d: 12 },
    bot: 'Mert',
    last: true,
  },
];
