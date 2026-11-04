// Kuşyolu 2D — Bölüm 1 metinleri. Kişiler, yerler ve olaylar kurgudur.
// 3B sürümdeki replikler aynen kullanılır; böylece mevcut seslendirmeler de çalışır.
import { SPEAKERS, CHAPTER1 } from '../../kusyolu/game/story.js';

export const SPEAKERS2 = {
  ...SPEAKERS,
  nevin: { name: 'Nevin Teyze', color: '#f4b8d8' },
  hayri: { name: 'Hayri Amca', color: '#e8d4a0' },
  cocuk: { name: 'Minik Ece', color: '#ffe48a' },
  rifat: { name: 'Rıfat Usta', color: '#c8d4e0' },
  anne: { name: 'Kaan’ın annesi', color: '#f4b8d8' },
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

export const GECE = {
  hideTip: (touch) => `Polis bu tarafa geliyor! Konteynerin arkasına geç ve ${touch ? '⬇ düğmesini' : 'S tuşunu'} basılı tutarak saklan`,
  kaanMsg: 'Polisi arsaya götürdüm. Sen git, ben idare ederim.',
  bekciSeen: [
    { s: 'arda', t: 'Bekçi Hüsnü devriyede. Feneri dönünce saklanmam lazım.' },
    { s: 'arda', t: 'Kor atarken de kimse yakınımda olmamalı.' },
  ],
  alley: [{ s: 'arda', t: 'Köşede bir polis daha. Telsizle konuşmaya dönünce geçerim.' }],
};

export const LEYLEK = {
  bench: [{ s: 'arda', t: 'Kor masada. Her atışında depodaki bütün tozlar havaya kalkıyor.' }],
  skeleton: [
    { s: 'mert', t: 'Bu iskelet bizim eski vinçten. Babam görse ne derdi bilmiyorum.' },
    { s: 'kaan', t: 'Herhalde "oğlum bu ne" derdi.' },
  ],
  where: [
    { s: 'mert', t: 'Jeneratörle saclar Rıfat Usta’nın hurdalığında var. Çanak da Kaan’ların çatısında.' },
    { s: 'zeynep', t: 'Telsiz bende. Ama ayarı bozuk, önce frekansı bulmam lazım.' },
  ],
  tuneStart: [{ s: 'zeynep', t: 'Düğmeyi yavaşça çevir. Hışırtı kesilince orada tut.' }],
  tuneDone: [{ s: 'zeynep', t: 'İşte! Temiz sinyal. Telsiz çalışıyor.' }],
  doorAsk: 'Nereye gidelim?',
  deliver: [{ s: 'mert', t: 'Getirdiklerini şuraya bırak, hemen takarım.' }],
  needMore: (n) => [{ s: 'mert', t: n === 1 ? 'Bir parça kaldı. Hadi, az kaldı.' : `Daha ${n} parça lazım.` }],
  // hurdalık
  rifat1: [
    { s: 'rifat', t: 'Gece yarısı hurdalıkta ne arıyorsunuz evlatlar?' },
    { s: 'mert', t: 'Rıfat Usta, bize bir jeneratör lazım. Bir de oluklu sac.' },
    { s: 'rifat', t: 'Veririm. Ama önce kedim Pamuk’u bulun. Akşamdan beri ortada yok, aç kaldı garibim.' },
  ],
  rifatWait: [{ s: 'rifat', t: 'Pamuk bulunmadan pazarlık yok. Miyavlamasını dinleyin.' }],
  emptyBarrel: [{ s: 'arda', t: 'Varilin içi boş. Sadece yağ kokusu var.' }],
  emptyCar: [{ s: 'arda', t: 'Arabanın koltuğunda yalnızca bir eldiven var. Pamuk burada değil.' }],
  meow: [{ s: 'mert', t: 'Ses yukarıdan geliyor. Ezilmiş arabaların tepesinden.' }],
  climbTip: (touch) => `Araba yığınına tırman: ${touch ? '▲ düğmesiyle' : 'W tuşuyla'} zıpla`,
  cat: [{ s: 'arda', t: 'Buldum seni! Gel buraya küçük, korkma.' }],
  sacTop: [{ s: 'arda', t: 'Oluklu saclar da burada, yığının en tepesinde.' }],
  rifat2: [
    { s: 'rifat', t: 'Pamuk! Nerelerdeydin sen? Sağ olun evlatlar.' },
    { s: 'rifat', t: 'Jeneratör sizin. El arabasını da alın, sırtınızda taşıyamazsınız onu.' },
    { s: 'mert', t: 'Sağ ol usta. Saclar da bizde, hepsini yarın öderiz.' },
    { s: 'rifat', t: 'Ödemeyin. Ne yapıyorsanız bitince bir gösterin yeter.' },
  ],
  // Kaan'ın çatısı
  anne1: [
    { s: 'anne', t: 'Kaan? Bu saatte çatıda ne işin var oğlum?' },
    { s: 'kaan', t: 'Anne… sen asıl bu saatte çamaşır mı asıyorsun?' },
    { s: 'anne', t: 'Gündüz vakit mi var? Sen soruma cevap ver.' },
  ],
  anneAsk: 'Kaan’ın annesine ne diyeceksin?',
  anneOpts: [
    {
      id: 'tamir',
      text: 'Çanak bozuk teyze, tamire götürüyoruz.',
      reply: [
        { s: 'arda', t: 'Çanak bozuk teyze, tamire götürüyoruz.' },
        { s: 'anne', t: 'Bozuk mu? Dizim de ondan mı kesiliyordu? Götürün, ama hafta sonuna yetiştirin.' },
      ],
    },
    {
      id: 'uzay',
      text: 'Uzaya gidiyoruz, çanağı anten yapacağız.',
      reply: [
        { s: 'arda', t: 'Uzaya gidiyoruz, çanağı anten yapacağız.' },
        { s: 'anne', t: 'Uzaya ha? Giderken çöpü de atın o zaman. Hadi alın, alın.' },
        { s: 'kaan', t: 'Gördün mü? Doğruyu söyleyince kimse inanmıyor.' },
      ],
    },
  ],
  unscrew: (n) => `Çanağın vidalarını sök (${n}/4)`,
  canakDone: [{ s: 'kaan', t: 'Tamam, çanak bizde. Annem dizisini kaçıracak ama.' }],
  // depoda montaj sonrası
  afterKnock: [{ s: 'zeynep', t: 'Gitti mi? Gitti. Nefesimi tutmuşum.' }],
  weeks: 'Üç hafta sonra',
  weeksSub: 'Leylek’in son vidası takılıyor',
  prepIntro: [{ s: 'mert', t: 'Önce yükü yerleştir, sonra herkesle konuş. Bir saatimiz var.' }],
  boardTip: 'Merdivenden Leylek’e bin',
};

export const GOK = {
  seatTip: 'Konsoldaki düğmelere sırayla bas',
  birds: [{ s: 'elif', t: 'Kuşlar! Leylekler! Sola, sola kır!' }],
  plane: [{ s: 'kumru', t: 'Yolcu uçağı rotası. Kimse bizi radarda görmesin diye dua edin.' }],
  hit: [{ s: 'mert', t: 'Bir şeye çarptık! Yamalar hâlâ tutuyor.' }],
  hullFail: [{ s: 'kumru', t: 'Gövde zayıfladı. Daha alçağa inip yeniden tırmanıyoruz.' }],
  burnTip: (touch) => (touch ? '● düğmesini basılı tut: ateşleme' : 'E ya da Boşluk tuşunu basılı tut: ateşleme'),
  dodgeTip: (touch) => (touch ? '▲ ▼ ile taşlardan kaç' : 'W / S ile taşlardan kaç'),
  landTip: (touch) => (touch ? '● ya da ▲ basılı: motor · ◀ ▶: yana kay' : 'W / E basılı: motor · A / D: yana kay'),
  evaTip: (touch) => (touch ? '▲ ile zıpla · sinyale yürü' : 'W ile zıpla · sinyale yürü'),
  helmets: [{ s: 'zeynep', t: 'Kask contaları tamam. Oksijen dört saat.' }],
  monolith: [{ s: 'kaan', t: 'Şuna bakın… yerden bir ışık sütunu çıkıyor.' }],
  end: [
    { s: 'elif', t: 'Kapı. Kor bunun anahtarıymış.' },
    { s: 'mert', t: 'Dünya’ya dönmek için yakıt var. Ama içeri girersek ne olur, bilmiyoruz.' },
    { s: 'arda', t: 'Bilmiyoruz. Ama buraya kadar biz geldik. Devamını da biz göreceğiz.' },
  ],
};

export const ARSA = {
  end: [{ s: 'anlatici', t: 'O gece mahalle bir meteor konuştu. Biz ise elimizde atan bir kalple eve döndük.' }],
};

export const CHAPTERS2D = [
  { id: 1, title: 'Göktaşı', place: 'Çatı, apartman, sokak, arsa ve kaçış', start: 'roof', ready: true },
  { id: 2, title: 'Leylek', place: 'Depo, hurdalık, çatı ve son gece', start: 'depo', ready: true },
  { id: 3, title: 'Gökyüzü', place: 'Kalkış, boşluk ve Ay’a iniş', start: 'kokpit', ready: true },
  { id: 4, title: 'Sisli Deniz', place: 'İlk Kapı · Sular' },
  { id: 5, title: 'Kızıl Kum', place: 'Kumcular' },
  { id: 6, title: 'Buz Kafesi', place: 'Saatçiler' },
  { id: 7, title: 'Işıyan Orman', place: 'Kök' },
  { id: 8, title: 'Yolcuların Evi', place: 'Son durak' },
];
