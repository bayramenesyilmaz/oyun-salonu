// KEÇİ KAÇTI! — tüm metinler. Konuşmacılar ve görevler.

export const SPEAKERS = {
  anlatici: { name: 'Anlatıcı', pitch: 1.0, rate: 1.05, color: '#ffe38a' },
  cafer: { name: 'Çoban Cafer', pitch: 0.75, rate: 1.1, color: '#9fd3ff' },
  riza: { name: 'Manav Rıza', pitch: 0.85, rate: 1.15, color: '#b6f08a' },
  fadime: { name: 'Fadime Teyze', pitch: 1.35, rate: 1.1, color: '#ffb3d1', female: true },
  muhtar: { name: 'Muhtar Necati', pitch: 0.65, rate: 0.95, color: '#ffc285' },
  gelin: { name: 'Gelin Zeynep', pitch: 1.4, rate: 1.05, color: '#ffd6f0', female: true },
  damat: { name: 'Damat Okan', pitch: 1.0, rate: 1.2, color: '#c9c3ff' },
  cocuk: { name: 'Küçük Emre', pitch: 1.6, rate: 1.2, color: '#a8ffe8' },
};

export const VOICE_INDEX = { anlatici: 0, cafer: 1, riza: 2, fadime: 0, muhtar: 1, gelin: 0, damat: 2, cocuk: 0 };

export const INTRO = [
  { s: 'anlatici', t: 'Kuzulu köyünde güzel bir cumartesi sabahı. Bugün Muhtar Necati\'nin kızı Zeynep evleniyor.' },
  { s: 'anlatici', t: 'Davullar akordu yapılıyor, baklavalar tepsilerde, herkes çok mutlu.' },
  { s: 'anlatici', t: 'Herkes... bir kişi hariç. Ahırın köşesindeki inatçı, kara gözlü keçi: Gıdık.' },
  { s: 'cafer', t: 'Gıdık! Bugün sakın yaramazlık yapma. Bugün olmaz. Duydun mu beni? Bugün olmaz!' },
  { s: 'anlatici', t: 'Gıdık onu duydu. Ve tam olarak bugün yapmaya karar verdi.' },
];

export const QUESTS = [
  {
    id: 'kacis',
    title: 'Büyük Kaçış',
    text: 'Ahırın kapısına kafa at, dışarı çık.',
    done: [
      { s: 'cafer', t: 'Kapı! Kapı nasıl açıldı? Gıdık! Gel buraya!' },
      { s: 'anlatici', t: 'Gıdık özgür. Köy henüz ne olacağını bilmiyor.' },
    ],
  },
  {
    id: 'karpuz',
    title: 'Karpuz Yağmuru',
    text: 'Manav Rıza\'nın tezgâhından karpuzları düşür.',
    total: 5,
    done: [
      { s: 'riza', t: 'Karpuzlarım! Diyarbakır karpuzu bunlar, kilosu altın! Hey keçi!' },
      { s: 'anlatici', t: 'Rıza Bey o gün karpuzları "indirimli" sattı.' },
    ],
  },
  {
    id: 'camasir',
    title: 'Moda Haftası',
    text: 'Fadime Teyze\'nin çamaşırlarını kap (E), tarladaki korkuluğa giydir.',
    total: 3,
    done: [
      { s: 'fadime', t: 'Aaa! Benim çiçekli şalvarım korkuluğun üstünde! Rahmetli kocamdan yadigâr!' },
      { s: 'anlatici', t: 'Korkuluk ilk kez bu kadar şık görünüyordu. Kargalar bile durup baktı.' },
    ],
  },
  {
    id: 'tavuk',
    title: 'Tavuk Çobanı',
    text: 'Kaçan tavukları kümese sok. Meleyince (Q) kaçışırlar.',
    total: 4,
    done: [
      { s: 'cocuk', t: 'Annee! Keçi tavukları güdüyor! Keçi çoban olmuş!' },
      { s: 'cafer', t: 'Otuz yıldır çobanım, böylesini görmedim. Ama yine de yakalayacağım seni!' },
    ],
  },
  {
    id: 'traktor',
    title: 'Muhtarın Gururu',
    text: 'Tepedeki traktörü göle yuvarla. El freni... pek sağlam değil.',
    done: [
      { s: 'muhtar', t: 'Traktörüm! Dün yıkatmıştım! Şimdi ördekler içinde yüzüyor!' },
      { s: 'anlatici', t: 'Ördekler traktörü çok sevdi. Yeni evlerine yerleştiler.' },
    ],
  },
  {
    id: 'dugun',
    title: 'Düğün Halayı',
    text: 'Düğün meydanına git, davulun ritmine uy, halayı çek!',
    hidden: true,
    done: [],
  },
];

export const FINALE_START = [
  { s: 'muhtar', t: 'Durun! Davulu durdurun! O keçi... o keçi düğüne giriyor!' },
  { s: 'gelin', t: 'Baba, dur. Bak, halayın başına geçti. Ritim de tutturuyor!' },
  { s: 'anlatici', t: 'Davulun vuruşlarında zıpla. Halayı Gıdık çekecek.' },
];

export const ENDING = [
  { s: 'anlatici', t: 'Ve o gün Kuzulu köyünde bir efsane doğdu.' },
  { s: 'damat', t: 'Hayatımda bu kadar güzel halay görmedim. Keçi bizden iyi oynadı.' },
  { s: 'gelin', t: 'Baba, onu affet. Düğünümü unutulmaz yaptı.' },
  { s: 'muhtar', t: 'Peki... Ama traktörün parasını ondan keseceğim.' },
  { s: 'cafer', t: 'Gıdık, gel bakalım buraya. Sana bir kova elma ayırdım. Ama yarın yaramazlık yok! Yarın olmaz!' },
  { s: 'anlatici', t: 'Gıdık onu duydu. Ve yarın için çoktan bir plan yapmıştı.' },
];

export const BARKS = {
  hitVillager: [
    { s: 'riza', t: 'Ah belim!' },
    { s: 'fadime', t: 'Terbiyesiz keçi!' },
    { s: 'cocuk', t: 'Hahaha! Bir daha!' },
    { s: 'muhtar', t: 'Ben muhtarım, bana kafa atılmaz!' },
    { s: 'damat', t: 'Takım elbisem! Kiralıktı!' },
  ],
  caught: [
    { s: 'cafer', t: 'Yakaladım seni! Hadi bakalım, ahıra!' },
    { s: 'cafer', t: 'Kaçamazsın Gıdık! Otuz yıllık çobanım ben!' },
    { s: 'cafer', t: 'Bu sefer kapıyı iki kere kilitledim. Herhalde.' },
  ],
  chaseStart: [
    { s: 'cafer', t: 'Gıdık! Dur oradan! Dur dedim!' },
    { s: 'cafer', t: 'Yeter bu kadar! Geliyorum!' },
  ],
  chaseLost: [{ s: 'cafer', t: 'Of... dizlerim... Yaşlandım ben...' }],
  pot: [
    { s: 'fadime', t: 'Çömleğim! Babaannemden kalmıştı!' },
    { s: 'riza', t: 'Turşu küpü! Üç aylık turşu!' },
  ],
  cabbage: [{ s: 'anlatici', t: 'Lahana. Gıdık\'ın en sevdiği şey. Kaos enerjisi doldu.' }],
  bleat: [{ s: 'cocuk', t: 'Meee! Keçi konuşuyor!' }],
};

export const TIPS = [
  'Sol tık / F: kafa at · E: ağzına al veya yere bırak · Q: mele · Boşluk: zıpla · Shift: koş',
  'Lahanaları ye: kaos enerjisi dolar, Gıdık daha hızlı koşar.',
  'Çoban Cafer kovalarsa kaç ya da saman yığınlarının arkasına saklan.',
];
