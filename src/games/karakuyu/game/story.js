// Tüm oyun metinleri tek yerde.
// Kaynak: Anadolu halk inançlarındaki cin motifleri — "bizden iyiler" örtmecesi, ıssız yer/kuyu/mezarlık,
// demirden korkma, akan sudan geçememe, horoz sesiyle çekilme, ters basan ayaklar, kılık değiştirme
// (kara kedi), "destur" demeden sıcak su dökmenin cin yavrusunu yaktığı inancı ve cin düğünü anlatıları.
// Hikâye ve karakterler kurgudur.

export const INTRO = [
  'Sivas yaylası. Ekim, 2004.',
  'Dedem Hasan öldüğünde eşyalarının arasından bana yazılmış, hiç postalanmamış bir mektup çıktı.',
  '"Deniz, Karakuyu\'ya git. Onların hakkını ver, taşları yerine koy. Ne duyarsan duy, arkana bakma."',
  'Köy, ben doğmadan bir yıl önce boşalmış. Haritalarda bile yok.',
];

export const PAGES = {
  page1: {
    title: 'Günlükten kopmuş sayfa — I',
    text: `Ağustos 1986.

Kuyu kurudu. Üç yıldır yağmur yok. Muhtar Rıza ve gençler, kuyunun ağzındaki üç taşı söktüler. Ben "dokunmayın" dedim; dinlemediler.

Babam anlatırdı: kuyu boş değildir. Oranın sahipleri vardır. Adlarını anmayız; "bizden iyiler" deriz. Atalarımız taşlara üç nakış kazımış ki onlar aşağıda kalsın, biz yukarıda.

Taşları söktükleri akşam Ayşe Hanım kazandaki kaynar suyu kuyuya döktü. "Destur" demedi. Kuyunun dibinden bir çocuk ağladı. Hepimiz duyduk, kimse bir şey demedi.

Ertesi gece Ayşe Hanım'ın kızı Elif, adının çağrıldığını söyleyip yataktan kalktı. Sabah kuyunun başında yalnız terliklerini bulduk.

Cana can, dedi yaşlılar. Ben sırayı yazacağım; ama aynı sayfaya değil. O okuyabilir.`,
  },
  page2: {
    title: 'Günlükten kopmuş sayfa — II',
    text: `Eylül 1986.

Geceleri köyde davul zurna çalıyor. Oysa köyde düğün yok. Ses mezarlık tarafından geliyor. Gidenler dönmedi. Çağırırlarsa gitme.

Bildiklerimi yazıyorum, unutmayayım:
— Işığa gelir, sese gelir. Koşan yakalanır. Yüklüğe, samana saklanan sabaha çıkar.
— Demirden korkar. Cebinde demir olanı tutamaz; ama demir bir kere işe yarar, sonra küflenir.
— Akan suyu geçemez. Köy yolundaki dereyi geçen kurtulur.
— Ayakları ters basar. İzleri senden kaçıyor gibi görünür; sana geliyordur.
— Kılık değiştirir. Kara kedi görürsen gözünü kaçırma, yaklaşma.

Kuyunun üç taşı üç yöne bakar: köye, dağa, mezarlığa.
Birincisi: köye bakan taşa GÖZ. Nazar gibi, ki köyün evlerine yol bulamasın.

Muhtarın evinin anahtarını buraya bırakıyorum. Sırasının geri kalanı orada, onun masasında.`,
  },
  page3: {
    title: 'Günlükten kopmuş sayfa — III',
    text: `Ekim 1986. Son sayfa.

Dağa bakan taşa KOÇBOYNUZU. Güç, ki geri çıkamasın.
Mezarlığa bakan taşa BEREKET. Ölülerimize, ki onları rahat bıraksın.

Ama taşlar tek başına yetmez. Yanan yavrularının hakkı ödenmedi. Kuyunun başına tuz ve ekmek bırakılmalı, "destur" denmeli. Hakkı ödenmeyen, taş da olsa kapıyı aralık bırakır; peşine takılır.

Tuzu evimde, ocağın yanında bulursun. Ekmeği Rıza'nın sofrasına koydum; o yemeye cesaret edemedi.

Göz köye, koç dağa, bereket mezara. Taşları çevirince kuyu bir kez daha uyanır, seni son kez çağırır. O zaman yürü. Koşma. Sakın arkana bakma; dereyi geçene kadar.

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
  page3: 'Tuz ve ekmeği kuyuya bırak, sonra taşları doğru nakışlara çevir.',
  page3b: 'Kuyunun taşlarını doğru nakışlara çevir.',
  sealed: 'Köy yolundan yürü, dereyi geç. ARKANA BAKMA.',
  crossed: 'Dereyi geçtin. Arabaya bin.',
  end: '',
};

// Oyun içinde bulunan nesneler
export const ITEMS = {
  item_cak: { name: 'Dedemin çakısı', prompt: 'Çakıyı al', toast: 'Dedemin demir çakısı. Babam "demir taşıyanı tutamazlar" derdi.', iron: true },
  item_nal: { name: 'Paslı at nalı', prompt: 'Nalı al', toast: 'Mezarlık duvarına çakılmış eski bir nal. Demir. Cebime koydum.', iron: true },
  item_tuz: { name: 'Tuz', prompt: 'Tuz kesesini al', toast: 'Ocağın yanında bez bir kese. İçinde kaya tuzu.' },
  item_ekmek: { name: 'Ekmek', prompt: 'Ekmeği al', toast: 'Bezine sarılmış, taş gibi kurumuş bir yufka. Kimse dokunmamış.' },
};

export const DEATH_LINES = [
  'Adını duydun. Cevap verdin.',
  'Islak bir el omzuna dokundu.',
  'Kuyunun dibi çok soğuk.',
  'Karakuyu bir kişi daha aldı.',
];

export const DEATH_LOOKBACK = 'Arkana baktın.';
export const DEATH_WEDDING = 'Düğüne katıldın. Davul hiç susmadı.';

// Yarım son: hak ödenmedi, bir şey seninle geldi
export const ENDING = [
  'Araba çalıştığında ilk kez rüzgâr kesildi.',
  'Dikiz aynasına bakmadım. Köy yolundan asfalta çıkana kadar bakmadım.',
  'Sabah ezanında bir benzinlikte durdum. Ellerim titriyordu.',
  'Sonra baktım.',
  'Arka koltukta, deri döşemenin üstünde ıslak bir iz vardı. İki avuç kadar. Kuruyordu.',
  'Bir şeyi eksik bırakmıştım. Onların hakkını.',
];

// Gerçek son: tuz ve ekmek bırakıldı, taşlar yerinde, dere geçildi
export const ENDING_TRUE = [
  'Araba çalıştığında köyün içinden bir horoz öttü. Karakuyu\'da yirmi yıldır horoz yoktu.',
  'Davul sustu. Dikiz aynasında, kuyunun başında küçük bir gölge duruyordu. El salladı mı, bilmiyorum.',
  'Sabah ezanında bir benzinlikte durdum ve ilk kez arkama baktım.',
  'Arka koltukta küçük, kuru bir çift terlik vardı. Çocuk terliği.',
  'On sekiz yıl sonra Elif\'in terlikleri eve dönmüştü.',
  'Dedem haklıymış. Su verir, karşılığını alır. Ama hakkını verene dokunmaz.',
];

// Günlükte "Bildiklerim" başlığı altında görünen kurallar (sayfalar bulundukça açılır)
export const LORE = [
  { need: 'page1', text: 'Kuyunun sahipleri var. Adları anılmaz: "bizden iyiler".' },
  { need: 'page1', text: 'Destur demeden dökülen kaynar su onların yavrusunu yaktı.' },
  { need: 'page2', text: 'Işığa ve sese gelir. Saklanan sabaha çıkar.' },
  { need: 'page2', text: 'Demirden korkar: demir taşıyanı bir kez tutamaz.' },
  { need: 'page2', text: 'Akan suyu geçemez. Köy yolundaki dere.' },
  { need: 'page2', text: 'Ayakları ters basar. Kılık değiştirir: kara kedi.' },
  { need: 'page2', text: 'Mezarlıktan gelen düğün sesine gitme.' },
  { need: 'page3', text: 'Hakkı: kuyunun başına tuz ve ekmek, "destur".' },
  { need: 'page3', text: 'Taşlar çevrilince arkandan gelir. Dereyi geçene kadar bakma.' },
];
