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
    hints: [hint(200, 440, 'A / D: yürü · SPACE: zıpla'), hint(560, 440, 'Fare: nişan al · tık: ateş'), hint(1000, 400, 'Sağ tık / SHIFT: ODAK (yavaş çekim)'), hint(2210, 200, 'Duvara çarpan mermi seker!'), hint(3130, 470, 'Terminali vur → çıkış açılır')],
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
      wall(3640, 400, 40, 140, '#4a3a5a'), glass(3640, 540, 40, 80), wall(3640, 340, 460, 60, '#4a3a5a'),
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
    outro: [['boss', 'Beni yenmek ağı yenmek değil. Kızıl Ağ... her yerde.'], ['elif', 'Sessiz! Beni buldun... ama yukarı kat... asıl merkez hâlâ yukarıda!'], ['narr', 'Devam edecek — Kızıl Ağ: Bölüm 2 yakında.']],
    dossier: [['i4', 'Kızıl Ağ dosyası #4', 'Yönetici yalnızca bir yönetici. Üstünde "Göz" adlı biri daha var: sembolün gerçek sahibi. Hesap daha bitmedi.']],
  },
];
