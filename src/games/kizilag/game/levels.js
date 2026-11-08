// Bölüm verileri. Koordinatlar: x sağa, y aşağı; yükseklik 720. Oyuncu 26x54 (ayak tabanı y).
const S = (t, x, y, w, h, o = {}) => ({ t, x, y, w, h, ...o });
const wall = (x, y, w, h, col) => S('wall', x, y, w, h, { col });
const metal = (x, y, w, h) => S('metal', x, y, w, h);
const crate = (x, y, w = 60, h = 60) => S('crate', x, y, w, h);
const glass = (x, y, w, h) => S('glass', x, y, w, h);
const door = (id, x, y, w, h) => S('door', x, y, w, h, { id });
const G = (x, w, y = 620) => wall(x, y, w, 720 - y + 120, '#2a3150');
const hint = (x, y, text) => ({ x, y, text });
const guard = (x, y, o = {}) => ({ k: 'guard', x, y, ...o });

export const LEVELS = [
  {
    id: 1, name: 'Çatı', place: 'Eski Şehir · Gece', theme: 'roof', w: 3500, needRico: 1,
    start: { x: 90, y: 600 },
    solids: [
      G(-40, 780, 600), G(890, 890, 600), G(1930, 870, 560), G(2950, 650, 600),
      wall(-40, -400, 40, 1400), wall(3500, -400, 40, 1400),
      crate(1080, 530, 60, 70), crate(1140, 530, 0.1, 0.1),
      S('wall', 1180, 440, 150, 18, { col: '#3a4470' }),
      // sekme bulmacası: duvarın arkasındaki gardiyan, tavan kirişi
      wall(2290, 420, 44, 140, '#394066'), metal(2180, 250, 420, 24),
    ].filter((s) => s.w > 1),
    posters: [{ x: 330, y: 470 }, { x: 2800, y: 430 }],
    lamps: [{ x: 600, y: 360 }],
    hints: [hint(200, 440, 'A / D: yürü · SPACE: zıpla'), hint(560, 440, 'Fare: nişan al · tık: ateş'), hint(1000, 400, 'Sağ tık / SHIFT basılı: yavaş çekim'), hint(2210, 200, 'Duvara çarpan mermi seker!'), hint(3130, 470, 'Terminali vur → çıkış açılır')],
    enemies: [guard(1560, 600, { face: -1 }), guard(2560, 560, { face: -1 }), guard(2430, 560, { face: -1 }), guard(2100, 560, { face: 1, patrol: 90 })],
    terms: [{ x: 3130, y: 600 }], lock: 'term',
    pickups: [{ k: 'intel', id: 'i1', x: 1260, y: 440 }, { k: 'heart', x: 1700, y: 600 }],
    exit: { x: 3380, y: 480, w: 80, h: 120 },
    intro: [
      ['narr', 'Şehir bu gece uyuyor sanıyor. Ama bir şey var: Kızıl Ağ.'],
      ['agent', 'Elif iki gündür ulaşılamıyor. Son sinyali bu çatılardan geldi.'],
      ['elif', '(telsiz) ...Sessiz... bana bir şifre bıraktılar... ağın merkezi... yukarıda...'],
      ['agent', 'Dayan Elif. Geliyorum.'],
    ],
    outro: [['agent', 'Terminalde sadece bir isim var: "Depo 7". Oraya gidiyorum.']],
    dossier: [['i1', 'Kızıl Ağ dosyası #1', 'Şehrin kamera, trafik ve banka ağlarına gizlice sızan bir örgüt. Sembolleri: ağ içinde bir göz. Her gözlemlenen kişi, bir dosyaya dönüşüyor.']],
  },
  {
    id: 2, name: 'Depo 7', place: 'Liman Bölgesi · İç mekân', theme: 'depo', w: 3700, needRico: 2,
    start: { x: 90, y: 620 },
    solids: [
      G(-40, 3800), wall(-40, -400, 40, 1400), wall(3700, -400, 40, 1400), wall(-40, -100, 3800, 160, '#20263a'),
      // oda 1
      metal(760, 500, 50, 120), crate(300, 560), crate(380, 500, 60, 120), crate(460, 560),
      wall(980, 60, 40, 340, '#262d47'), door('d1', 1100, 60, 40, 560),
      // oda 2: asılı duvar + sekme
      crate(1500, 560), crate(1560, 500, 60, 120), metal(1900, 500, 40, 120), metal(1740, 300, 120, 20), wall(2100, 60, 60, 120, '#262d47'),
      wall(2230, 60, 50, 440, '#2f3656'), crate(2090, 560), door('d2', 2540, 60, 40, 560),
      // oda 3
      metal(2900, 500, 50, 120), crate(3000, 560), crate(3060, 500, 60, 120), metal(3300, 500, 40, 120),
    ],
    posters: [{ x: 200, y: 280 }, { x: 1300, y: 280 }],
    lamps: [{ x: 600, y: 120 }, { x: 1700, y: 120 }, { x: 3100, y: 120 }],
    hints: [hint(160, 300, 'Anahtarı vur → kapı açılır'), hint(2160, 300, 'Tavandan sektir')],
    enemies: [guard(700, 620, { face: -1 }), guard(880, 620, { face: -1 }), guard(1400, 620, { face: -1, patrol: 80 }), { k: 'sniper', x: 1800, y: 300, face: -1 }, guard(2400, 620, { face: 1 }), guard(2820, 620, { face: -1 }), guard(3200, 620, { face: -1 }), { k: 'drone', x: 3000, y: 300 }],
    switches: [{ id: 'd1', x: 940, y: 180 }, { id: 'd2', x: 2420, y: 110 }],
    pickups: [{ k: 'intel', id: 'i2', x: 1590, y: 500 }, { k: 'heart', x: 2000, y: 620 }],
    exit: { x: 3560, y: 500, w: 90, h: 120 }, lock: 'term', terms: [{ x: 3450, y: 620 }],
    intro: [['narr', 'Liman bölgesindeki Depo 7. Dışarıdan terk edilmiş görünüyor.'], ['agent', 'Terk edilmiş depoda bu kadar kamera ne arıyor?']],
    outro: [['agent', 'Burada "Teslimat Planı" yazıyor: Elif bir konteynerle limana götürülecek. Zaman daralıyor.']],
    dossier: [['i2', 'Kızıl Ağ dosyası #2', 'Örgüt, kayıp insanları "veri taşıyıcı" olarak kullanıyor: şifreleme bilen uzmanları kaçırıp ağın şifrelerini kırdırıyor. Elif de bunlardan biri.']],
  },
  {
    id: 3, name: 'Liman', place: 'Kuzey Rıhtım · Gün batımı', theme: 'liman', w: 4300, needRico: 2,
    start: { x: 90, y: 620 },
    solids: [
      G(-40, 950), G(1000, 1350), G(2420, 1900),
      wall(-40, -400, 40, 1400), wall(4300, -400, 40, 1400),
      // konteyner sırası
      metal(1060, 500, 150, 120), metal(1250, 500, 150, 120), metal(1250, 380, 150, 20), metal(1440, 500, 150, 120),
      // kalkan bulmacası: konteyner yansıtıcı
      metal(2100, 490, 40, 130),
      // vinç basamakları
      metal(2560, 500, 130, 20), metal(2760, 450, 130, 20), metal(2960, 370, 130, 20), metal(3160, 450, 130, 20),
      // baraka
      wall(3640, 400, 40, 100, '#4a3a5a'), glass(3640, 500, 40, 120), wall(3640, 340, 460, 60, '#4a3a5a'),
    ],
    lamps: [],
    hints: [hint(380, 440, 'Kırmızı varil: vur, patlasın'), hint(1900, 400, 'Kalkanlıyı arkadan vur — konteynerden sektir'), hint(3780, 300, 'Camı kır → terminali vur')],
    barrels: [{ x: 640, y: 620 }, { x: 1970, y: 620 }, { x: 3330, y: 620 }],
    enemies: [guard(580, 620, { face: -1 }), guard(700, 620, { face: -1 }), guard(820, 620, { face: -1, patrol: 40 }), { k: 'sniper', x: 1320, y: 380, face: -1 }, guard(1700, 620, { face: -1 }), { k: 'shield', x: 1900, y: 620, face: -1 }, { k: 'shield', x: 2300, y: 620, face: -1 }, { k: 'turret', x: 3040, y: 354 }, guard(3350, 620, { face: -1 }), guard(3480, 620, { face: -1 }), { k: 'drone', x: 3700, y: 250 }],
    terms: [{ x: 3860, y: 620 }], lock: 'term',
    pickups: [{ k: 'intel', id: 'i3', x: 3025, y: 370 }, { k: 'heart', x: 1180, y: 500 }],
    exit: { x: 4180, y: 500, w: 90, h: 120 },
    intro: [['narr', 'Gün batıyor. Rıhtımda yükleme vinçleri ve ağır güvenlik var.'], ['agent', 'Elif\'i taşıyan konteyner bu limandan çıkacak. Gemi kalkmadan bulmalıyım.']],
    outro: [['elif', '(telsiz) Sessiz... beni "Yönetici" bir binaya götürüyorlar. Gökdelen... yüksek bir yer...'], ['agent', 'Kızıl Ağ\'ın merkezi. İşte orası.']],
    dossier: [['i3', 'Kızıl Ağ dosyası #3', 'Örgütün lideri "Yönetici". Şehrin en yüksek binasından, dev bir veri merkezinden ağı yönetiyor. Her şey o binada toplanıyor.']],
  },
  {
    id: 4, name: 'Gökdelen', place: 'Merkez Kule · Lobi ve Sunucu Katı', theme: 'ofis', w: 4200, needRico: 3, bossHp: 12,
    start: { x: 90, y: 620 },
    solids: [
      G(-40, 4300), wall(-40, -400, 40, 1400), wall(4200, -400, 40, 1400), wall(-40, -100, 4300, 160, '#162038'),
      // lobi
      glass(620, 60, 24, 560), crate(300, 560), metal(450, 500, 40, 120), crate(1000, 560, 60, 60), crate(1060, 500, 60, 120),
      // güvenlik kapısı
      wall(1380, 60, 40, 330, '#202a48'), door('g1', 1380, 390, 40, 230),
      // sunucu katı
      metal(1700, 500, 50, 120), metal(2100, 500, 50, 120), wall(2350, 60, 60, 300, '#202a48'), crate(2250, 560), crate(2250, 500, 60, 120),
      glass(2750, 60, 24, 560),
      // patron arenası
      metal(3050, 560, 70, 60), metal(3550, 470, 160, 20),
    ],
    lamps: [{ x: 500, y: 120 }, { x: 1900, y: 120 }, { x: 3500, y: 120 }],
    hints: [hint(560, 300, 'Cam kırılır'), hint(3400, 220, 'Kalkan terminalini vur → Yönetici açılır')],
    enemies: [guard(800, 620, { face: -1 }), guard(900, 620, { face: -1 }), { k: 'drone', x: 700, y: 300 }, { k: 'drone', x: 1100, y: 250 }, { k: 'turret', x: 1800, y: 100 }, guard(1560, 620, { face: -1 }), { k: 'turret', x: 2200, y: 100 }, { k: 'shield', x: 2500, y: 620, face: -1 }, guard(2600, 620, { face: -1 }), { k: 'sniper', x: 2990, y: 620, face: -1 }, { k: 'boss', x: 3600, y: 620, face: -1, patrol: 260 }],
    switches: [{ id: 'g1', x: 1230, y: 150 }],
    terms: [{ x: 3640, y: 470, boss: true }],
    lock: 'boss',
    pickups: [{ k: 'intel', id: 'i4', x: 2350, y: 380 }, { k: 'heart', x: 2000, y: 620 }, { k: 'heart', x: 3300, y: 620 }],
    exit: { x: 4080, y: 500, w: 90, h: 120 },
    intro: [['narr', 'Merkez Kule. Camdan bakınca bütün şehir aşağıda kalıyor.'], ['agent', 'Burada bir yerde Elif ve "Yönetici" var.'], ['boss', '(hoparlör) Ajan Sessiz. Seni bekliyorduk. Elif\'i istiyorsan sunucu katına gel.']],
    outro: [['boss', 'Beni yenmek ağı yenmek değil. Kızıl Ağ... her yerde.'], ['elif', 'Sessiz! Beni buldun... ama bu kadar değil. Asıl merkez yukarıda, Veri Çekirdeği katında. Beni oraya götürecekler!'], ['agent', 'Bu sefer bırakmayacağım.']],
    dossier: [['i4', 'Kızıl Ağ dosyası #4', 'Yönetici yalnızca bir yönetici. Üstünde "Göz" adlı biri daha var: sembolün gerçek sahibi. Hesap daha bitmedi.']],
  },
];

// ---- uzatma yardımcısı: fromX sonrasındaki her şeyi D kadar sağa kaydırır, aradaki boşluğa yeni içerik eklenir ----
function ext(def, fromX, D, add) {
  const sh = (o) => { if (o.x >= fromX) o.x += D; return o; };
  def.solids = def.solids.map((o) => { if (o.x < fromX && o.x + o.w > fromX + 40 && o.w > 1500) return { ...o, w: o.w + D }; return sh({ ...o }); });
  for (const k of ['enemies', 'switches', 'terms', 'barrels', 'pickups', 'hints', 'lamps', 'posters', 'checks']) if (def[k]) def[k] = def[k].map((o) => sh({ ...o }));
  def.exit = sh({ ...def.exit }); def.w += D;
  for (const k of Object.keys(add)) def[k] = [...(def[k] || []), ...add[k]];
  return def;
}
const SN = (x, y, f = -1) => ({ k: 'sniper', x, y, face: f });
const SH = (x, y, f = -1) => ({ k: 'shield', x, y, face: f });
const DR = (x, y) => ({ k: 'drone', x, y });
const TU = (x, y) => ({ k: 'turret', x, y });
const heart = (x, y) => ({ k: 'heart', x, y });

ext(LEVELS[0], 2900, 1600, {
  solids: [G(2950, 700, 560), G(3800, 700, 600), crate(3100, 500), wall(3380, 420, 44, 140, '#394066'), metal(3300, 250, 380, 24), crate(4000, 540, 60, 60), crate(4060, 540, 60, 60)],
  enemies: [guard(3500, 560, { face: -1 }), guard(3590, 560, { face: -1 }), SN(3600, 250), guard(3950, 600, { face: -1, patrol: 90 }), guard(4250, 600, { face: -1 }), DR(4250, 330)],
  barrels: [{ x: 3540, y: 560 }], hints: [hint(3300, 200, 'İkinci sekme bulmacası: varil de patlar')],
  pickups: [heart(3900, 600), { k: 'intel', id: 'i1b', x: 3130, y: 500 }],
  checks: [{ x: 1900, y: 600 }, { x: 2960, y: 560 }, { x: 3810, y: 600 }],
});
ext(LEVELS[1], 3250, 1500, {
  solids: [crate(3300, 560), crate(3360, 500, 60, 120), wall(3800, 60, 50, 440, '#2f3656'), door('d3', 4150, 60, 40, 560), metal(4400, 500, 50, 120), metal(4560, 500, 50, 120)],
  enemies: [guard(3500, 620, { face: -1 }), guard(3650, 620, { face: -1 }), guard(3600, 620, { face: -1, patrol: 60 }), SH(4300, 620), TU(4350, 100), TU(4650, 100), SN(4700, 620), DR(3900, 300), DR(4500, 260)],
  switches: [{ id: 'd3', x: 3960, y: 110 }], lamps: [{ x: 3500, y: 120 }, { x: 4400, y: 120 }],
  pickups: [heart(3750, 620), { k: 'intel', id: 'i2b', x: 3390, y: 500 }], hints: [hint(3700, 300, 'Bu odada anahtar duvarın arkasında')],
  checks: [{ x: 1200, y: 620 }, { x: 2600, y: 620 }, { x: 3300, y: 620 }, { x: 4200, y: 620 }],
});
ext(LEVELS[2], 3550, 1500, {
  solids: [metal(3600, 500, 150, 120), metal(3800, 500, 150, 120), metal(3800, 380, 150, 20), metal(4500, 490, 40, 130), metal(4650, 380, 120, 20), metal(4180, 500, 120, 20)],
  enemies: [guard(3680, 620, { face: -1 }), SN(3880, 380), guard(4020, 620, { face: -1 }), guard(4100, 620, { face: -1 }), SH(4350, 620), SH(4400, 620), TU(4700, 364), DR(4000, 280), DR(4300, 250)],
  barrels: [{ x: 4060, y: 620 }, { x: 4560, y: 620 }], pickups: [heart(3700, 500), { k: 'intel', id: 'i3b', x: 4710, y: 380 }],
  hints: [hint(4200, 440, 'Kalkanlılar yan yana: patlama ikisini de alır')],
  checks: [{ x: 1000, y: 620 }, { x: 2430, y: 620 }, { x: 3560, y: 620 }, { x: 4400, y: 620 }],
});
ext(LEVELS[3], 3000, 1400, {
  solids: [glass(3200, 60, 24, 560), glass(3560, 60, 24, 560), wall(3700, 60, 40, 330, '#202a48'), door('g2', 3700, 390, 40, 230), metal(3350, 500, 50, 120), metal(3950, 500, 50, 120), metal(4250, 500, 50, 120)],
  enemies: [guard(3300, 620, { face: -1 }), guard(3400, 620, { face: -1 }), DR(3400, 260), guard(3640, 620, { face: -1 }), TU(3850, 100), SH(4000, 620), SN(4350, 620), TU(4200, 100), DR(4100, 260)],
  switches: [{ id: 'g2', x: 3600, y: 150 }], lamps: [{ x: 3400, y: 120 }, { x: 4200, y: 120 }], pickups: [heart(3750, 620), { k: 'intel', id: 'i4b', x: 3965, y: 500 }],
  checks: [{ x: 1300, y: 620 }, { x: 2700, y: 620 }, { x: 3050, y: 620 }, { x: 4300, y: 620 }],
});

LEVELS.push({
  id: 5, name: 'Veri Çekirdeği', place: 'Merkez Kule · Üst kat laboratuvarı', theme: 'lab', w: 6200, needRico: 4, bossHp: 12,
  start: { x: 90, y: 620 },
  solids: [
    G(-40, 6300), wall(-40, -400, 40, 1400), wall(6200, -400, 40, 1400), wall(-40, -100, 6300, 160, '#0f2222'),
    glass(600, 60, 24, 560), metal(300, 500, 40, 120), crate(900, 560), crate(960, 500, 60, 120), glass(1100, 60, 24, 560),
    wall(1250, 60, 50, 440, '#183030'), door('a1', 1500, 60, 40, 560),
    metal(1750, 500, 50, 120), metal(2250, 500, 50, 120), metal(2700, 380, 120, 20), wall(2750, 60, 50, 440, '#183030'), door('a2', 3000, 60, 40, 560),
    crate(3200, 560), crate(3260, 500, 60, 120), glass(3600, 60, 24, 560), metal(3900, 500, 50, 120), glass(4300, 60, 24, 560), wall(4500, 60, 40, 330, '#183030'), door('a3', 4500, 390, 40, 230),
    metal(4800, 500, 50, 120), metal(5150, 500, 50, 120), metal(5500, 500, 50, 120),
    wall(5800, 60, 40, 340, '#183030'), glass(5800, 400, 40, 220),
  ],
  lamps: [{ x: 500, y: 120 }, { x: 1900, y: 120 }, { x: 3400, y: 120 }, { x: 5000, y: 120 }],
  posters: [{ x: 200, y: 280 }, { x: 3100, y: 280 }, { x: 5300, y: 280 }],
  hints: [hint(1180, 300, 'Duvarın arkası: tavandan sektir'), hint(5700, 300, 'Camı kır → terminali vur')],
  enemies: [guard(800, 620, { face: -1 }), guard(1000, 620, { face: -1 }), DR(700, 280), guard(1300, 620, { face: -1 }), DR(1350, 260),
    TU(1900, 100), SH(2000, 620), SH(2100, 620), guard(2350, 620, { face: -1 }), TU(2450, 100), SN(2760, 380), guard(2900, 620, { face: -1, patrol: 60 }),
    guard(3400, 620, { face: -1 }), guard(3500, 620, { face: -1 }), DR(3700, 270), SH(3800, 620), SN(4100, 620), guard(4250, 620, { face: -1 }),
    SH(4700, 620), TU(4800, 100), guard(4950, 620, { face: -1 }), guard(5050, 620, { face: -1 }), SN(5350, 620), TU(5400, 100), DR(5600, 260), guard(5700, 620, { face: -1 })],
  barrels: [{ x: 2150, y: 620 }, { x: 4980, y: 620 }],
  switches: [{ id: 'a1', x: 1380, y: 130 }, { id: 'a2', x: 2900, y: 110 }, { id: 'a3', x: 4400, y: 150 }],
  terms: [{ x: 6000, y: 620 }], lock: 'term',
  pickups: [heart(1650, 620), heart(3100, 620), heart(4600, 620), { k: 'intel', id: 'i5', x: 3290, y: 500 }, { k: 'intel', id: 'i5b', x: 3925, y: 500 }],
  checks: [{ x: 1000, y: 620 }, { x: 1600, y: 620 }, { x: 3100, y: 620 }, { x: 4600, y: 620 }, { x: 5500, y: 620 }],
  exit: { x: 6080, y: 500, w: 90, h: 120 },
  intro: [['narr', 'Kulenin en üst katı. Duvarlar kablo, tavan sunucu dolu. Her kapı bir anahtara bağlı.'], ['agent', 'Elif burada, bu katta. Kapıları sırayla açacağım.'], ['goz', '(hoparlör) Sessiz... Yönetici bana geldiğinde haberin olmuştu. Bu kata kadar gelmen etkileyici.']],
  outro: [['elif', '(telsiz) Sessiz! Beni çatıya çıkardılar. Helikopter hazır, "Göz" benimle kaçıyor!'], ['goz', 'Çekirdek bende. Ağ sensin, bir gözle beni durduramazsın.'], ['agent', 'Çatıya çıkıyorum. Bu gece biter.']],
  dossier: [['i5', 'Kızıl Ağ dosyası #5', 'Veri Çekirdeği: şehrin her kamerasının ve telefonunun kopyası burada tutuluyor. Örgüt bununla insanların sırlarını koz olarak kullanıyor.'], ['i5b', 'Kızıl Ağ dosyası #6', '"Göz" aslında sıradan görünen biri: şehrin güvenlik şirketinin kurucusu. Kimse onun örgütün başı olduğunu bilmiyor.']],
});
LEVELS.push({
  id: 6, name: 'Göz', place: 'Merkez Kule · Çatı', theme: 'roof', w: 4700, needRico: 4, bossHp: 18,
  start: { x: 90, y: 600 },
  solids: [
    G(-40, 1500, 600), G(1650, 1400, 600), G(3200, 1500, 600),
    wall(-40, -400, 40, 1400), wall(4700, -400, 40, 1400),
    crate(500, 540), crate(560, 480, 60, 120), metal(900, 480, 40, 120),
    metal(1800, 380, 120, 20), metal(2350, 380, 120, 20), metal(2150, 500, 40, 100), metal(2650, 480, 40, 120),
    metal(3300, 470, 160, 20), metal(4320, 470, 160, 20), metal(3750, 500, 70, 100), metal(3850, 500, 70, 100),
  ],
  posters: [{ x: 250, y: 440 }, { x: 3600, y: 440 }],
  hints: [hint(3750, 260, 'Göz\'ün kalkanı: iki terminalden birini vur'), hint(200, 440, 'Son çatı. Elif yukarıda.')],
  enemies: [guard(700, 600, { face: -1 }), guard(800, 600, { face: -1 }), guard(1100, 600, { face: -1, patrol: 80 }), DR(1000, 280), DR(1300, 260),
    SN(1860, 380), SH(2000, 600), guard(2250, 600, { face: -1 }), SN(2410, 380), TU(2170, 484), SH(2500, 600), SH(2580, 600), guard(2800, 600, { face: -1 }), DR(2800, 260),
    { k: 'boss', x: 3900, y: 600, face: -1, patrol: 320 }],
  barrels: [{ x: 780, y: 600 }, { x: 2540, y: 600 }, { x: 2900, y: 600 }],
  terms: [{ x: 3380, y: 470, boss: true }, { x: 4400, y: 470, boss: true }], lock: 'boss',
  pickups: [heart(1200, 600), heart(2700, 600), heart(3350, 600), { k: 'intel', id: 'i6', x: 2410, y: 380 }],
  checks: [{ x: 1000, y: 600 }, { x: 1700, y: 600 }, { x: 2900, y: 600 }, { x: 3250, y: 600 }],
  exit: { x: 4580, y: 480, w: 90, h: 120 },
  intro: [['narr', 'Çatıda fırtına. Helikopter pistinin ortasında bir adam: Göz.'], ['agent', 'Elif nerede?'], ['goz', 'Güvende. Şimdilik. Kızıl Ağ\'ı çökertmek için bir göze ihtiyacın var, Sessiz. Ben bu ağın gözüyüm.']],
  outro: [['goz', 'Ağı... kapatma... o zaman ikimiz de...'], ['agent', 'Biter.'], ['elif', 'Sessiz! Buradayım. Sistem çöküyor, bütün kameralar kapanıyor.'], ['narr', 'Kızıl Ağ\'ın sembolü şehrin ekranlarından birer birer silindi.'], ['elif', 'Teşekkürler. Ama dosyalarda bir isim daha geçiyor... Bu hikâye bitmedi.'], ['narr', 'SON — Kızıl Ağ']],
  dossier: [['i6', 'Kızıl Ağ dosyası #7', 'Göz yenildi ama ağın yedek sunucuları şehir dışında. Elif\'in bulduğu son isim: "Mimar".']],
});
LEVELS[0].dossier.push(['i1b', 'Kızıl Ağ dosyası #1b', 'Bu çatıdaki kameralar örgütün gözleri: şehre bakan her pencere bir kayıt cihazı.']);
LEVELS[1].dossier.push(['i2b', 'Kızıl Ağ dosyası #2b', 'Depo 7, kaçırılanların transfer noktası. Konteyner numaraları limana gidiyor.']);
LEVELS[2].dossier.push(['i3b', 'Kızıl Ağ dosyası #3b', 'Liman gümrüğünden geçen her konteynerde örgütün bir parçası var: yazılım, silah, insanlar.']);
LEVELS[3].dossier.push(['i4b', 'Kızıl Ağ dosyası #4b', 'Yönetici: ağın gündelik işlerini yürüten kişi. Gerçek lider, onun da kimliğini bilmiyor.']);
