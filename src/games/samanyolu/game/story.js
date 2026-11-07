// Samanyolu: Kayıp Işık — hikaye metinleri ve gezegen ayarları
export const HOME = {
  intro: [
    ['', 'Gece. Rampada Pırıl hazır bekliyor.'],
    ['', "Samanyolu'nun ışıkları günden güne sönüyor. Dört yıldız parçasını bulup feneri yeniden yakabilecek tek kişi sensin."],
    ['', 'Ama önce, vedalaşmak gerek.'],
  ],
  anne: [
    ['Anne', '{ad}… yıldızlara bakmayı hep severdin. Şimdi onlara gidiyorsun.'],
    ['Anne', 'Her gece pencereyi açık bırakacağım. Dönüş yolunu şaşırma diye.'],
    ['Anne', 'Söz ver bana, ışığı yakıp döneceksin.'],
  ],
  anneChoice: { q: 'Annene ne dersin?', opts: [
    { t: 'Söz veriyorum.', reply: [['Anne', 'Biliyorum. Sen hep sözünü tutarsın.']] },
    { t: 'Elimden geleni yapacağım.', reply: [['Anne', 'Bu da yeter. Sadece geri dön.']] },
  ] },
  anneEnd: [['', 'Annen sana sıkıca sarıldı. Kokusu hâlâ üzerinde.']],
  baba: [
    ['Baba', 'Roketi dün gece bir daha kontrol ettim. Cıvata cıvata.'],
    ['Baba', 'Korktuğunda şunu hatırla: ne kadar uzağa gidersen git, pusulanın bir ucu hep eve bakar.'],
    ['', 'Baban cebinden eski pusulasını çıkarıp avucuna bıraktı.'],
    ['Baba', 'Haydi. Seninle gurur duyuyorum.'],
  ],
  deniz: [
    ['Deniz', 'Gerçekten yıldızlara mı gidiyorsun? Bana bir tane getirir misin?'],
    ['Deniz', 'Al, bunu kendim yaptım. Kokpitine as, seni korusun.'],
    ['', 'Deniz sana kâğıttan, biraz buruşuk bir yıldız verdi.'],
    ['Deniz', 'Ağlamıyorum. Gözüme toz kaçtı.'],
  ],
  rocket: [
    ['', 'Rampaya doğru yürüdün. Arkana bakmamaya çalıştın.'],
    ['', 'Sonra baktın. Üçü de el sallıyordu.'],
    ['', "Pırıl'ın kapağı kapandı. Samanyolu seni bekliyor."],
  ],
  after: [
    ['', 'Dünya… avucuna sığacak kadar küçük, mavi bir bilye.'],
    ['', 'Cebindeki pusula titredi ve eve doğru döndü.'],
  ],
};

export const LEGS = [
  { dur: 40, rate: 0.9, speed: 22, radios: [
    [0.03, 'Merkez', "Merkez'den Pırıl'a. Sinyal temiz. Önünde asteroit kuşağı var: sürükleyerek yönlendir, ATEŞ ile kayaları kır."],
    [0.5, 'Merkez', 'İyi gidiyorsun. Kriyo gezegeni ufukta belirdi.'],
  ] },
  { dur: 44, rate: 1.2, speed: 25, radios: [
    [0.05, 'Merkez', "Kriyo'dan sinyal aldık: Lumi'ler barışçıl. Şimdi sıra Mesa çölünde."],
    [0.55, 'Deniz', 'Telsizi annem açtı! Ben bir resim çizdim, sana yıldız çizdim. Kâğıt yıldızı kaybetme!'],
  ] },
  { dur: 48, rate: 1.5, speed: 28, radios: [
    [0.05, 'Merkez', "Flora'nın atmosferi nefes alıyor gibi. Çok yaklaşma, ormanlar canlı."],
    [0.55, 'Baba', 'Pusula hâlâ doğru gösteriyor mu? Kontrol et, evlat.'],
  ] },
  { dur: 52, rate: 1.8, speed: 31, radios: [
    [0.05, 'Merkez', "Nyx istasyonundan garip bir sinyal geliyor. Seninle konuşmak istiyor."],
    [0.6, 'Merkez', 'Kayalar yoğunlaştı. Kalkanı zorlama, onar ve devam et.'],
  ] },
  { dur: 60, rate: 1.6, speed: 30, boss: 0.5, radios: [
    [0.03, 'Merkez', 'Dört parça yanında. Fener, Nyx’in verdiği koordinatta bekliyor.'],
    [0.5, 'Merkez', 'DEV KAYA! Hepsi üstüne geliyor, ateş et ateş!'],
    [0.85, 'Anne', 'Pencereyi açık bıraktım {ad}. Hâlâ buradayız.'],
  ] },
];

export const PLANETS = [
  {
    id: 'kriyo', name: 'KRİYO', sub: 'Buz Gezegeni', ground: [0xdcefff, 0xb4d4f0], hill: 0xe6f3ff, sky: 0x0a1a3a, fog: [0x0f2a55, 30, 130], stars: true,
    sun: 0xbfe0ff, hemi: [0x9cc8ff, 0x3a5a88], prop: 'ice', crystal: 0x6fe3ff, shard: 0x7fe9ff, planet: [0xbfe3ff, 0x8fb7ee], atmo: 0x8fd0ff, ring: false,
    alien: { type: 'lumi', color: 0x7fe9ff, n: 'Luma' },
    minors: [
      { type: 'lumi', color: 0xff9be0, s: 0.55, at: [-12, 6], who: 'Küçük Lumi', line: 'Pırıl pırıl bir yıldızsın! Şarkımızı geri getirecek misin?' },
      { type: 'lumi', color: 0xa0ffcb, s: 0.7, at: [14, -10], who: 'Lumi', line: 'Buzun altındaki mağaralarda eski şarkılar uyuyor.' },
    ],
    tablets: [
      { at: [-24, -18], text: "Samanyolu'nu kuranlar ışığı dörde böldü: buz, kum, yaprak ve gölge." },
      { at: [22, 20], text: 'Işık gökyüzünde değil, onu taşıyanlarda yaşar.' },
    ],
    arrive: [['', 'Kriyo. Gökyüzü mor, yer cam gibi parlıyor. Havada tuhaf bir şarkı asılı duruyor.']],
    meet: [
      ['Luma', 'Sıcak bir ışık… Uzun zamandır görmemiştik.'],
      ['Luma', 'Biz Lumi’yiz. Şarkımızla yıldızlara haber veririz.'],
      ['Luma', 'Samanyolu söndüğünden beri şarkımız sustu. Sesimizi yitirdik.'],
    ],
    choice: { q: 'Luma’ya ne dersin?', opts: [
      { t: 'Şarkını geri getirebilirim.', reply: [['Luma', 'Cesur ışık… O zaman buz mağaralarından üç ses kristali getir.']] },
      { t: 'Yıldız parçasını arıyorum.', reply: [['Luma', 'Parça şarkımızın kalbinde saklı. Önce şarkıyı bulalım: üç ses kristali getir.']] },
    ] },
    task: 'Ses kristali',
    ret: [
      ['Luma', 'Kristaller şarkıyı hatırlıyor… Dinle.'],
      ['', 'Lumi’ler yükselen bir ışıkla birlikte, sessizce şarkı söylemeye başladı. Buz, notalarla titredi.'],
      ['Luma', 'Al. Bu, şarkımızın son notası. Yolun açık olsun, ışık taşıyıcı.'],
    ],
    leave: [['', 'Kriyo’nun buzları arkanda parladı. Elinde ilk yıldız parçası var. Üç tane daha.']],
  },
  {
    id: 'mesa', name: 'MESA', sub: 'Çöl Gezegeni', ground: [0xe0aa62, 0xc98a45], hill: 0xb5683a, sky: 0xf0a85a, fog: [0xf0b36a, 40, 160], stars: false,
    sun: 0xfff0c8, hemi: [0xffe2b0, 0x8a5a30], prop: 'mesa', crystal: 0xff7a2a, shard: 0xffc14a, planet: [0xe8a85c, 0xb5683a], atmo: 0xffc07a, ring: true,
    alien: { type: 'korr', color: 0x8c6a4a, n: 'Gorum' },
    minors: [
      { type: 'korr', color: 0x9a7a5a, s: 0.45, at: [-8, 8], who: 'Pıtır', line: 'Sıcak taş… güzel. Küçük yıldız? Küçük yıldız!' },
      { type: 'korr', color: 0x7a5a3a, s: 0.8, at: [16, -8], who: 'Korr', line: 'Taş az konuşur. Çok dinler.' },
    ],
    tablets: [
      { at: [-26, 14], text: 'Işık yedi kez söner ve yedi kez yanar. Biri her seferinde geri döner.' },
      { at: [24, -20], text: 'Kum her şeyi unutur. Taş hatırlar.' },
    ],
    arrive: [['', 'Mesa. Kızıl kayalar, sonsuz kum. Uzaktan ağır adımların sesi geliyor.']],
    meet: [
      ['Gorum', '…Küçük. Sıcak. Neden geldin.'],
      ['Gorum', 'Biz Korr. Taşız. Ocağımız söndü. Taş üşür.'],
    ],
    choice: { q: 'Küçük Pıtır kâğıt yıldıza bakıyor. Ne yaparsın?', opts: [
      { t: 'Kâğıt yıldızı Pıtır’a göster.', reply: [
        ['Pıtır', 'Yıldız! Küçük yıldız! …Tut. Geri ver. Hep sakla.'],
        ['Gorum', 'Çocuk güler. Taş güler. Seni sevdik, küçük.'],
        ['Gorum', 'Üç ateş taşı getir. Ocağı birlikte yakarız.'],
      ] },
      { t: 'Gorum’la konuşmaya devam et.', reply: [
        ['Gorum', 'Sen sabırlısın. Taş sabrı sever.'],
        ['Gorum', 'Üç ateş taşı getir. Ocağımız yansın.'],
      ] },
    ] },
    task: 'Ateş taşı',
    ret: [
      ['Gorum', 'Taşlar sıcak… Ocak yanıyor.'],
      ['', 'Büyük bir ateş yükseldi. Korr’lar ağır ağır dans etti, yer titredi.'],
      ['Gorum', 'Al. Işığın bir parçası. Taş verir. Taş unutmaz.'],
    ],
    leave: [['', 'Mesa’nın kızıl kumları gözden kayboldu. İki parça tamam. İki tane kaldı.']],
  },
  {
    id: 'flora', name: 'FLORA', sub: 'Orman Gezegeni', ground: [0x3f9a52, 0x2c7a44], hill: 0x2a6e44, sky: 0x2b7a8a, fog: [0x2f8a8a, 30, 140], stars: false,
    sun: 0xe0fff0, hemi: [0xb8ffd8, 0x2a5a3a], prop: 'forest', crystal: 0xb6ff5a, shard: 0xcfff7a, planet: [0x4fb86a, 0x2a6e44], atmo: 0x9affc0, ring: false,
    alien: { type: 'veli', color: 0xff8ad8, n: 'Fillis' },
    minors: [
      { type: 'veli', color: 0xffd36a, s: 0.5, at: [-10, 8], who: 'Filiz', line: 'Fısıltı… fısıltı… sen yeni bir tohumsun!' },
      { type: 'veli', color: 0x9ae0ff, s: 0.65, at: [12, -12], who: 'Veli', line: 'Ormanlar konuşur ama sadece duyanlara.' },
    ],
    tablets: [
      { at: [-22, -22], text: 'Işığı taşıyan yalnız değildir. Yol, birbirini bekleyenlerin sesidir.' },
      { at: [26, 16], text: 'Bir tohum, bin gece beklemeyi bilir.' },
    ],
    arrive: [['', 'Flora. Havada parıldayan tozlar, ağaçlar sanki seni izliyor. Uzaktan bir fısıltı geliyor.']],
    meet: [
      ['Fillis', 'Fısıltı… yeni biri… yeni bir adım sesi.'],
      ['Fillis', 'Biz Veli’yiz. Kökümüzle birbirimize bağlıyız. Işık sönünce kökler susmaya başladı.'],
    ],
    choice: { q: 'Fillis soruyor: Neden bu kadar uzağa geldin?', opts: [
      { t: 'Ailem bana güveniyor.', reply: [['Fillis', 'Güven en güçlü köktür. O zaman bize üç tohum getir; ormanı beraber uyandıralım.']] },
      { t: 'Çünkü kimse gitmedi.', reply: [['Fillis', 'Merak da bir tohumdur, taşıyıcı. Üç tohum getir; ormanı uyandıralım.']] },
    ] },
    task: 'Tohum',
    ret: [
      ['Fillis', 'Tohumlar toprağa değdi… duyuyor musun?'],
      ['', 'Yerden ışıldayan filizler fışkırdı. Ağaçlar boy atıp parladı, tüm orman nefes aldı.'],
      ['Fillis', 'Dev çiçeğin kalbinden al. Yaşam senin yolunu aydınlatsın.'],
    ],
    leave: [['', 'Flora’nın fısıltıları arkandan yükseldi. Üç parça tamam. Son durak: Nyx.']],
  },
  {
    id: 'nyx', name: 'NYX', sub: 'Gölge İstasyonu', ground: [0x2a2f45, 0x1d2236], hill: 0x151a2c, sky: 0x04050c, fog: [0x04050c, 40, 190], stars: true,
    sun: 0xb09aff, hemi: [0x8a7aff, 0x1a1030], prop: 'station', crystal: 0xb48bff, shard: 0xd2b5ff, planet: [0x6a5aa8, 0x2a2050], atmo: 0xa78bff, ring: true,
    alien: { type: 'nyx', color: 0xb48bff, n: 'Nyx' },
    minors: [
      { type: 'nyx', color: 0x7affd8, s: 0.45, at: [-10, 8], who: 'Yankı', line: 'Biz gölgeyiz. Işık olmadan var olamayız ve ışıkla da yaşayamayız.' },
      { type: 'nyx', color: 0xffd36a, s: 0.55, at: [12, -10], who: 'Işıltı', line: 'Seni haritada gördük. Küçük, kararlı bir nokta.' },
    ],
    tablets: [
      { at: [-24, -16], text: 'Fener, yolu göstermek için yapıldı. Yolculuk bitince herkes evini bulur.' },
      { at: [24, 22], text: 'Karanlık, ışığın yokluğu değil; sabırla bekleyen halidir.' },
    ],
    arrive: [['', 'Nyx. Yıldızlar arasında asılı kalmış eski bir istasyon. Işıklar yarı sönük, her yerde yankı var.']],
    meet: [
      ['Nyx', 'Işık taşıyıcı. Seni uzun zamandır bekliyordum.'],
      ['Nyx', 'Samanyolu bir yol değil, bir fener. Onu yapanlar bir gün geri gelmeyi vaat etti. Gelmediler.'],
      ['Nyx', 'Işık, ona bakacak kimse kalmayınca sönmeye başladı.'],
    ],
    choice: { q: 'Nyx sorar: Feneri yaktıktan sonra ne olacak?', opts: [
      { t: 'Eve döneceğim.', reply: [['Nyx', 'Fener yalnız yolu değil, eve dönüşü de aydınlatır. Önce üç veri çekirdeği getir.']] },
      { t: 'Başkalarına da yol göstereceğim.', reply: [['Nyx', 'İşte gerçek taşıyıcı. Üç veri çekirdeği getir; koordinatları vereyim.']] },
    ] },
    task: 'Veri çekirdeği',
    ret: [
      ['Nyx', 'Çekirdekler uyanıyor… Fener koordinatı yükleniyor.'],
      ['', 'Hologramın etrafında halkalar hızla döndü. Bütün istasyonun ışıkları bir an yandı.'],
      ['Nyx', 'Son parça sende. Şimdi Fener’e git. Seni orada izleyeceğim.'],
    ],
    leave: [['', 'Dört parça tamam. Pusula yeniden titredi. Fener’e gitme zamanı.']],
  },
];

export const FINALE = {
  arrive: [
    ['', 'Samanyolu Feneri. Dört halkadan oluşan dev bir yapı, sessiz ve karanlık.'],
    ['', 'Pırıl’ın kargo bölmesinde dört yıldız parçası ışıldıyor.'],
  ],
  place: [
    ['', 'Buz Kriyo’nun şarkısı, taş Mesa’nın ateşi, yaprak Flora’nın nefesi, gölge Nyx’in sözü… Hepsi yerine oturdu.'],
  ],
  radio: [
    ['Deniz', '{ad}! Gökyüzü yandı! Gördüm, ilk ben gördüm!'],
    ['Anne', 'Işığı gördük. Pencere hâlâ açık. Eve gel.'],
    ['Baba', 'Pusula doğru gösteriyordu, değil mi?'],
  ],
  end: [
    ['', 'Samanyolu yeniden parladı. Ve çok uzakta, bir pencere, seni beklemek için açık kaldı.'],
  ],
};
