export const ITEMS = {
  plan1: { n: 'Plan parçası A', d: 'Yırtık bir mimari plandan köşe parçası.', c: '#d9c8a0', g: 'A' },
  plan2: { n: 'Plan parçası B', d: 'Planın orta kısmı. Kenarları uyuyor gibi.', c: '#d9c8a0', g: 'B' },
  plan3: { n: 'Plan parçası C', d: 'Planın son parçası.', c: '#d9c8a0', g: 'C' },
  plan12: { n: 'Plan (A+B)', d: 'İki parça birleşti. Bir parça eksik.', c: '#e8d9b0', g: 'AB' },
  fullplan: { n: 'Tam plan', d: 'Binanın gizli kat planı. Kitaplığın arkasında bir geçit işaretli.', c: '#f2e6c0', g: 'P' },
  battery: { n: 'Pil', d: 'Dolu bir pil.', c: '#7bd08a', g: '+' },
  key: { n: 'Küçük anahtar', d: 'Bir çekmece anahtarı.', c: '#f2c230', g: 'K' },
  torch: { n: 'El feneri (pilsiz)', d: 'Pili yok, yanmıyor.', c: '#8a96b8', g: 'F' },
  torchOn: { n: 'Çalışan fener', d: 'Karanlık yerlerde işe yarar.', c: '#ffe08a', g: 'F+' },
  redcard: { n: 'Kırmızı kart', d: 'Üzerinde ağ içinde göz sembolü var. Bir erişim kartı.', c: '#e0243a', g: 'EK' },
  knife: { n: 'Fırlatma bıçağı', d: 'Dengeli, ince bıçak. Üç tane.', c: '#cfd6ee', g: 'B' },
  seal: { n: 'Mimar\'ın mührü', d: 'Mimar\'ın kişisel mührü. Kimlik kanıtı.', c: '#b08a3a', g: 'M' },
};
export const RECIPES = [
  [['plan1', 'plan2'], 'plan12', 'İki parça yan yana oturdu.'],
  [['plan12', 'plan3'], 'fullplan', 'Plan tamamlandı! Kitaplığın arkasında bir işaret var.'],
  [['torch', 'battery'], 'torchOn', 'Fener yandı. Karanlık odalar için hazırız.'],
];
export const CLUES = {
  note: { n: 'Buruşuk not', d: '"Gizli oda planın arkasında. Işık olmadan girme."' },
  photo: { n: 'Fotoğraf', d: 'Çerçevenin altında el yazısı: "Mart\'ın 14\'ü."' },
  clock: { n: 'Durmuş saat', d: 'Duvar saati 3:15\'te durmuş.' },
  bookshelf: { n: 'Temiz ciltler', d: 'Kitaplıktaki bazı ciltler öbürlerinden daha temiz: sık dokunulmuş.' },
  board: { n: 'Delil panosu', d: 'Pano: Kule\'nin planı, tersane fotoğrafı ve ağ içinde göz sembolü.' },
  cardviz: { n: 'Kartvizit', d: '"Kerem Aksoy — Mimar. Haliç Tersane Ofisi."' },
  diary: { n: 'Günlük', d: 'Ağın yedek sunucuları tersanenin bodrumunda. Kerem Aksoy, ağın tasarımcısı.' },
  code: { n: 'Kasa kodu: 1403', d: 'Fotoğraftaki tarih (14 Mart) + saatin durduğu an: kasa kodu 14 03.' },
  place: { n: 'Yer: Haliç Tersane', d: 'Kartvizit + pano: Mimar\'ın asıl çalıştığı yer eski tersane.' },
};
export const CLUE_RECIPES = [
  [['photo', 'clock'], 'code', 'Kasa kodu çıktı: 1403!'],
  [['cardviz', 'board'], 'place', 'Mimar\'ın saklandığı yer: Haliç Tersane.'],
];
export const INTRO = [
  ['narr', 'Kızıl Ağ çöktü ama dosyada bir isim kaldı: "Mimar".'],
  ['elif', 'Ağın tasarımcısı o. Eski atölyesi bu binada, Sessiz. Her şeye dokun, bir şey kaçırma.'],
  ['agent', 'Bakalım ne bırakmış. Önce atölyeye bakalım.'],
];
export const OUTRO = [
  ['agent', 'Günlükte her şey var. Ağın yedek merkezi Haliç Tersane\'nin bodrumunda.'],
  ['elif', 'Kerem Aksoy... O zamanlar benim hocamdı. Şifre sistemlerini bana o öğretti.'],
  ['narr', 'Dosya kapandı. Ama Mimar hâlâ özgür. Sonraki durak: Haliç Tersane.'],
];
