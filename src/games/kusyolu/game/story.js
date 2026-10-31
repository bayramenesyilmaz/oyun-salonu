// KUŞYOLU — Bölüm 1–5 (Dünya bölümleri). Kişiler, yerler ve olaylar kurgudur.
// Oyuncu Arda'dır (birinci şahıs). Diğer dört arkadaş sahnede.

export const SPEAKERS = {
  arda: { name: 'Arda', color: '#ffd9a8', pitch: 0.95, rate: 1.0 },
  kaan: { name: 'Kaan', color: '#9fd0ff', pitch: 1.05, rate: 1.06 },
  elif: { name: 'Elif', color: '#ffc4b8', pitch: 1.25, rate: 1.0, female: true },
  mert: { name: 'Mert', color: '#d7e3b0', pitch: 0.8, rate: 0.95 },
  zeynep: { name: 'Zeynep', color: '#d9b8ff', pitch: 1.3, rate: 1.04, female: true },
  anlatici: { name: '', color: '#c8ccd6', pitch: 1, rate: 1 },
  polis: { name: 'Polis memuru', color: '#a9c4ff', pitch: 0.75, rate: 1.0 },
  bekci: { name: 'Bekçi Hüsnü', color: '#e6c27a', pitch: 0.65, rate: 0.92 },
  kumru: { name: 'Kumru', color: '#8ff0d6', pitch: 1.2, rate: 1.0, female: true },
};
export const VOICE_INDEX = { arda: 0, kaan: 1, mert: 2, elif: 0, zeynep: 1, polis: 1, bekci: 2, kumru: 0 };

export const CHAPTER1 = {
  title: 'Göktaşı',
  place: 'Kızılkaya Mahallesi · Ağustos · 23.40',
  intro: [
    { s: 'kaan', t: 'Arda! Gel buraya, bu gece gökyüzü başka türlü.' },
    { s: 'elif', t: 'Bu gece Perseid yağmuru var. Saatte elli altmış tane meteor düşüyor.' },
  ],
  // her arkadaşla konuşma (sırası serbest); ilk konuşma uzun, sonrakiler kısa
  talk: {
    kaan: [
      [
        { s: 'kaan', t: 'Annem yine aradı. Gece yarısı çatıda ne işiniz var dedi.' },
        { s: 'arda', t: 'Peki sen ne dedin ona?' },
        { s: 'kaan', t: 'Yıldız sayıyoruz dedim. Güldü, kapattı.' },
      ],
      [{ s: 'kaan', t: 'Şu beyaz bulut gibi şeriti görüyor musun? Dedem ona Kuşyolu derdi. Kuşlar göçerken onu takip edermiş.' }],
    ],
    elif: [
      [
        { s: 'elif', t: 'Bak, kuzeydoğuya. Hepsi aynı noktadan çıkıyor gibi görünüyor.' },
        { s: 'arda', t: 'Gerçekten aynı yerden mi geliyorlar?' },
        { s: 'elif', t: 'Hayır. Bir kuyrukluyıldızın bıraktığı tozun içinden geçiyoruz.' },
      ],
      [{ s: 'elif', t: 'Bir gün oraya gideceğim. Gülme. Ciddiyim.' }],
    ],
    mert: [
      [
        { s: 'mert', t: 'Çay demlendi, otur biraz.' },
        { s: 'mert', t: 'Yarın sanayide bir motor sökeceğiz. Eller yine yağ olacak.' },
      ],
      [{ s: 'mert', t: 'Sen yıldız bak, ben çaya bakarım. Herkesin bir işi var.' }],
    ],
    zeynep: [
      [
        { s: 'zeynep', t: 'Telefonu sehpaya diktim, gökyüzünü kaydediyor.' },
        { s: 'zeynep', t: 'Bir şey olursa kaçırmayız. Gerçi hep bir şey olmaz.' },
      ],
      [{ s: 'zeynep', t: 'Pil yüzde kırk. Bir saat daha dayanır.' }],
    ],
  },
  meteor: [
    { s: 'elif', t: 'Şuna bakın! O ne?' },
    { s: 'kaan', t: 'Bu meteor değil! Bu düşüyor, bize doğru düşüyor!' },
  ],
  afterFlash: [{ s: 'mert', t: 'Herkes yere! Ses gelecek!' }],
  afterBoom: [
    { s: 'zeynep', t: 'Siz iyi misiniz? Kimsenin bir şeyi yok, değil mi?' },
    { s: 'kaan', t: 'Arkadaki boş araziye düştü. Gördüm, oraya düştü!' },
    { s: 'zeynep', t: 'Kaydettim. Hepsi telefonda.' },
    { s: 'arda', t: 'Hadi. Kimse gelmeden önce biz bakalım.' },
  ],
  arsaIntro: [
    { s: 'mert', t: 'Duman hâlâ çıkıyor. Yavaş olun.' },
    { s: 'elif', t: 'Arda, gel. Bunu görmen lazım.' },
  ],
  crater: [
    { s: 'elif', t: 'Sıcak. Ama yanmıyor. Taş nefes alıyor gibi.' },
    { s: 'mert', t: 'Sakın dokunmayın, ne olduğunu bilmiyoruz.' },
    { s: 'zeynep', t: 'Telefonun pusulası deliye döndü. Etrafında bir alan var.' },
  ],
  take: [
    { s: 'arda', t: 'Çok hafif. Ve sıcak, ama elimi yakmıyor.' },
    { s: 'kaan', t: 'Abi… ışıklar. Bütün mahallenin ışıkları titriyor.' },
    { s: 'zeynep', t: 'Taş her attığında ışıklar da atıyor. Sanki bir şeye sinyal yolluyor.' },
    { s: 'mert', t: 'Siren sesi. Polis geliyor.' },
    { s: 'arda', t: 'Kimseye bir şey söylemiyoruz. Taşı depoya götürüyoruz. Hemen.' },
  ],
  idleBarks: {
    kaan: ['Abi bak, bir tane daha kaydı!', 'Sen dilek tuttun mu bari?'],
    elif: ['Hepsi Kahraman takımyıldızından geliyor. Adı da oradan: Perseid.'],
    mert: ['Çayınız soğumasın, hadi gelin.'],
    zeynep: ['Kayıt devam ediyor.'],
  },
};

export const OBJECTIVES = {
  talk: (n) => `Arkadaşlarınla konuş (${n}/4)`,
  watch: 'Gökyüzüne bak',
  door: 'Çatı kapısından aşağı in',
  crater: 'Kratere yaklaş',
  take: 'Taşı al',
  end: '',
};

// ---------------------------------------------------------------------------
// Bölüm 2 — Kor: taşı mahalle sokaklarından depoya, kimseye görünmeden götür.
export const CHAPTER2 = {
  title: 'Kor',
  place: 'Kızılkaya Mahallesi · 00.20',
  intro: [
    { s: 'mert', t: 'Kızlar evlerine dağıldı. Zeynep kayıtları saklayacak.' },
    { s: 'kaan', t: 'Polis arabası tam köşede. Ben onları oyalarım, siz depoya gidin.' },
    { s: 'mert', t: 'Ben önden gidip kepengi açayım. Arka sokaktaki eski vinç deposu, biliyorsun.' },
    { s: 'arda', t: 'Tamam. Taşı ceketimin altına saklarım, ışığı görünmesin.' },
  ],
  distract: [
    { s: 'kaan', t: 'Memur bey, iyi akşamlar! O gürültü neydi, bir şey mi düştü?' },
    { s: 'polis', t: 'Evine git delikanlı, burası şu an tehlikeli olabilir.' },
    { s: 'kaan', t: 'Valla çok korktum. Şu tarafta da duman var, bir bakar mısınız?' },
  ],
  pulseWarn: [
    { s: 'arda', t: 'Taş yine atıyor. Saklamazsam herkes görecek.' },
    { s: 'arda', t: 'Işığı sokağa vuruyor. Ceketin altına, çabuk.' },
  ],
  suspicious: {
    polis: ['Kimse yok mu orada? Biri mi var?', 'Şu köşede bir ışık gördüm sanki.'],
    bekci: ['Hey, kim var orada? Bu saatte sokakta ne işin var?', 'Bekçi Hüsnü her şeyi görür, haberin olsun.'],
  },
  caught: {
    polis: { s: 'polis', t: 'Hey sen! Dur bakalım, elindeki o ışık ne?' },
    bekci: { s: 'bekci', t: 'Yakaladım seni! Gel bakalım buraya, ne saklıyorsun?' },
  },
  retry: [{ s: 'arda', t: 'Olmaz. Bir daha, daha dikkatli.' }],
  idle: {
    polis: ['Telsize bildirdim, ekip yolda. Kimse yaklaşmasın.', 'Bir şey düştü diyorlar, ama ne düştüğünü bilen yok.'],
    bekci: ['Gece gece hem meteor hem polis. Bu mahalleye ne oldu böyle?'],
  },
  messages: [
    { from: 'Zeynep', t: 'Videoyu yedekledim. Kimseye göstermiyorum.' },
    { from: 'Zeynep', t: 'Haberler "meteor" diyor. Nereye düştüğünü bilmiyorlar.' },
    { from: 'Kaan', t: 'Polis beni eve yolladı :) Arka sokağa bekçi çıktı, dikkat.' },
  ],
  arrive: [
    { s: 'mert', t: 'Arda! Buraya, çabuk, içeri gir!' },
    { s: 'arda', t: 'Kimse görmedi. Sanırım kimse görmedi.' },
    { s: 'mert', t: 'Kaan da kurtulmuş, mesaj attı. Taşı masaya koy, gerisini yarın düşünürüz.' },
  ],
  objectives: {
    wait: 'Kaan polisi oyalarken bekle',
    go: 'Taşı depoya götür · görünme',
    alley: 'Ara sokaktan arka sokağa geç',
    door: 'Depo kepengine ulaş',
  },
};

// ---------------------------------------------------------------------------
// Bölüm 3 — Depo: Kor’un sinyali, Leylek’in yapımı.
export const CHAPTER3 = {
  title: 'Depo',
  place: 'Eski vinç deposu · Ertesi gece',
  intro: [
    { s: 'zeynep', t: 'Taşı mengeneye koymayın! Masaya, yavaşça bırakın.' },
    { s: 'elif', t: 'Atışları çok düzenli. Her dört saniyede bir, bir saat gibi.' },
    { s: 'zeynep', t: 'Bilgisayarı bağladım. Taş bir sinyal yolluyor, ama bu radyo dalgası değil.' },
  ],
  map: [
    { s: 'zeynep', t: 'Bakın, bakın! Havaya bir şey çiziyor!' },
    { s: 'elif', t: 'Bu bir yıldız haritası. Şu parlak nokta Ay. Ve bu çizgi Ay’dan dışarı, çok uzağa gidiyor.' },
    { s: 'kaan', t: 'Yani bu taş bize yol mu gösteriyor şimdi?' },
    { s: 'mert', t: 'Gösteriyorsa, oraya gidecek bir araç lazım.' },
    { s: 'arda', t: 'O zaman yaparız. Elimizde bir depo, bir taş ve beş kişi var.' },
  ],
  later: [
    { s: 'mert', t: 'İskelet hazır. Kor’un enerjisi yeter de artar bile. Ama eksiklerimiz var.' },
    { s: 'mert', t: 'Bana dört şey lazım: jeneratör, oluklu saclar, Zeynep’in telsizi, bir de çanak anten.' },
  ],
  parts: {
    jenerator: { label: 'Jeneratör', line: { s: 'mert', t: 'Güzel. Bunu Kor’a bağlarsak motorlar ilk kez çalışır.' } },
    sac: { label: 'Oluklu saclar', line: { s: 'mert', t: 'Gövdeyi bunlarla kaplarız. Biraz yamalı olacak ama sağlam.' } },
    telsiz: { label: 'Eski telsiz', line: { s: 'zeynep', t: 'Kumru’nun kulakları bu. Yolda bizi duyacak tek şey.' } },
    canak: { label: 'Çanak anten', line: { s: 'kaan', t: 'Bizim apartmanın çanağı bu. Annem dizisini kaçıracak, haberin olsun.' } },
  },
  knock: [
    { s: 'bekci', t: 'Hey! Kim var içeride? Gece yarısı bu ne gürültü böyle?' },
    { s: 'zeynep', t: 'Arda, kapıya sen git. Bir şey uydur, çabuk.' },
  ],
  choice: {
    prompt: 'Bekçi Hüsnü’ye ne diyeceksin?',
    options: [
      { id: 'motor', text: 'Motor tamir ediyoruz Hüsnü Amca, yarın teslim edeceğiz.', reply: [{ s: 'arda', t: 'Motor tamir ediyoruz Hüsnü Amca, yarın teslim edeceğiz.' }, { s: 'bekci', t: 'Motor mu? Peki, ama sesi biraz kısın. Bütün mahalle uyuyor.' }] },
      { id: 'film', text: 'Film çekiyoruz, bilimkurgu. Sen de oynamak ister misin?', reply: [{ s: 'arda', t: 'Film çekiyoruz, bilimkurgu. Sen de oynamak ister misin?' }, { s: 'bekci', t: 'Film mi? Hah! Beni de yazın o zaman, bekçi rolüne. İyi geceler.' }] },
    ],
  },
  done: [
    { s: 'mert', t: 'Bitti. Leylek hazır, uçmaya hazır.' },
    { s: 'elif', t: 'Leylek mi? Adını sen mi koydun?' },
    { s: 'mert', t: 'Göçmen kuş. Her yıl gider, her yıl döner. Biz de döneceğiz.' },
    { s: 'zeynep', t: 'Kumru’yu yükledim. Kumru, merhaba de bakalım.' },
    { s: 'kumru', t: 'Merhaba. Ben Kumru. Bu aracın yapısal güvenliği yüzde altmış iki. Bunu bilmenizi isterim.' },
    { s: 'kaan', t: 'Yüzde altmış iki iyi mi, kötü mü?' },
    { s: 'kumru', t: 'Kötü, ama düzeltilebilir bir sorun.' },
  ],
  objectives: {
    watch: 'Kor’a bak',
    parts: (n) => `Parçaları bul ve Mert’e götür (${n}/4)`,
    door: 'Kapıya git',
    deliver: (name) => `${name} → Mert’e götür`,
  },
};

// ---------------------------------------------------------------------------
// Bölüm 4 — Hazırlık: son gece, vedalar, Kor’un yerleşmesi.
export const CHAPTER4 = {
  title: 'Hazırlık',
  place: 'Eski vinç deposu · Kalkıştan bir saat önce',
  intro: [
    { s: 'elif', t: 'Kalkış saat üçte. Mahalle uyurken, kimse bakmazken.' },
    { s: 'mert', t: 'Herkes kendi işini bitirsin, sonra kim kime vedalaşacaksa vedalaşsın.' },
  ],
  items: {
    su: { label: 'Su bidonları', line: { s: 'arda', t: 'Su bidonları tamam. Üç günlük suyumuz var.' } },
    harita: { label: 'Yıldız haritası', line: { s: 'elif', t: 'Haritanın kopyası. Kor bir gün susarsa bu bize yol gösterir.' } },
    defter: { label: 'Dedemin uçuş defteri', line: { s: 'arda', t: 'Dedemin uçuş defteri. Son sayfaya şunu yazmıştı: Gökyüzü bir kapıdır.' } },
    kor: { label: 'Kor’u yuvasına yerleştir', line: { s: 'kumru', t: 'Kor yerleşti. Enerji akışı kararlı. Kalbim atıyor gibi. Bu benzetme doğru mu?' } },
  },
  farewell: {
    kaan: [{ s: 'kaan', t: 'Anneme bir mektup bıraktım. Dizisini kaçırdığı için özür diledim. Asıl şeyi yazamadım.' }],
    zeynep: [{ s: 'zeynep', t: 'Bütün kayıtları buluta koydum. Döneceğiz ama, değil mi? Döneceğiz.' }],
    mert: [{ s: 'mert', t: 'Babamın tamirhanesinden son bir somun aldım. Cebimde duracak, uğur getirir.' }],
    elif: [
      { s: 'elif', t: 'Küçükken çatıdan yıldızlara bakardım. Şimdi onlara gidiyoruz. Korkmuyor musun?' },
      { s: 'arda', t: 'Korkuyorum. Ama gitmezsem ömür boyu merak edeceğim.' },
    ],
  },
  sms: { from: 'Annem', t: 'Oğlum geç kalma. Anahtarı paspasın altına koydum. Seni seviyorum.' },
  smsReply: [{ s: 'arda', t: 'Ben de seni seviyorum anne. Döneceğim, söz.' }],
  board: [
    { s: 'kumru', t: 'Herkes yerine geçsin. Kemerler takılsın. Kaan, kemer.' },
    { s: 'kaan', t: 'Takıyorum, takıyorum! Bir dakika ya.' },
  ],
  objectives: {
    prep: (n) => `Hazırlıkları bitir (${n}/4)`,
    bye: (n) => `Arkadaşlarınla vedalaş (${n}/4)`,
    board: 'Merdivenden Leylek’e bin',
  },
};

// ---------------------------------------------------------------------------
// Bölüm 5 — Kalkış: kokpitten Dünya yörüngesine.
export const CHAPTER5 = {
  title: 'Kalkış',
  place: 'Leylek · Kokpit · 03.00',
  intro: [
    { s: 'kumru', t: 'Sistem kontrolü başlıyor. Pilot, sırayla: önce ana güç, sonra depo çatısı, sonra Kor bağlantısı, en son ateşleme.' },
  ],
  switches: {
    guc: { label: 'ANA GÜÇ', line: { s: 'kumru', t: 'Ana güç açık. Bütün göstergeler çalışıyor.' } },
    cati: { label: 'DEPO ÇATISI', line: { s: 'mert', t: 'Çatıyı açıyorum! Raylar biraz paslı, sabırlı olun.' } },
    kor: { label: 'KOR', line: { s: 'kumru', t: 'Kor bağlandı. Titreşim normal. Kalbim yine atıyor.' } },
    atesle: { label: 'ATEŞLE', line: { s: 'kumru', t: 'Ateşleme. Üç, iki, bir.' } },
  },
  wrong: [{ s: 'kumru', t: 'O düğme şimdi değil, pilot. Sırayı hatırlatayım mı?' }],
  ascent: [
    { s: 'kaan', t: 'Kalkıyoruz! Gerçekten kalkıyoruz!' },
    { s: 'elif', t: 'Mahalle… bak, bizim çatı. Ampuller hâlâ yanıyor.' },
    { s: 'mert', t: 'Gövde dayanıyor! Hadi Leylek, biraz daha dayan.' },
  ],
  clouds: [
    { s: 'zeynep', t: 'Bulutların içindeyiz. Camdan hiçbir şey görünmüyor.' },
    { s: 'kumru', t: 'Yükseklik on iki kilometre. Dış sıcaklık eksi elli altı derece.' },
  ],
  high: [
    { s: 'elif', t: 'Gökyüzü kararıyor. Ne gündüz ne gece, başka bir şey bu.' },
    { s: 'kumru', t: 'Atmosferden çıktık. Yörüngeye girmek için son ateşleme.' },
  ],
  orbit: [
    { s: 'kaan', t: 'Arkadaşlar… Dünya. Şu gördüğümüz Dünya.' },
    { s: 'zeynep', t: 'Kayıt alıyorum. Kimse bize inanmayacak.' },
    { s: 'mert', t: 'Hava bu kadar ince miymiş? Ufukta mavi bir çizgi kadar.' },
    { s: 'elif', t: 'Şurada, sağda. Ay. Kor’un haritasındaki ilk durak.' },
    { s: 'arda', t: 'Kumru, rotayı Ay’a çevir.' },
    { s: 'kumru', t: 'Rota Ay. Tahmini varış üç gün. Uyumanızı öneririm.' },
  ],
  objectives: {
    seq: (lbl) => `Düğmeye bas: ${lbl}`,
    ride: '',
  },
};

export const CHAPTERS = [
  { n: 1, title: CHAPTER1.title, sub: 'Bir yaz gecesi, gökyüzü yarılıyor.' },
  { n: 2, title: CHAPTER2.title, sub: 'Taşı mahalleden kimseye görünmeden geçir.' },
  { n: 3, title: CHAPTER3.title, sub: 'Kor’un sinyali ve Leylek’in yapımı.' },
  { n: 4, title: CHAPTER4.title, sub: 'Son gece. Vedalar.' },
  { n: 5, title: CHAPTER5.title, sub: 'Kokpitten yörüngeye.' },
];
