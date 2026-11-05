// Hapisten Kaçış, 1. bölüm "Hücre". Kurgusal kişi ve yerler. Konuşmacılar: deniz (oyuncu), kerem, gardiyan
export const SUB = {
  intro: [
    { s: 'kerem', t: 'Deniz? Uyanık mısın? Elektrikler gitti, bütün kilitler boşta.', d: 4.5 },
    { s: 'kerem', t: 'Kapı manyetik kilitliydi, şimdi sadece mandalı kaldı. Masadaki kaşığı al.', d: 4.5 },
  ],
  spoon: [{ s: 'deniz', t: 'Sapı ince. Mandala yeter.', d: 3 }],
  lockStart: [{ s: 'kerem', t: 'Yavaş. Gardiyan koridorun ucunda dolaşıyor, sesi duyarsa gelir.', d: 4 }],
  open: [
    { s: 'kerem', t: 'Oldu! Fenere dikkat et. Sütunların arkasına geç, çömelince daha az görünürsün.', d: 5 },
    { s: 'kerem', t: 'Koridorun sonunda acil çıkış var. Kolu çek, ben seni orada beklerim.', d: 5 },
  ],
  caught: [
    { s: 'gardiyan', t: 'Dur! Nereye?!', d: 2.5 },
    { s: 'kerem', t: 'Yine başa! Sabırlı ol Deniz.', d: 3 },
  ],
  warn: [{ s: 'kerem', t: 'Fener sana dönüyor, saklan!', d: 2.5 }],
  exit: [
    { s: 'deniz', t: 'Kol sıkışmış… çekiyorum.', d: 3 },
    { s: 'kerem', t: 'İşte bu! Merdiven bizi çatıya çıkarır. Revire gitmeden olmaz, kart orada.', d: 5 },
  ],
};
export const NAMES = { deniz: 'Deniz', kerem: 'Kerem', gardiyan: 'Gardiyan' };
export const COLS = { deniz: '#8fd3ff', kerem: '#ffd166', gardiyan: '#ff7a6a' };
export const OBJ = ['Masadaki kaşığı al', 'Hücre kapısının mandalını zorla', 'Gardiyana yakalanmadan koridorun sonuna git', 'Acil çıkış kolunu çek'];
Object.assign(SUB, {
  zoneRevir: [
    { s: 'kerem', t: 'Revir burası. Doktor masasında, kart da orada. Ama ona yaklaşırsan seni görür.', d: 5 },
    { s: 'kerem', t: 'Sağdaki boruya vur, merak edip bakmaya gitsin. Sen o arada kartı al.', d: 5 },
  ],
  pipe: [{ s: 'deniz', t: 'Boruya vurdum. Doktor kalktı, bakmaya gidiyor.', d: 3.5 }],
  doctorBack: [{ s: 'kerem', t: 'Doktor dönüyor, saklan!', d: 2.5 }],
  card: [{ s: 'deniz', t: 'Kart bende. Kapının okuyucusuna götürmeliyim.', d: 3.5 }],
  reader: [{ s: 'kerem', t: 'Yeşil yandı! Mutfaktan geçip dışarı çıkacağız.', d: 4 }],
  caughtDoctor: [{ s: 'doktor', t: 'Burada ne işin var?! Gardiyan!', d: 2.5 }, { s: 'kerem', t: 'Yine başa. Doktor çok dikkatli.', d: 3 }],
  zoneMutfak: [
    { s: 'kerem', t: 'Mutfak. Bir gardiyan dolaşıyor, tezgâhların arkasında çömel.', d: 5 },
    { s: 'kerem', t: 'Dışarıdaki çit tel örgü. Kerpeten lazım, köşedeki dolapta olmalı.', d: 5 },
  ],
  pliers: [{ s: 'deniz', t: 'Kerpeten tamam. Şimdi havalandırma kapağı.', d: 3.5 }],
  wheel: [{ s: 'kerem', t: 'Çark gıcırdıyor, sesi duymasın!', d: 3 }],
  hatch: [{ s: 'kerem', t: 'Açıldı. Dışarısı avlu. Projektör bütün yeri tarıyor, sütun ve sandık arkası güvenli.', d: 6 }],
  zoneAvlu: [{ s: 'kerem', t: 'Yağmur sesi bizi örter ama ışık örtmez. Minibüs çitin ötesinde, ben oradayım.', d: 6 }],
  fence: [{ s: 'deniz', t: 'Tel kesildi. Geçiyorum.', d: 3 }],
  end: [
    { s: 'kerem', t: 'Başardık Deniz! Bu kanıt artık bende, merak etme.', d: 4 },
    { s: 'deniz', t: 'Ver bana, ben saklarım. Onun için bu kadar yolu geldik.', d: 4 },
    { s: 'kerem', t: 'Biliyor musun… sana hiç söylemedim. Seni içeri attıran kişi benim.', d: 5 },
    { s: 'kerem', t: 'Ama merak etme, buradan canlı çıkacaksın. Şimdilik.', d: 4.5 },
  ],
});
NAMES.doktor = 'Doktor';
COLS.doktor = '#9fe3c4';

// Sinematik kartlar: { t: metin, d: süre(sn), cam: kamera numarası }
export const INTRO_CARDS = [
  { t: 'Üç ay önce.', big: true, d: 3, cam: 0 },
  { t: 'Deniz Aksoy, belediyede inşaat mühendisiydi. Bir ihalede sahte imzaları fark etti ve raporunu hazırladı.', d: 6, cam: 0 },
  { t: 'Raporu vermeden bir gün önce evine polis geldi. İmzaları atan kişi, iş insanı Cemal Kurtuluş’tu. Dosyaya Deniz’in adı yazıldı.', d: 7, cam: 1 },
  { t: 'Sahte bir banka dekontu yetti. Mahkeme on iki yıl verdi. Kimse onu dinlemedi.', d: 6, cam: 1 },
  { t: 'Taşkale Cezaevi’nde hücre arkadaşı Kerem’di. Eskiden Cemal’in muhasebecisiydi. Gerçek defteri saklıyordu.', d: 7, cam: 2 },
  { t: 'Yarın sabah Deniz, ağır güvenlikli bir cezaevine sevk edilecek. Defter mahkemeye ulaşmazsa bir daha kimse ona inanmayacak.', d: 7, cam: 2 },
  { t: 'Bu gece büyük bir fırtına var. Jeneratör düşünce kilitler boşa çıkacak. Kerem’in planı bu.', d: 6, cam: 3 },
];
export const ZONE_CARDS = {
  revir: { title: 'REVİR', time: '02:14', t: 'Elektrikler hâlâ yok. Kart doktorun masasında.' },
  mutfak: { title: 'MUTFAK', time: '02:31', t: 'Yağmurun sesi duvarları aşıyor. Çıkış çok yakın.' },
  avlu: { title: 'AVLU', time: '02:47', t: 'Projektör bütün yeri tarıyor. Çitin ötesinde minibüs.' },
};
