// Bölüm 2 — "Gülsüm": Sivas'ta ninenin taş evi, Karakuyu dönüşünden üç gün sonra.
// Kaynak motifler: cin tutması (çarpılma), ters basan ayak, eşiğe tuz ve ekmek bırakma, "destur",
// kapı üstüne asılan demir (makas/nal), horoz sesiyle çekilme. Hikâye ve karakterler kurgudur.

export const INTRO2 = [
  'Sivas, Kale mahallesi. Üç gün sonra.',
  'Dedemin ölümünden beri ninem Gülsüm o koca taş evde yalnız. Her akşam beni yemeğe çağırıyor.',
  'Ona Karakuyu’ya gittiğimi söylemedim.',
  'Bu akşam kapıyı açtığında eşikte ıslak bir iz vardı. İki avuç kadar. Kuruyordu.',
];

// Konuşmacılar: deniz (iç ses), nine (Gülsüm, olağan), cin (Gülsüm'ün ağzından konuşan)
export const LINES2 = {
  welcome: [
    ['nine', 'Geldin mi kuzum? Gir, üşüme. Çorbayı ısıttım.'],
    ['nine', 'Sen sofrayı kur, ben ekmeği getiriyorum.'],
  ],
  sofra: [['narrator', 'Sini, kaşıklar, bez. Dedem hep köşedeki minderde otururdu.']],
  testi: [['nine', 'Testiyi de doldur kuzum. Musluk mutfakta.']],
  testiDone: [['narrator', 'Su buz gibi. Musluk bir an hırıldadı, sonra durdu.']],
  dinner: [
    ['nine', 'Otur bakalım. Sen bu akşam bir tuhafsın.'],
    ['nine', 'Deden de o köyden döndüğü gece böyleydi.'],
    ['nine', 'Sen gittin, değil mi? Karakuyu’ya. Üstünde su kokusu var.'],
    ['narrator', 'Ne diyeceğimi bilemedim.'],
    ['nine', 'Ekmeği unuttum. Dur, getireyim.'],
  ],
  blackout: [
    ['narrator', 'Elektrik gitti. Lambayı yaktım.'],
    ['narrator', 'Mutfaktan bir ses geliyor. Ninem bir türkü mırıldanıyor. Düğün türküsü.'],
  ],
  corner: [
    ['narrator', 'Nine?'],
    ['cin', 'Hakkımızı getirmedin, Deniz.'],
    ['cin', 'Biz de seninle geldik.'],
  ],
  notePrompt: [['narrator', 'Dedemin odası. Sandığında bir şey olmalı. Hep kilitli tutardı.']],
  afterNote: [['narrator', 'Tuz, ekmek, demir. Eşiğe. Sonra destur. Sonra sabahı beklemek.']],
  destur: [
    ['narrator', 'Destur.'],
    ['cin', 'Az kaldı, Deniz. Horoz ötene kadar çok uzun bir gece.'],
  ],
  dawn: [
    ['narrator', 'Horoz öttü.'],
    ['nine', 'Kuzum… Niye yerdeyim ben? Ekmeği getirecektim.'],
  ],
  taunts: [
    ['cin', 'Deniz… Ninen burada. Gel.'],
    ['cin', 'Deden de saklanırdı. Bak ne oldu.'],
    ['cin', 'Arkana bakma, demişti. Sen hep bakarsın.'],
    ['cin', 'Su verdik, Deniz. Karşılığını alırız.'],
  ],
  caught: [['cin', 'Buldum seni.']],
  repel: [['narrator', 'Makası kaldırdım. Durdu. Geri çekildi. Demir bir kez işe yarar.']],
  hintSofra: [['nine', 'Sofrayı kur kuzum, sini duvarın dibinde.']],
  hintSit: [['nine', 'Otur sen, geliyorum.']],
};

// İç sesle okunan kısa notlar
export const SAY2 = {
  backward: 'Geri geri yürüyor. Sırtı bana dönük. Başı omzunun üstünden bana bakıyor.',
  needItems: 'Tuz, ekmek ve demir lazım. Dedem öyle yazmış.',
  bolted: 'Kapı sürgülü. Ninem geceleri hep sürgüler.',
};

export const PAGE4 = {
  title: 'Dedemin defteri — IV',
  text: `Seksen altının kasımı.

O gece köy yolunda Gülsüm'ün sesini arkamdan duydum. Döndüm. O değildi.
Gülsüm o gece Sivas'taydı, evde, beni bekliyordu.

Ama o sesi bir yerde bırakmadım. Ses benimle geldi, Gülsüm'e yerleşti.

Bazı geceler Gülsüm başka türlü yürür. Geri geri. Ayakları ters basar. Başını bir yana eğer, köşeye dönüp düğün türküsü mırıldanır. Adımı onun sesiyle değil, kuyunun sesiyle söyler.

O gecelerde yapılacak üç iş var:
— Eşiğe bir avuç tuz.
— Yanına bir parça ekmek.
— Kapının üstüne demir: Gülsüm'ün dikiş makası.

Sonra "destur" demeli ve sabahı beklemeli. Horoz ötünce bırakır. O gece onu görmesin beni; sesine gelir, ışığına gelir. Yüklükte sabahlarım.

Makas bir kere işe yarar. Ona doğru tutarsan geri çekilir.

Kuyunun taşları yerinde durdukça bu kadarı yeter. Sen gitme oraya, Deniz.`,
};

export const OBJECTIVES2 = {
  sofra: 'Salondaki sofrayı kur.',
  testi: 'Mutfaktaki musluktan testiyi doldur, sofraya götür.',
  sit: 'Sofraya otur.',
  blackout: 'Mutfağa bak. Ninene seslen.',
  note: 'Ninenden uzak dur. Dedenin odasındaki sandığa bak.',
  items: (have) => `Eşiğe konacaklar: ${have}`,
  door: 'Ön kapının eşiğine git: tuzu, ekmeği koy, makası kapının üstüne as.',
  destur: '“Destur” de.',
  dawn: 'Horoz ötene kadar dayan. Yüklüğe saklanabilirsin.',
  end: '',
};

export const ITEMS2 = {
  tuz: { name: 'Tuz', prompt: 'Tuz kavanozunu al', toast: 'Dolabın en üst rafında, dedemin yazısıyla: TUZ.' },
  ekmek: { name: 'Ekmek', prompt: 'Ekmeği al', toast: 'Ninemin getirmeye gittiği ekmek. Somun, yarısı ıslak.' },
  makas: { name: 'Dikiş makası', prompt: 'Makası al', toast: 'Ninemin dikiş sepetindeki büyük makas. Demir, soğuk.', iron: true },
};

export const DEATH2 = [
  'Ninenin elleri buz gibiydi.',
  'Düğün türküsü kulağının dibinde bitti.',
  'Ters ayak izleri seninkilerin üstüne bastı.',
];

export const ENDING2 = [
  'Ninem eşikte, tuzun yanına çökmüştü. Uyandığında "kuzum, niye yerdeyim" dedi. Ona hiçbir şey anlatmadım.',
  'Sabah birlikte çorbayı ısıttık. Dedemin minderine kimse oturmadı.',
  'Öğleden sonra eşikteki ekmeği almaya gittim. Yoktu.',
  'Tuzun üstünde küçük, ıslak, ters ayak izleri vardı. Kapıdan dışarı doğru.',
  'Bu sefer hakkını almıştı. Ama defterin son satırı aklımdan çıkmıyor: "Kuyunun taşları yerinde durdukça."',
];

// Seslendirme için tüm satırlar (konuşmacı, cümle) — anlatıcı satırları cümle cümle bölünür
export function ALL_LINES2(split) {
  const out = [];
  for (const arr of Object.values(LINES2)) for (const [s, t] of arr) for (const p of split(t)) out.push([s, p]);
  for (const t of [...INTRO2, ...ENDING2]) for (const p of split(t)) out.push(['narrator', p]);
  for (const t of DEATH2) for (const p of split(t)) out.push(['death', p]);
  for (const t of [...Object.values(SAY2), ...Object.values(ITEMS2).map((i) => i.toast), PAGE4.text]) for (const p of split(t)) out.push(['narrator', p]);
  return out;
}
