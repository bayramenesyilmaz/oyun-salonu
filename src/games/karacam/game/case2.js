// Karaçam Dosyaları — Vaka 2: Değirmendeki Ses. Kişiler, yerler ve olaylar kurgudur.

export const SPEAKERS2 = {
  huseyin: { name: 'Değirmenci Hüseyin', color: '#d9c49a' },
  gulsum: { name: 'Gülsüm', color: '#e8b4c8' },
  gulsum_cin: { name: 'Gülsüm', color: '#ff5a4a', cin: true },
  kadir: { name: 'Kadir Tüccar', color: '#a8d8b0' },
};

export const CASE2 = {
  id: 2,
  title: 'Değirmendeki Ses',
  sub: 'Karaçam, Aralık 1986 · Su değirmeni, 02.40',
  bg: 'degirmen',
  suspectsTitle: 'Değirmen evinde bekleyenler',
  intro: [
    { s: 'riza', t: 'Hocam, bu sefer işin rengi başka. Kız üç gecedir değirmende bulunuyor.' },
    { s: 'yusuf', t: 'Babası haber verdi. Kızının sesinin değiştiğini, erkek gibi konuştuğunu söyledi.' },
    { s: 'huseyin', t: 'Taş kendi kendine dönüyor hocam. Gülsüm de başında, gözleri bembeyaz.' },
    { s: 'riza', t: 'Değirmen kilitliyse taşı kim döndürüyor? Önce bir bakalım.' },
  ],
  scene: {
    title: 'Su değirmeni',
    time: '02.40',
    evidence: ['defter', 'cakmak', 'yag', 'cizme'],
    fillers: 4,
    found: {
      defter: { s: 'yusuf', t: 'Gülsüm’ün defteri. Son sayfaya kalın harflerle bir şey yazmış.' },
      cakmak: { s: 'yusuf', t: 'Gümüş bir çakmak. Değirmenci sigara içmiyor, kızı da içmez.' },
      yag: { s: 'yusuf', t: 'Makine yağı. Dişliler yeni yağlanmış, hem de bol bol.' },
      cizme: { s: 'yusuf', t: 'Lastik çizmeler. Taban çamurlu, ölçü büyük. Hüseyin Efendi’nin değil.' },
    },
    spots: {
      cuval: { label: 'Mühürlü çuvallar', s: 'yusuf', t: 'Devlet ambarının mühürlü çuvalları. Bir değirmende ne işleri var?' },
      un: { label: 'Taze un', s: 'yusuf', t: 'Taşın etrafında taze un. Bu gece öğütülmüş, daha soğumamış bile.' },
      tas: { label: 'Değirmen taşı', s: 'yusuf', t: 'Taşın mili su çarkına bağlı. Kendi kendine dönmez, biri kapağı açmış.' },
      pencere: { label: 'Aralık pencere', s: 'yusuf', t: 'Pencere içeriden açılmış. Biri dışarıya bir şey uzatmış.' },
    },
    // olay yerinde karanlıkta beliren Gülsüm (dördüncü bulunan nesneden sonra)
    apparition: { after: 4, at: { x: 0.79, y: 0.52 }, img: 'gulsum_cin_1', line: { s: 'gulsum_cin', t: 'Benim değirmenim. Benim unum. Gidin buradan.' } },
    done: [
      { s: 'riza', t: 'Hocam, o neydi? Kız az önce şuradaydı, yemin ederim gördüm.' },
      { s: 'yusuf', t: 'Ben de gördüm komiserim. Ama çuvallar da burada, un da.' },
      { s: 'riza', t: 'Üçü de değirmen evinde. Sorguya başlayalım.' },
    ],
  },
  suspects: {
    huseyin: {
      role: 'Değirmenci, Gülsüm’ün babası',
      open: [{ s: 'huseyin', t: 'Hocam, kızımı kurtar. Ne gerekiyorsa yap, ne istersen veririm.' }],
      q: [
        { id: 'ne_zaman', q: 'Ne zaman başladı?', a: [{ s: 'huseyin', t: 'Kadir’le nişan konuşulduktan sonra. O geceden beri her gece değirmene kaçıyor.' }], note: 'Gülsüm’ün nöbetleri Kadir’le nişan konuşulunca başlamış.' },
        { id: 'borc', q: 'Kadir’e borcunuz var mı?', a: [{ s: 'huseyin', t: 'Var hocam. Değirmeni ipotek ettim. Nişan olursa borç silinecek dedi.' }], note: 'Hüseyin, Kadir’e borçlu; nişan olursa borç silinecekmiş.' },
        { id: 'anahtar', q: 'Değirmenin anahtarı kimde?', a: [{ s: 'huseyin', t: 'Bende bir tane var. Bir tane de, ipotekten beri Kadir’de.' }], note: 'Değirmenin ikinci anahtarı Kadir’de.' },
        { id: 'cuval', need: 'cuval', q: 'Mühürlü çuvallar kimin?', a: [{ s: 'huseyin', p: 'huseyin', t: 'Benim değil, vallahi benim değil! Ben devlet malına el sürmem.' }], note: 'Hüseyin çuvalları tanımıyor.' },
      ],
    },
    gulsum: {
      role: 'Değirmencinin kızı, 19 yaşında',
      open: [{ s: 'gulsum', t: 'Hatırlamıyorum hocam. Uyuyorum, sonra kendimi taşın başında buluyorum.' }],
      // ikinci sorudan sonra nöbet tutar
      possession: {
        after: 2,
        frames: ['gulsum_cin_1', 'gulsum_cin_2', 'gulsum_cin_3'],
        lines: [
          { s: 'gulsum_cin', t: 'Hoca! Senin deden de buraya gelmişti. Elli bir kışında.' },
          { s: 'gulsum_cin', t: 'O da sordu. O da bulamadı. Sen de bulamayacaksın.' },
        ],
        choice: {
          prompt: 'Gülsüm nöbet geçiriyor. Ne yapacaksın?',
          options: [
            { id: 'dua', t: 'Ayetel Kürsi’yi oku, sakinleştir' },
            { id: 'su', t: 'Yüzüne su serp, adını seslen' },
            { id: 'tut', t: 'Komisere tutmasını söyle' },
          ],
          after: {
            dua: [{ s: 'yusuf', t: 'Gülsüm, buradayım. Sesimi dinle, nefesini dinle.' }, { s: 'gulsum', t: 'Hocam… yine mi oldu? Ne söyledim, söyleyin bana.' }],
            su: [{ s: 'yusuf', t: 'Gülsüm! Gülsüm, bana bak. Buradasın, evindesin.' }, { s: 'gulsum', t: 'Üşüyorum… Ne oldu? Babam nerede?' }],
            tut: [{ s: 'riza', t: 'Tamam kızım, tamam. Kimse sana bir şey yapmayacak.' }, { s: 'gulsum', t: 'Bırakın beni… Tamam, geçti. Geçti galiba.' }],
          },
          note: 'Gülsüm nöbette dedemin adını ve elli bir yılını söyledi. Bunu bilemezdi.',
        },
      },
      q: [
        { id: 'hatirla', q: 'Değirmende ne gördün?', a: [{ s: 'gulsum', t: 'Işık vardı. Çuvallar, bir de bir adam. Yüzünü göremedim.' }], note: 'Gülsüm değirmende ışık, çuvallar ve bir adam görmüş.' },
        { id: 'nisan', q: 'Kadir’le evlenmek istiyor musun?', a: [{ s: 'gulsum', t: 'Babam istiyor. Ben… ben ne istesem fark eder mi hocam?' }] },
        { id: 'defter', need: 'defter', q: 'Defterine ne yazdın?', a: [
          { s: 'gulsum', t: 'Gece gördüklerimi yazıyorum. Unutmayayım diye. Kimse inanmıyor çünkü.' },
          { s: 'yusuf', t: '“Salı gecesi, kamyon, otuz çuval.” Bunu sen mi yazdın?' },
        ], note: 'Gülsüm’ün defterinde: “Salı gecesi, kamyon, otuz çuval.”' },
        { id: 'numara', q: 'Nöbetler gerçek mi, Gülsüm?', a: [
          { s: 'gulsum', t: 'İlk gece gerçekti hocam. Sonra… sonra herkes korktu, değirmene kimse gelmedi.' },
          { s: 'gulsum', t: 'Ben de devam ettim. Biri gelsin, görsün istedim. Ama bu gece… bu gece ben değildim.' },
        ], note: 'Gülsüm bazı nöbetleri bilerek sürdürdüğünü itiraf etti; ama bu geceyi kendisi yapmadığını söylüyor.' },
      ],
    },
    kadir: {
      role: 'Tahıl tüccarı, Gülsüm’ün müstakbel nişanlısı',
      open: [{ s: 'kadir', t: 'Hocam, bu kız hasta. Ankara’ya, doktora götürelim, ben masrafını öderim.' }],
      q: [
        { id: 'gece', q: 'Bu gece neredeydiniz?', a: [{ s: 'kadir', t: 'Evdeydim, uyuyordum. Hüseyin Efendi çağırınca geldim.' }], note: 'Kadir bu gece evde uyuduğunu söylüyor.' },
        { id: 'ipotek', q: 'Değirmeni neden ipotek aldınız?', a: [{ s: 'kadir', t: 'Hüseyin Efendi’ye yardım için. Borç borçtur, bir yerde durmalı.' }] },
        { id: 'cakmak', need: 'cakmak', q: 'Değirmende bu çakmağı bulduk.', a: [
          { s: 'kadir', t: 'Benim olabilir. Geçen hafta düşürmüşümdür. Değirmen benim de malım sayılır.' },
          { s: 'riza', t: 'Geçen haftadan kalma çakmağın altında bu gecenin unu var, Kadir Bey.' },
        ], note: 'Kadir’in çakmağı bu gecenin ununun altındaydı.' },
        { id: 'cizme', need: 'cizme', q: 'Lastik çizmeleriniz nerede?', a: [
          { s: 'kadir', t: 'Arabadadır. Neden soruyorsunuz?' },
          { s: 'riza', t: 'Çünkü değirmende duruyorlar. Çamurlu, sizin ayak ölçünüzde.' },
        ], note: 'Değirmendeki çamurlu çizmeler Kadir’in ölçüsünde.' },
        { id: 'cuval', need: 'cuval', q: 'Devlet ambarının çuvalları neden değirmende?', a: [{ s: 'kadir', t: 'Ben nereden bileyim? Belki kızın cini getirmiştir, ha?' }], note: 'Kadir, çuvallar sorulunca alay etti.' },
      ],
    },
  },
  accuse: {
    who: {
      q: 'Değirmeni gece kim çalıştırıyor?',
      options: [
        { id: 'cin', t: 'Gülsüm’ün cini' },
        { id: 'huseyin', t: 'Değirmenci Hüseyin' },
        { id: 'gulsum', t: 'Gülsüm' },
        { id: 'kadir', t: 'Kadir Tüccar' },
      ],
      answer: 'kadir',
    },
    why: {
      q: 'Neden?',
      options: [
        { id: 'calinti', t: 'Çalıntı devlet buğdayını gizlice öğütüyor' },
        { id: 'korkut', t: 'Gülsüm’ü korkutup nişana razı etmek için' },
        { id: 'borc', t: 'Hüseyin’in borcunu kapatmak için' },
      ],
      answer: 'calinti',
    },
    wrong: [{ s: 'riza', t: 'Hocam, bu delillere uymuyor. Bir daha düşünelim.' }],
    notEnough: [{ s: 'riza', t: 'Elimizde yeterli delil yok hocam. Önce herkesi bir sorgulayalım.' }],
  },
  ending: [
    { s: 'riza', t: 'Kadir Bey, salı gecesi kamyonla otuz çuval. Devlet ambarından, değil mi?' },
    { s: 'kadir', t: 'Kız deli! Bir delinin defterine mi inanacaksınız?' },
    { s: 'yusuf', t: 'Biz deftere değil, delile bakarız. Çakmağınız unun altındaydı.' },
    { s: 'huseyin', t: 'Kızımı korkuttun, değirmenimi hırsız yuvası yaptın. Allah’tan kork!' },
    { s: 'gulsum', t: 'Hocam… artık değirmene gitmek zorunda değilim, değil mi?' },
    { s: 'yusuf', t: 'Değilsin Gülsüm. Ama şunu söyle: dedemi nereden tanıyorsun?' },
  ],
  epilogue: [
    { s: 'gulsum', t: 'Bilmiyorum hocam. O sözleri ben söylemedim.' },
    { s: 'yusuf', t: 'Elli bir kışı. Dedemin defterinde bu değirmen de var. Aynı gece, aynı saat.' },
    { s: 'riza', t: 'Hocam, ben artık hiçbir şeye “cin işi değil” diyemiyorum.' },
  ],
  next: 'Kör Kuyu',
};
