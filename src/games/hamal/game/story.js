// Hamal — İstanbul, 1974. Kişiler ve olaylar kurgudur.

export const SPEAKERS = {
  kemal: { name: 'Kemal', color: '#f2c879' },
  reis: { name: 'Hamallar kâhyası Reis', color: '#e8a36a' },
  hayri: { name: 'Bakkal Hayri', color: '#9fd0a0' },
  eleni: { name: 'Madam Eleni', color: '#d9a8d8' },
  nuri: { name: 'Doktor Nuri Bey', color: '#a8c8e8' },
  nazife: { name: 'Nazife Hanım', color: '#e8b0a0' },
  leyla: { name: 'Leyla Hanım', color: '#e8d8a0' },
};

export const INTRO = [
  'İstanbul, bin dokuz yüz yetmiş dört. Karaköy iskelesi.',
  'Ben Kemal. On dokuz yaşındayım, iskelenin en genç hamalıyım.',
  'Anamın ilaç parası bu akşama kadar üç yüz lira. Reis’ten avans aldım; bugün beş iş çıkarırsam borç kapanır.',
  'Semer sırtımda, urgan elimde. Yokuş da önümde.',
];

export const TARGET = 300;

// Yük düzeni: semer yüzeyine göre (x sağ, y yukarı, z arka). Ölçüler metre.
export const JOBS = [
  {
    id: 1,
    title: 'Dört kasa domates',
    to: 'bakkal',
    pay: 40,
    time: 170,
    brief: [
      ['reis', 'Kemal! Hayri’nin dükkânına dört kasa domates. Yüksek Kaldırım’dan çık, en üstte sağda.'],
      ['reis', 'Acele etme oğlum. Domates ezilirse Hayri parasını vermez.'],
    ],
    tips: ['Yük sallanınca ters yöne yaslan: fare, ok tuşları ya da sağdaki DENGE.', 'Merdivende her basamak yükü sarsar. Yavaş çık.'],
    load: [
      { kind: 'tomato', p: [-0.2, 0, 0], ry: 0 },
      { kind: 'tomato', p: [0.2, 0, 0], ry: 0 },
      { kind: 'tomato', p: [-0.2, 0.36, 0], ry: 0 },
      { kind: 'tomato', p: [0.2, 0.36, 0], ry: 0 },
    ],
    done: [
      ['hayri', 'Gel Kemal’im gel! Hiç ezilmemiş, maşallah. Al bakalım kırk lira.'],
      ['kemal', 'Kırk lira. Daha iki yüz altmış var.'],
    ],
    doneBad: [['hayri', 'Bu ne hal oğlum, yarısı salça olmuş! Neyse, verdiğim kadar.']],
  },
  {
    id: 2,
    title: 'Madam Eleni’nin çay takımı ve kanaryası',
    to: 'apartman',
    pay: 60,
    time: 200,
    brief: [
      ['reis', 'Madam Eleni’nin çay takımı Paris’ten gelmiş. Kanaryası da yanında. Yokuşun başındaki sarı apartman.'],
      ['reis', 'İkisi de kırılırsa ikimizi birden asar, ona göre.'],
    ],
    tips: ['Kırılacak eşya yere düşerse paramparça olur.', 'Kafes hafif ama uzun: rüzgârı ve dönüşleri sever.'],
    load: [
      { kind: 'teabox', p: [0, 0, 0], ry: 0 },
      { kind: 'cage', p: [0, 0.32, 0.02], ry: 0 },
    ],
    done: [
      ['eleni', 'Ah, mon Dieu! Fincanlarım sağlam, Kuçuk da şarkı söylüyor. Mersi, Kemal.'],
      ['kemal', 'Kanarya da yol boyu sövdü durdu bana, Madam.'],
    ],
    doneBad: [['eleni', 'Fincanlarımın yarısı yok! Anneannemden kalmaydı… Al paranı, git.']],
  },
  {
    id: 3,
    title: 'Doktor Bey’in buzdolabı',
    to: 'doktor',
    pay: 90,
    time: 260,
    brief: [
      ['reis', 'Doktor Nuri Bey yeni buzdolabı almış. Kamondo Merdivenleri’nden çıkacaksın, Galata meydanının doğusu.'],
      ['reis', 'Uzun yük boyunu sever. Bir yana yattı mı toplayamazsın.'],
    ],
    tips: ['Uzun yükler kendiliğinden devrilmek ister. Durmadan küçük düzeltmeler yap.', 'Kamondo’nun merdivenleri dik: yavaş çık.'],
    load: [{ kind: 'fridge', p: [0, 0, 0.02], ry: 0 }],
    done: [
      ['nuri', 'Aferin evladım. Hastaneye bile böyle dikkatli taşımıyorlar. Doksan lira, bir de buz gibi su.'],
      ['kemal', 'Su iyi geldi, Doktor Bey. Allah razı olsun.'],
    ],
    doneBad: [['nuri', 'Kapısı yamulmuş… Kapanmıyor şimdi bu. Neyse, emeğine sayalım.']],
  },
  {
    id: 4,
    title: 'Çeyiz',
    to: 'dugun',
    pay: 80,
    time: 280,
    wind: true,
    brief: [
      ['reis', 'Yarın Galata’da düğün var. Kızın çeyizi: valizler, sepet, sandalye, kilim, bir de televizyon.'],
      ['reis', 'Bugün poyraz var. Yığın yüksek, rüzgâr seni yelken gibi iter.'],
    ],
    tips: ['Rüzgâr esince çamaşırlar havalanır: o yana doğru yaslanmaya hazır ol.', 'Televizyon kırılırsa bütün düğün sana küser.'],
    load: [
      { kind: 'suitcase', p: [0, 0, 0], ry: 0 },
      { kind: 'suitcase', p: [0, 0.27, 0], ry: 0.08 },
      { kind: 'tv', p: [0, 0.54, 0.02], ry: 0 },
      { kind: 'kilim', p: [0, 1.06, 0.12], ry: Math.PI / 2 },
      { kind: 'basket', p: [0, 1.06, -0.22], ry: 0 },
    ],
    done: [
      ['nazife', 'Kemal oğlum, gözünü seveyim! Televizyon sağ salim. Kız ağlıyor sevinçten, al seksen lira.'],
      ['kemal', 'Allah mesut etsin, Nazife Hanım.'],
    ],
    doneBad: [['nazife', 'Kızın çeyizi sokakta mı kaldı? Neyse ki düğün yarın, toparlarız… Al şunu.']],
  },
  {
    id: 5,
    title: 'Galata konağına piyano',
    to: 'konak',
    pay: 150,
    time: 320,
    final: true,
    brief: [
      ['reis', 'Son iş. Kimse almadı, sana kaldı: Leyla Hanım’ın piyanosu. Kulenin arkasındaki konak.'],
      ['reis', 'Yüz elli lira. Bunu çıkarırsan ananın ilacı cebinde.'],
      ['kemal', 'Yüz kırk kilo. Bismillah.'],
    ],
    tips: ['Piyano ağır: hızlanıp yavaşlamak dengeyi bozar. Sabit yürü.', 'Kalabalığa çarpma; her çarpışma bir sarsıntı.'],
    load: [{ kind: 'piano', p: [0, 0, 0.04], ry: 0 }],
    done: [
      ['leyla', 'Ses kutusu yerinde, tuşlar yerinde. Babam bu piyanoyla bana Şopen çalardı. Teşekkür ederim, delikanlı.'],
      ['kemal', 'Bir şey çalar mısınız, Leyla Hanım? Merdivenlerde kulağıma hep bir ses geliyordu.'],
    ],
    doneBad: [['leyla', 'Akordu bozulmuş ama… ayakta. Bu da bir şeydir. Buyurun.']],
  },
];

export const ENDING_GOOD = [
  'Akşam ezanında Reis parayı saydı, avansı düştü. Cebimde üç yüz liradan fazla kaldı.',
  'Eczaneden çıktığımda Galata Kulesi’nin ışıkları yanıyordu.',
  'Kulenin dibindeki konaktan bir piyano sesi geliyordu. Sırtımdaki semer o akşam hiç ağır gelmedi.',
];
export const ENDING_SHORT = [
  'Akşam ezanında Reis parayı saydı. Eksik kaldı.',
  '“Yarın yine gel,” dedi, “yokuş kaçmıyor.” Kalanı kendi cebinden verdi; benden alacağını yazdı.',
  'Eczaneden çıktığımda kulenin ışıkları yanıyordu. Yarın daha dikkatli çıkacağım o merdivenleri.',
];

export const BARKS = {
  drop: ['Hay aksi!', 'Eyvah!', 'Yuh be!'],
  break: ['Kırıldı… Paradan gidecek.', 'Tüh! Paramparça.'],
  stumble: ['Hoop!', 'Ya sabır!'],
  car: ['Dolmuş! Çekil, çekil!'],
  bump: ['Pardon abla!', 'Kusura bakma amca!'],
  reload: ['Hadi bakalım, yerine.'],
  wind: ['Poyraz geliyor!'],
};

export function ALL_LINES() {
  const out = [];
  for (const j of JOBS) for (const arr of [j.brief, j.done, j.doneBad]) for (const [s, t] of arr) out.push([s, t]);
  for (const t of [...INTRO, ...ENDING_GOOD, ...ENDING_SHORT]) out.push(['kemal', t]);
  for (const arr of Object.values(BARKS)) for (const t of arr) out.push(['kemal', t]);
  return out;
}
