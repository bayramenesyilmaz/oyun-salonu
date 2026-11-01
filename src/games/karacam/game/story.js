// Karaçam Dosyaları — Vaka 1: Saat Üçte Duran Saatler. Kişiler, yerler ve olaylar kurgudur.

export const SPEAKERS = {
  yusuf: { name: 'Yusuf Hoca', color: '#e8d6a8' },
  riza: { name: 'Komiser Rıza', color: '#9fc3e8' },
  nazmiye: { name: 'Nazmiye Demirci', color: '#e6a99a' },
  hatice: { name: 'Hatice Demirci', color: '#c7b4e8' },
  selim: { name: 'Selim Demirci', color: '#e8c27a' },
};

// Konuşma satırı: { s: konuşmacı, t: metin, p?: kesit resmi (varsayılan konuşmacı) }
export const INTRO = [
  { s: 'riza', t: 'Hocam, saat üçü çeyrek geçiyor. Komşu çığlık duymuş, ben de kalkıp geldim.' },
  { s: 'riza', t: 'Peki sizi bu saatte buraya kim çağırdı?' },
  { s: 'yusuf', t: 'Nazmiye Hanım çağırdı. Evdeki saatlerin her gece durduğunu söyledi.' },
  { s: 'nazmiye', t: 'Her gece, tam üçte duruyorlar. Kemal öldüğünden beri bu evde bir şey var hocam.' },
  { s: 'riza', t: 'Bir şey varsa izi de vardır. Hocam, siz salona bir bakın, ben ifadeleri alayım.' },
];

export const SCENE = {
  title: 'Demirci evi, salon',
  time: '03.15',
  // her oyunda listede mutlaka olacak delil nesneleri
  evidence: ['cep_saati', 'sigara', 'kartpostal', 'muska'],
  fillers: 4,
  found: {
    cep_saati: { s: 'yusuf', t: 'Bir cep saati. Akrebi tam üçte durmuş. Kurulu, ama işlemiyor.' },
    sigara: { s: 'yusuf', t: 'Yarısı boş bir sigara paketi. Nazmiye Hanım bu evde kimsenin sigara içmediğini söyledi.' },
    kartpostal: { s: 'yusuf', t: 'Almanya’dan kartpostallar. Hepsi Köln’den, damgaları yeni.' },
    muska: { s: 'yusuf', t: 'Ayaklı saatin kenarına iğnelenmiş bir muska. Bezi yeni dikilmiş.' },
  },
  spots: {
    kapak: { label: 'Kömürlük kapağı', s: 'yusuf', t: 'Kömürlük kapağı. Menteşeleri yağlanmış, toz yok. Bu kapak sık sık açılıyor.' },
    izler: { label: 'Çamurlu izler', s: 'yusuf', t: 'Çamurlu ayak izleri. Kapaktan saate kadar gidiyor. Büyük bir erkek ayakkabısı.' },
    saat: { label: 'Ayaklı saat', s: 'yusuf', t: 'Saatin gövde kapağında tırnak izleri var. Biri bunu zorla açmaya çalışmış.' },
    ayna: { label: 'Örtülü ayna', s: 'yusuf', t: 'Aynanın üstüne çarşaf örtülmüş. Kenarları özenle iğnelenmiş, aceleyle yapılmamış.' },
  },
  done: [
    { s: 'riza', t: 'Ne buldunuz hocam? Cin mi, insan mı?' },
    { s: 'yusuf', t: 'Cin çamurlu ayak izi bırakmaz komiserim.' },
    { s: 'yusuf', t: 'Ama kimseyi suçlamak için de henüz çok erken.' },
    { s: 'riza', t: 'O zaman sorguya geçelim. Üçü de mutfakta bekliyor.' },
  ],
};

// sorgu: her şüpheli için sorular; need: gerekli delil/gözlem anahtarı
export const SUSPECTS = {
  nazmiye: {
    role: 'Evin hanımı, rahmetli Hacı Kemal’in eşi',
    open: [{ s: 'nazmiye', t: 'Sorun hocam, ne isterseniz sorun. Yeter ki bu evden o şey gitsin.' }],
    q: [
      { id: 'ne_zaman', q: 'Saatler ne zamandan beri duruyor?', a: [{ s: 'nazmiye', t: 'Kemal’in kırkı çıktıktan sonra başladı. Her gece üçte. Önce ayaklı saat, sonra hepsi.' }] },
      { id: 'ayna', q: 'Aynayı kim örtüyor?', a: [{ s: 'nazmiye', t: 'Ben bilmem hocam. Sabah kalkıyorum, örtülü buluyorum. Allah bilir kim örtüyor.' }], note: 'Nazmiye aynayı kimin örttüğünü bilmediğini söylüyor.' },
      { id: 'kagit', q: 'Hacı Kemal bir şey saklar mıydı?', a: [{ s: 'nazmiye', t: 'Kemal kimseye güvenmezdi. Kâğıtlarını hep bir yere saklardı. Nereye, bilmem.' }], note: 'Hacı Kemal kâğıtlarını evde bir yere saklarmış.' },
      { id: 'muska', need: 'muska', q: 'Saatteki muskayı siz mi taktınız?', a: [
        { s: 'nazmiye', p: 'nazmiye_uzgun', t: 'Evet, ben taktım. Cin uzak dursun diye. Aynayı da ben örtüyorum hocam.' },
        { s: 'nazmiye', p: 'nazmiye_uzgun', t: 'Kemal öldü, ayna açık durmaz. Çocuklar korkmasın diye kimseye söyleyemedim.' },
      ], note: 'Aynayı Nazmiye örtüyor; eski bir yas âdeti. Saatlerle ilgisi yok.' },
    ],
  },
  hatice: {
    role: 'Gelin; kocası Almanya’da işçi',
    open: [{ s: 'hatice', t: 'Çocuklar yeni uyudu hocam. Ne soracaksanız yavaş sorun, n’olur.' }],
    q: [
      { id: 'duydun', q: 'Gece ne duydunuz?', a: [{ s: 'hatice', t: 'Ayak sesleri. Salondan, ağır ağır. Kapıyı açmaya korktum, çocukları yanıma aldım.' }], note: 'Hatice gece salonda ağır ayak sesleri duymuş.' },
      { id: 'koca', q: 'Kocanız nerede?', a: [{ s: 'hatice', t: 'Köln’de, fabrikada çalışıyor. Üç yıldır gelemedi. Bayramda gelecek inşallah.' }] },
      { id: 'sevgi', q: 'Sevgi aynada kimi görüyor?', a: [{ s: 'hatice', t: 'Bir amca diyor. Kâğıtlar nerede diye soruyormuş. Ben de korkuyorum hocam, çocuk uydurmaz.' }], note: 'Aynadaki “amca” kâğıtları soruyor.' },
      { id: 'kart', need: 'kartpostal', q: 'Kartpostalları neden saklıyorsunuz?', a: [
        { s: 'hatice', t: 'Kocam evi satmayalım diye yazıyor. Selim satmak istiyor, kocam istemiyor.' },
        { s: 'hatice', t: 'Kayınvalidem görürse kavga çıkar diye sakladım. Başka bir şey yok, yemin ederim.' },
      ], note: 'Selim evi satmak istiyor; Hatice’nin kocası istemiyor.' },
    ],
  },
  selim: {
    role: 'Hacı Kemal’in küçük oğlu',
    open: [{ s: 'selim', t: 'Gecenin üçünde beni buraya kim çağırdı? Ben size söylemiştim, bu ev uğursuz.' }],
    q: [
      { id: 'nerede', q: 'Gece neredeydiniz?', a: [{ s: 'selim', t: 'Kendi evimde, yatağımda. Bu eve akşamdan sonra adım atmam ben.' }], note: 'Selim geceleri bu eve hiç gelmediğini söylüyor.' },
      { id: 'satis', q: 'Evi neden satmak istiyorsunuz?', a: [{ s: 'selim', t: 'Babam öldü, saatler duruyor, çocuk aynada adam görüyor. Satalım, herkes kurtulsun.' }] },
      { id: 'vasiyet', q: 'Babanızın vasiyeti var mıydı?', a: [{ s: 'selim', p: 'selim_gergin', t: 'Vasiyet mi? Yok öyle bir şey. Olsa çoktan bulunurdu.' }], note: 'Selim vasiyet sorulunca geriliyor.' },
      { id: 'sigara', need: 'sigara', q: 'Salonda bu paketi bulduk. Sizin mi?', a: [
        { s: 'selim', p: 'selim_gergin', t: 'Herkes bu sigarayı içer. Bir paket sigara neyi kanıtlar?' },
        { s: 'riza', t: 'Cebinizdeki paketin aynısı, Selim Bey. Hem de bu evde kimse içmiyor.' },
      ], note: 'Salondaki paket Selim’in içtiği sigara.' },
      { id: 'izler', need: 'izler', q: 'Salonda çamurlu ayak izleri var.', a: [
        { s: 'riza', t: 'Ayakkabılarınızın altı da çamurlu, Selim Bey.' },
        { s: 'riza', t: 'Kömürlük kapağından saate kadar iz var.' },
        { s: 'selim', p: 'selim_gergin', t: 'Bahçede çalıştım! Bu ne demek şimdi, beni mi suçluyorsunuz?' },
      ], note: 'Çamurlu izler kömürlükten saate gidiyor; Selim’in ayakkabıları çamurlu.' },
    ],
  },
};

export const ACCUSE = {
  who: {
    q: 'Saatleri kim durduruyor?',
    options: [
      { id: 'cin', t: 'Evdeki cin' },
      { id: 'nazmiye', t: 'Nazmiye Demirci' },
      { id: 'hatice', t: 'Hatice Demirci' },
      { id: 'selim', t: 'Selim Demirci' },
    ],
    answer: 'selim',
  },
  why: {
    q: 'Neden?',
    options: [
      { id: 'korkut', t: 'Evdekileri korkutup evi sattırmak için' },
      { id: 'ara', t: 'Saatin içinde saklı bir şeyi arıyor' },
      { id: 'ruh', t: 'Rahmetlinin ruhu huzursuz' },
    ],
    answer: 'ara',
  },
  wrong: [
    { s: 'riza', t: 'Hocam, bu delillere uymuyor. Bir daha düşünelim.' },
  ],
  notEnough: [
    { s: 'riza', t: 'Elimizde yeterli delil yok hocam. Önce herkesi bir sorgulayalım.' },
  ],
};

export const ENDING = [
  { s: 'riza', t: 'Selim Bey, şu saatin kapağını bir açın bakalım.' },
  { s: 'yusuf', t: 'Gövdenin dibinde bir zarf var. Tapu ve vasiyet. Hacı Kemal evi Nazmiye Hanım’a bırakmış.' },
  { s: 'selim', p: 'selim_gergin', t: 'Ben sadece babamın kâğıtlarını arıyordum! Kimseye zarar vermedim.' },
  { s: 'riza', t: 'Gece yarısı kömürlükten başkasının evine girmek de zarardır, Selim Bey. Karakola gidiyoruz.' },
  { s: 'nazmiye', t: 'Allah razı olsun hocam. Demek cin değilmiş.' },
  { s: 'yusuf', t: 'Bu sefer değilmiş, Nazmiye Hanım. İyi geceler.' },
];

export const EPILOGUE = [
  { s: 'hatice', t: 'Hocam! Uyanın hocam! Saatler... saatler yine durdu.' },
  { s: 'yusuf', t: 'Selim karakolda. Kapak kilitli. Peki bu sefer kim?' },
  { s: 'yusuf', t: 'Dedemin defterinde bir sayfa var. Bin dokuz yüz elli bir yılı.' },
  { s: 'yusuf', t: 'Aynı ev, aynı saat. Demek her şey burada başlamış.' },
];

export const ALL_LINES = () => {
  const out = [];
  const add = (l) => l && l.s && l.t && out.push([l.s, l.t]);
  [...INTRO, ...SCENE.done, ...ACCUSE.wrong, ...ACCUSE.notEnough, ...ENDING, ...EPILOGUE].forEach(add);
  Object.values(SCENE.found).forEach(add);
  Object.values(SCENE.spots).forEach(add);
  for (const s of Object.values(SUSPECTS)) {
    s.open.forEach(add);
    s.q.forEach((q) => q.a.forEach(add));
  }
  return out;
};
