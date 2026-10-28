// Bölüm listesi. v0.1'de yalnızca Bölüm 1 oynanabilir; diğerleri planlanmış (kilitli).
export const LEVELS = [
  {
    id: 1,
    title: 'Sessiz Vadi',
    tag: 'Keşif · Öğretici',
    playable: true,
    summary: 'Karakoldan çık, gözetleme tepesinden çiftliği dürbünle doğrula. Vadide kaybolan çobanı bul.',
    brief: [
      'Yüzbaşı Selim Er ile konuş, teçhizatını al.',
      'Atış alanında üç hedefi vur, şarjör değiştir.',
      'Gözetleme Tepesi\'nden üç hedefi dürbünle doğrula.',
      'İsteğe bağlı: Hasan Dayı\'yı bul ve karakola getir.',
      'Ekibinle birlikte karakola dön.',
    ],
    time: 'Gece · 02:40',
    weather: 'Açık, hafif rüzgâr',
  },
  { id: 2, title: 'Terk Edilmiş Köy', tag: 'Sivil koruma', playable: false, summary: 'Köyde saklanan sivilleri bul, koru ve tahliye noktasına ulaştır.' },
  { id: 3, title: 'Son Çağrı', tag: 'Karanlık tesis', playable: false, summary: 'Rehineler karanlık bir tesiste. Ses ipuçlarını ve çevreyi kullanarak ilerle.' },
  { id: 4, title: 'Tahliye', tag: 'Konvoy', playable: false, summary: 'Kurtarılanları güvenli bölgeye taşırken yeni bir kriz.' },
  { id: 5, title: 'Son Karakol', tag: 'Final', playable: false, summary: 'Önceki bölümlerdeki kararların sonuçları.' },
];
