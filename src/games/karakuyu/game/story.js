// Tüm oyun metinleri tek yerde.

export const INTRO = [
  'Sivas yaylası. Ekim, 2004.',
  'Dedem Hasan öldüğünde eşyalarının arasından bana yazılmış, hiç postalanmamış bir mektup çıktı.',
  '"Deniz, Karakuyu\'ya git. Taşları yerine koymadan gitme. Ne duyarsan duy, arkana bakma."',
  'Köy, ben doğmadan bir yıl önce boşalmış. Haritalarda bile yok.',
];

export const PAGES = {
  page1: {
    title: 'Günlükten kopmuş sayfa — I',
    text: `Ağustos 1986.

Kuyu kurudu. Üç yıldır yağmur yok. Muhtar Rıza ve gençler, kuyunun ağzındaki üç taşı söktüler. Ben "dokunmayın" dedim; dinlemediler.

Babam anlatırdı: o taşlara atalarımız üç nakış kazımış, kuyunun dibindekini uyutsun diye. Suyun bir sahibi vardır, derdi. Su verir ama karşılığını da alır.

Taşları söktükleri gece kuyu doldu. Bütün köy sevindi.

Ertesi gece Ayşe Hanım'ın kızı, adının çağrıldığını söyleyip yataktan kalktı. Sabah kuyunun başında yalnız terliklerini bulduk.

Taşlar hâlâ kuyunun başında. Nakışları kazıyıp sırasını unuttular. Ben sırayı yazacağım; ama aynı sayfaya değil. O okuyabilir.`,
  },
  page2: {
    title: 'Günlükten kopmuş sayfa — II',
    text: `Eylül 1986.

Ona Kuyu Anası diyorlar artık. Geceleri ıslak ayak sesi duyuluyor. Işığa gelir, sese gelir. Koşan yakalanır. Yüklüğe saklanan sabaha çıkar.

Kuyunun üç taşı üç yöne bakar: köye, dağa, mezarlığa.

Birincisi: köye bakan taşa GÖZ. Nazar gibi, ki köyün evlerine yol bulamasın.

Muhtarın evinin anahtarını buraya bırakıyorum. Sırasının geri kalanı orada, onun masasında. Rıza artık o evde yaşamıyor. Kimse yaşamıyor.`,
  },
  page3: {
    title: 'Günlükten kopmuş sayfa — III',
    text: `Ekim 1986. Son sayfa.

Dağa bakan taşa KOÇBOYNUZU. Güç, ki geri çıkamasın.
Mezarlığa bakan taşa BEREKET. Ölülerimize, ki onları rahat bıraksın.

Göz köye, koç dağa, bereket mezara. Taşları çevirince kuyu bir kez daha uyanır. Seni son kez çağırır.

O zaman yürü. Koşma. Sakın arkana bakma; arkandakine bakan ona gider.

Ben yapamadım. Ben dönüp baktım, Gülsüm'üm diye. O değildi.`,
  },
};

export const MOTIFS = [
  { id: 'goz', name: 'Göz (Nazar)' },
  { id: 'koc', name: 'Koçboynuzu' },
  { id: 'bereket', name: 'Bereket' },
  { id: 'yildiz', name: 'Yıldız' },
  { id: 'suyolu', name: 'Su Yolu' },
];

export const SOLUTION = { north: 'goz', east: 'koc', west: 'bereket' };

export const OBJECTIVES = {
  enter: 'Köye gir. Dedenin evini bul.',
  page1: 'Dedenin günlüğünden kalan sayfaları ara. Ahıra bak.',
  page2: 'Anahtarla muhtarın evine gir (köyün kuzeyi).',
  page3: 'Kuyunun taşlarını doğru nakışlara çevir.',
  sealed: 'Arabaya dön. Yürü. ARKANA BAKMA.',
  end: '',
};

export const DEATH_LINES = [
  'Adını duydun. Cevap verdin.',
  'Islak bir el omzuna dokundu.',
  'Kuyunun dibi çok soğuk.',
  'Karakuyu bir kişi daha aldı.',
];

export const DEATH_LOOKBACK = 'Arkana baktın.';

export const ENDING = [
  'Araba çalıştığında ilk kez rüzgâr kesildi.',
  'Dikiz aynasına bakmadım. Köy yolundan asfalta çıkana kadar bakmadım.',
  'Sabah ezanında bir benzinlikte durdum. Ellerim titriyordu.',
  'Sonra baktım.',
  'Arka koltukta, deri döşemenin üstünde ıslak bir iz vardı. İki avuç kadar. Kuruyordu.',
];
