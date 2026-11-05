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
