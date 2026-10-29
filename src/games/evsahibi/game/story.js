// EV SAHİBİ — Cingöz ile Necmi Bey. Tüm metinler.
// Konak, kişiler ve olaylar kurgudur.

export const SPEAKERS = {
  anlatici: { name: 'Anlatıcı', pitch: 1.0, rate: 1.02, color: '#ffe3a0' },
  cingoz: { name: 'Cingöz', pitch: 1.25, rate: 1.1, color: '#9df0ff' },
  necmi: { name: 'Necmi Bey', pitch: 0.7, rate: 1.0, color: '#ffb08a' },
  defne: { name: 'Defne', pitch: 1.6, rate: 1.1, color: '#ffc8ec', female: true },
  usta: { name: 'Usta Rıfat', pitch: 0.85, rate: 1.1, color: '#c8e08a' },
};
export const VOICE_INDEX = { anlatici: 0, cingoz: 1, necmi: 0, defne: 0, usta: 2 };

// ---------------- Şakalar ----------------
// need: önce başka bir yerden alınması gereken eşya. room: hazırlanacağı oda.
// act: Necmi'nin bu şakayı tetikleyen etkinliği. react: tepki animasyonu.
export const PRANKS = {
  tuz: {
    title: 'Tuzlu çay', room: 'mutfak', item: 'semaver', prompt: 'Çaya tuz kat', need: 'tuz', time: 2.2, act: 'cay', react: 'spit', score: 120,
    lines: [{ s: 'necmi', t: 'Pöh! Bu ne? Deniz suyu mu bu? Kim tuz koydu çayıma?' }],
  },
  sandalye: {
    title: 'Gevşek sandalye', room: 'salon', item: 'sandalye', prompt: 'Sandalyenin ayağını gevşet', time: 2.8, act: 'oturma', react: 'fall', score: 150,
    lines: [{ s: 'necmi', t: 'Ahh! Belim! Yüz elli liralık antika diye sattılar bunu bana!' }],
  },
  kumanda: {
    title: 'Pilsiz kumanda', room: 'salon', item: 'kumanda', prompt: 'Kumandanın pillerini al', time: 1.6, act: 'tv', react: 'bang', score: 90, gives: 'pil',
    lines: [{ s: 'necmi', t: 'Çalış! Çalış be! Maç başlıyor! Hay senin pilini…' }],
  },
  sabun: {
    title: 'Sabunlu merdiven', room: 'merdiven', item: 'basamak', prompt: 'Basamağa sabun sür', need: 'sabun', time: 2.0, act: 'merdiven', react: 'slip', score: 180,
    lines: [{ s: 'necmi', t: 'Aaaaah! Bu merdiven beni öldürecek! Yarın halı döşetiyorum!' }],
  },
  dus: {
    title: 'Buz gibi duş', room: 'banyo', item: 'vana', prompt: 'Sıcak su vanasını kapat', time: 1.8, act: 'dus', react: 'scream', score: 140,
    lines: [{ s: 'necmi', t: 'Buz! Buz gibi! Termosifon da mı bozuk bu evde?!' }],
  },
  saat: {
    title: 'Gece yarısı alarmı', room: 'yatak', item: 'saat', prompt: 'Çalar saati sabaha karşı üçe kur', need: 'pil', time: 2.0, act: 'uyku', react: 'jump', score: 160,
    lines: [{ s: 'necmi', t: 'Ne oluyor?! Deprem mi? Saat üç! Bu saat kendi kendine mi kuruldu?' }],
  },
  hortum: {
    title: 'Düğümlü hortum', room: 'avlu', item: 'hortum', prompt: 'Hortuma düğüm at', time: 2.4, act: 'sulama', react: 'splash', score: 130,
    lines: [{ s: 'necmi', t: 'Su gelmiyor mu? Bir bakayım… Pfff! Gözüme! Gözüme kaçtı!' }],
  },
  // ---- Bölüm 2: Tadilat ----
  boya: {
    title: 'Kapıda boya kovası', room: 'salon', item: 'kapi', prompt: 'Kapının üstüne boya kovası koy', need: 'boya', time: 2.6, act: 'kontrol', react: 'paint', score: 200,
    lines: [{ s: 'necmi', t: 'Gözlerim! Takım elbisem! Bembeyaz oldum!' }],
  },
  plan: {
    title: 'Karalanmış plan', room: 'calisma', item: 'plan', prompt: 'Otel planına bıyık çiz', time: 2.0, act: 'plan', react: 'rage', score: 150,
    lines: [{ s: 'necmi', t: 'Kim çizdi bu bıyıkları? Mimar bana bin dolar aldı bu plan için!' }],
  },
  matkap: {
    title: 'Ters matkap', room: 'calisma', item: 'matkap', prompt: 'Matkabın ucunu ters tak', time: 1.8, act: 'matkap', react: 'spin', score: 170,
    lines: [{ s: 'usta', t: 'Abi bu matkap beni döndürüyor! Ayaklarım yerden kesildi!' }],
  },
  biber: {
    title: 'Acı yoğurt', room: 'mutfak', item: 'yogurt', prompt: 'Yoğurda pul biber kat', need: 'biber', time: 1.8, act: 'yemek', react: 'spicy', score: 160,
    lines: [{ s: 'necmi', t: 'Yanıyorum! Su! Su verin! Ağzımda yangın var!' }],
  },
  kedi: {
    title: 'Kedi dostu', room: 'avlu', item: 'kapi_avlu', prompt: 'Sokak kedilerini içeri al', time: 2.2, act: 'avlu_kontrol', react: 'cats', score: 140,
    lines: [{ s: 'necmi', t: 'Bu kediler nereden çıktı?! Hapşu! Alerjim var benim! Hapşu!' }],
  },
};

// Etrafta bulunan eşyalar (önce alınması gereken)
export const ITEMS = {
  tuz: { name: 'Tuz', room: 'mutfak', prompt: 'Tuzluğu al' },
  sabun: { name: 'Sabun', room: 'banyo', prompt: 'Sabunu al' },
  pil: { name: 'Pil', room: 'salon', prompt: '' }, // kumandadan çıkar
  boya: { name: 'Boya kovası', room: 'avlu', prompt: 'Boya kovasını al' },
  biber: { name: 'Pul biber', room: 'mutfak', prompt: 'Pul biberi al' },
};

// ---------------- Bölümler ----------------
// routine: Necmi'nin sırayla yaptığı işler. act eşleşen şaka varsa tetiklenir.
export const EPISODES = [
  {
    id: 1,
    title: 'Taşınma Günü',
    goal: 5,
    time: 330,
    pranks: ['tuz', 'sandalye', 'kumanda', 'sabun', 'dus', 'saat', 'hortum'],
    items: ['tuz', 'sabun'],
    routine: [
      { act: 'kutu', room: 'salon', x: 1.2, dur: 10, label: 'kutuları açıyor', anim: 'work' },
      { act: 'cay', room: 'mutfak', x: -4.2, dur: 7, label: 'çay içiyor', anim: 'drink' },
      { act: 'oturma', room: 'salon', x: 3.6, dur: 6, label: 'sandalyede gazete okuyor', anim: 'sit' },
      { act: 'tv', room: 'salon', x: 5.2, dur: 7, label: 'televizyon açıyor', anim: 'tv' },
      { act: 'merdiven', room: 'merdiven', x: 8.6, dur: 0.6, label: 'yukarı çıkıyor', anim: 'walk' },
      { act: 'dus', room: 'banyo', x: -5.6, dur: 7, label: 'duş alıyor', anim: 'shower' },
      { act: 'uyku', room: 'yatak', x: 2.4, dur: 12, label: 'öğle uykusunda', anim: 'sleep' },
      { act: 'merdiven', room: 'merdiven', x: 8.6, dur: 0.6, label: 'aşağı iniyor', anim: 'walk' },
      { act: 'sulama', room: 'avlu', x: -10.8, dur: 8, label: 'çiçekleri suluyor', anim: 'water' },
    ],
    intro: [
      { s: 'anlatici', t: 'Kıyı Mahallesi, Cingöz Konağı. Üç yüz yıllık bir ahşap ev. Ve üç yüz yıllık bir ev sahibi.' },
      { s: 'cingoz', t: 'Ben Cingöz. Bu evin cinidir efendim. Kiracı değil, ev sahibi!' },
      { s: 'anlatici', t: 'Bugün konağa yeni biri taşınıyor: Necmi Bey. Evi ucuza kapattı. Otel yapacak.' },
      { s: 'necmi', t: 'Şu çınarı kestireceğim, kedileri kovacağım, burayı lüks otel yapacağım. Para, para, para!' },
      { s: 'cingoz', t: 'Çınarımı mı? Kedilerimi mi? Görürsün sen Necmi Bey. Bugün taşındığına pişman olacaksın.' },
    ],
    tips: [
      'Necmi Bey\'in rutinini izle: üstteki şeritte ne yapacağı yazıyor.',
      'Aynı odadayken iş yaparsan seni görür. Dolaba, perdeye saklan.',
      'Tuz mutfakta, sabun banyoda. Önce al, sonra kullan.',
    ],
    win: [
      { s: 'necmi', t: 'Bu ev lanetli! Hayır hayır, lanet yoktur, ben mühendisim! Ama… bu ev bir tuhaf.' },
      { s: 'cingoz', t: 'Birinci gün benim. Yarın usta gelecekmiş. Hazırlıklı olayım.' },
    ],
    lose: [{ s: 'necmi', t: 'Gördüm seni! Duman gibi bir şey! Hocayı arıyorum, hemen!' }],
    timeUp: [{ s: 'cingoz', t: 'Akşam oldu bile. Necmi Bey hâlâ keyifli. Bu iş olmadı.' }],
  },
  {
    id: 2,
    title: 'Tadilat',
    goal: 5,
    time: 360,
    pranks: ['boya', 'plan', 'matkap', 'biber', 'kedi', 'tuz', 'sandalye'],
    items: ['boya', 'biber', 'tuz'],
    usta: true,
    routine: [
      { act: 'plan', room: 'calisma', x: -4.4, dur: 8, label: 'otel planına bakıyor', anim: 'read' },
      { act: 'merdiven', room: 'merdiven', x: 8.6, dur: 0.6, label: 'aşağı iniyor', anim: 'walk' },
      { act: 'kontrol', room: 'salon', x: -0.4, dur: 6, label: 'ustayı kontrol ediyor', anim: 'point' },
      { act: 'yemek', room: 'mutfak', x: -3.2, dur: 8, label: 'yoğurt yiyor', anim: 'eat' },
      { act: 'oturma', room: 'salon', x: 3.6, dur: 6, label: 'dinleniyor', anim: 'sit' },
      { act: 'avlu_kontrol', room: 'avlu', x: -10.8, dur: 7, label: 'çınarı ölçüyor', anim: 'point' },
      { act: 'cay', room: 'mutfak', x: -4.2, dur: 6, label: 'çay içiyor', anim: 'drink' },
      { act: 'merdiven', room: 'merdiven', x: 8.6, dur: 0.6, label: 'yukarı çıkıyor', anim: 'walk' },
      { act: 'matkap_bak', room: 'calisma', x: 1.4, dur: 5, label: 'ustaya iş veriyor', anim: 'point' },
    ],
    intro: [
      { s: 'anlatici', t: 'İkinci gün. Necmi Bey sabahın köründe Usta Rıfat\'ı getirdi. Konağın çalışma odası otel resepsiyonu olacakmış.' },
      { s: 'necmi', t: 'Rıfat Usta, bu duvarı yık, şu çınarı da öğleden sonra kesersin.' },
      { s: 'usta', t: 'Abi bu konak eski, dokunmasak mı? Ninem derdi, eski evlerin sahibi olur.' },
      { s: 'necmi', t: 'Sahibi benim! Tapusu cebimde!' },
      { s: 'cingoz', t: 'Tapu senin olabilir. Ev benim.' },
    ],
    tips: ['Usta Rıfat da evde. O da seni görebilir, ama ona yapılan şakalar Necmi Bey\'i daha çok kızdırır.', 'Boya kovası avluda, pul biber mutfak rafında.'],
    win: [
      { s: 'usta', t: 'Abi ben bu evde çalışmam. Ninem haklıymış. Kusura bakma.' },
      { s: 'necmi', t: 'Usta da kaçtı! Neyse, yarın torunum Defne geliyor. Hiç değilse o bana yardım eder.' },
      { s: 'cingoz', t: 'Torunu mu? Çocuklar beni görebilir… Bu işler karışacak.' },
    ],
    lose: [{ s: 'necmi', t: 'Rıfat, gördün mü? Duman! Mavi duman! Hocayı ara, hemen!' }],
    timeUp: [{ s: 'cingoz', t: 'Hava karardı, duvar yıkıldı bile. Yarın daha hızlı olmalıyım.' }],
  },
];

export const BARKS = {
  suspicious: [
    { s: 'necmi', t: 'Bir ses mi geldi?' },
    { s: 'necmi', t: 'Bu evde bir tuhaflık var…' },
    { s: 'necmi', t: 'Kim var orada?' },
  ],
  caught: [
    { s: 'necmi', t: 'Gördüm seni! Hocayı çağıracağım!' },
    { s: 'necmi', t: 'Defol! Defol evimden duman herif!' },
    { s: 'necmi', t: 'Hah! Yakaladım! Şimdi okuyacağım sana!' },
  ],
  combo: [
    { s: 'cingoz', t: 'Hahaha! Bir de bunu tat!' },
    { s: 'cingoz', t: 'Seri geliyor, Necmi Bey!' },
  ],
  grab: [{ s: 'cingoz', t: 'Bu işime yarar.' }],
  cantYet: [{ s: 'cingoz', t: 'Bunun için önce bir şey bulmalıyım.' }],
  hide: [{ s: 'cingoz', t: 'Şşş…' }],
};
