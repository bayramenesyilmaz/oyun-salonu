// DEDEMİN RADYOSU — metinler, ipuçları, geceler. Kişiler ve olaylar kurgudur.
// Ece'nin (oyuncu) sözleri yazıyla görünür; radyodan gelen sesler seslendirilir.

export const SPEAKERS = {
  ali: { name: 'Ali (1974)', pitch: 1.0, rate: 1.05, color: '#ffd89a', radio: true },
  ali77: { name: 'Ali (1977)', pitch: 0.98, rate: 1.05, color: '#ffd89a', radio: true },
  baba: { name: 'Hüseyin Efendi', pitch: 0.7, rate: 0.95, color: '#e0b090', radio: true },
  spiker: { name: 'Radyo spikeri', pitch: 0.9, rate: 1.0, color: '#c8d8e8', radio: true },
  ece: { name: 'Ece', pitch: 1.3, rate: 1.0, color: '#b8e8d8', female: true, silent: true },
};
export const VOICE_INDEX = { ali: 1, ali77: 1, baba: 0, spiker: 2, ece: 0 };

// İpuçları: tavan arasındaki nesneler. variant: dünya durumuna göre metni değişir.
export const CLUES = {
  foto_saz: {
    title: 'Sazlı fotoğraf',
    night: 1,
    text: (S) =>
      S.music
        ? 'Dedem gençken, elinde bağlama. Arkasında: "İstanbul\'daki ilk yılım, 1975. Hocam Selahattin Bey\'le."'
        : 'Dedem gençken, elinde bağlama. Arkasında dedemin el yazısı: "Son çalışım. 1974."',
  },
  gunluk: {
    title: 'Günlükten bir sayfa',
    night: 1,
    text: (S) =>
      S.music
        ? '"Babamla iki yıl konuşmadık. Sonra İstanbul\'a geldi, konserimde en önde oturdu. Ağladı. Ben de."'
        : S.runaway
          ? '"Tersanede çalışıyorum. Babama mektup yazdım, açmadan geri yollamış. Haklı mıyım, bilmiyorum."'
          : '"Babam haklıydı galiba. Müzik ekmek getirmez. Sazı duvara astım. Ama her gece bakıyorum ona."',
  },
  defter: {
    title: 'Hüseyin Efendi\'nin hesap defteri',
    night: 1,
    text: () => 'Büyük dedemin hesap defteri. Arka kapağın içine sıkıştırılmış, hiç açılmamış bir zarf var.',
  },
  mektup: {
    title: 'Mühürlü zarf',
    night: 1,
    needs: 'defter',
    text: () =>
      '"İstanbul Belediye Konservatuvarı. Sayın Ali Yıldırım, giriş sınavını kazandığınızı bildiririz. Kayıt için son gün: 15 Eylül 1974." Damga: 2 Eylül 1974. Zarf hiç açılmamış.',
  },
  frekans1: {
    title: 'Radyonun arkasındaki etiket',
    night: 1,
    text: () => 'Radyonun arkasına yapıştırılmış sararmış bir kâğıt: "Ali\'nin istasyonu — 7.4". Altında silik bir not: "Gece yarısından sonra."',
  },
  // ---- 2. gece ----
  bilet: {
    title: 'Teneke kutudaki bilet',
    night: 2,
    text: () => 'Babaannemin teneke kutusu. İçinde sararmış bir otobüs bileti: "Ankara — İstanbul · 18:40 · Koltuk 12 · 9 Mayıs 1977". Arkasına babaannem yazmış: "Yerini bana verdi."',
  },
  afis: {
    title: 'Duvar afişi',
    night: 2,
    onlyIf: (S) => S.music,
    text: () => '"Genç Sesler Gecesi — Ali Yıldırım ve Sazı. 9 Mayıs 1977, saat 17.00, Ankara Halkevi." Köşede kırmızı kalemle: "Bitince koş!"',
  },
  vardiya: {
    title: 'Tersane vardiya kartı',
    night: 2,
    onlyIf: (S) => S.runaway,
    text: () => '"Ali Yıldırım — Haliç Tersanesi. 9 Mayıs 1977: fazla mesai 16.00–20.00." Kenarda: "Anneme gidecektim, olmadı."',
  },
  harman: {
    title: 'Harman takvimi',
    night: 2,
    onlyIf: (S) => S.stayed,
    text: () => 'Köy evinden kalma bir takvim yaprağı. "9 Mayıs 1977 — harman günü. Bütün gün tarlada." Altında: "Ankara\'ya teyzeme gidilecek, sonraya kaldı."',
  },
  frekans2: {
    title: 'Düğün fotoğrafı',
    night: 2,
    text: (S) =>
      S.paradox
        ? 'Düğün fotoğrafı… ama gelinin yeri boş. Fotoğrafın altı silinmiş gibi.'
        : 'Dedemle babaannemin düğün fotoğrafı, 1978. Çerçevenin arkasında kurşun kalemle: "7.7 — ikinci istasyon."',
  },
};

export const NIGHTS = [
  {
    id: 1,
    title: 'Mektup',
    year: 1974,
    freq: 7.4,
    clues: ['frekans1', 'foto_saz', 'gunluk', 'defter', 'mektup'],
    present: [
      'Dedem öleli bir ay oldu. Ev satılacak. Tavan arasını boşaltmak bana kaldı.',
      'Burada her şey toz ve hatıra. Bir de o radyo… Dedem bu radyoya kimseyi dokundurmazdı.',
    ],
    hint: 'Tavan arasını incele. Radyonun arkasına da bak.',
    radioIntro: [
      { s: 'spiker', t: 'Türkiye Radyoları. Saat yirmi üç. Şimdi hafif müzik.' },
      { s: 'ali', t: 'Alo? Alo… Bu frekansta kimse olmaz normalde. Kimsiniz?' },
      { s: 'ali', t: 'Ece mi? Garip bir isim değil… ama sesin çok yakın geliyor. Sanki bu odadasın.' },
      { s: 'ali', t: 'Ben Ali. Tavan arasındayım, babam duymasın diye. Bu gece kararımı vermem lazım.' },
      { s: 'ali', t: 'İstanbul\'da konservatuvar sınavına girdim. Sonuç gelmedi. Babam "gelseydi görürdük" diyor.' },
      { s: 'baba', t: 'Ali! Yat artık! Sabah tarla var!' },
      { s: 'ali', t: 'Duydun mu? Ne yapayım Ece? Sazımı astım duvara. İstersen söyle, bir daha hiç indirmem.' },
    ],
    choice: {
      prompt: 'Ali\'ye ne söyleyeceksin?',
      options: [
        {
          id: 'mektup',
          text: 'Babanın hesap defterine bak. Arka kapağın içinde bir zarf var.',
          needs: ['mektup'],
          flags: { music: true },
          lines: [
            { s: 'ali', t: 'Defter mi? Bekle…' },
            { s: 'ali', t: 'Ece… Kazanmışım. Kazanmışım! On beş Eylül son gün. Babam bunu nasıl saklar!' },
            { s: 'baba', t: 'Ali? O zarfı nereden buldun? Oğlum, ben… seni kaybetmekten korktum.' },
            { s: 'ali', t: 'Gideceğim baba. Ama döneceğim. Söz.' },
          ],
          change: 'Duvardaki saz yerinde değil. Onun yerinde bir plak duruyor ve bir konser afişi asılı.',
        },
        {
          id: 'kal',
          text: 'Babanı dinle. Köyde kal, ailenin yanında ol.',
          flags: { stayed: true },
          lines: [
            { s: 'ali', t: 'Haklısın galiba. Babam yaşlandı, tarla kime kalır.' },
            { s: 'ali', t: 'Sazı duvarda bırakacağım. Bazen bakarım ona. O kadar.' },
          ],
          change: 'Duvardaki sazın teli kopmuş, sapı çatlamış. Günlük sayfasındaki yazı değişti.',
        },
        {
          id: 'kac',
          text: 'Bekleme. Sabah ilk otobüsle İstanbul\'a git.',
          flags: { runaway: true },
          lines: [
            { s: 'ali', t: 'Sonuçsuz mu? Haklısın, beklersem hiç gidemem.' },
            { s: 'ali', t: 'Babama bir not bırakırım. Kızacak. Ama kalırsam ben kızacağım kendime.' },
          ],
          change: 'Aile fotoğrafında büyük dedem yok. Sazın yerinde bir tersane fotoğrafı asılı.',
        },
      ],
    },
    wait: [{ s: 'ali', t: 'Tamam, bekliyorum. Ama çok gecikme, babam her an yukarı çıkabilir.' }],
    again: [{ s: 'ali', t: 'Ece? Buradayım. Ne diyecektin?' }],
    outro: [{ s: 'ali', t: 'Ece? Sesin gidiyor… Yarın gece yine bu saatte… frekans değişir belki… dinle…' }],
  },
  {
    id: 2,
    title: 'Otobüs',
    year: 1977,
    freq: 7.7,
    clues: ['frekans2', 'bilet', 'afis', 'vardiya', 'harman'],
    present: [
      'Ertesi gece. Tavan arası dün bıraktığım gibi değil. Bazı şeyler… hep böyle miydi?',
      'Annem telefonda "dedenle babaannen bir otobüste tanışmış" dedi. Hiç bilmiyordum.',
    ],
    hint: 'Yeni frekansı bul. Teneke kutuya ve duvara bak.',
    radioIntro: [
      { s: 'spiker', t: 'Türkiye Radyoları. Dokuz Mayıs bin dokuz yüz yetmiş yedi, sabah haberleri.' },
      { s: 'ali77', t: 'Ece! Üç yıl oldu, biliyor musun? Ben seni hiç unutmadım. Hep bu frekansı bekledim.' },
      { s: 'ali77', t: 'Bugün tuhaf bir gün. İçimde bir his var. Önemli bir şey olacak ama ne, bilmiyorum.' },
    ],
    introByPath: {
      music: [{ s: 'ali77', t: 'Akşam beşte Ankara\'da ilk konserim var! Halkevi\'nde. Ellerim titriyor şimdiden.' }],
      runaway: [{ s: 'ali77', t: 'Tersanede fazla mesaiye kalmam istendi. Annemi görmeye Ankara\'ya gidecektim, kaçırırım.' }],
      stayed: [{ s: 'ali77', t: 'Bugün harman. Akşama teyzeme Ankara\'ya gidecektim ama babam tarlada lazım diyor.' }],
    },
    choice: {
      prompt: 'Ali\'ye ne söyleyeceksin?',
      options: [
        {
          id: 'ikisi',
          text: 'Konserini ver, biter bitmez koş: 18:40 Ankara otobüsü, 12 numaralı koltuk.',
          needs: ['afis', 'bilet'],
          onlyIf: (S) => S.music,
          flags: { met: true, concert: true, best: true },
          lines: [
            { s: 'ali77', t: 'Konser beşte, bir buçuk saat sürer… Yetişirim! Neden 12 numara?' },
            { s: 'ali77', t: 'Tamam, sormuyorum. Sana güveniyorum. Bu akşam o otobüsteyim.' },
          ],
          change: 'Duvarda yeni bir fotoğraf: konserden sonra çekilmiş, dedem sazıyla ve yanında babaannem. Arkasında: "Otobüste tanıştığımız akşam."',
        },
        {
          id: 'otobus',
          text: 'Bugün 18:40 otobüsüne bin. 12 numaralı koltuğa otur.',
          needs: ['bilet'],
          flags: { met: true },
          lines: [
            { s: 'ali77', t: 'Otobüs mü? Peki ama… diğer işim ne olacak?' },
            { s: 'ali77', t: 'Bilmiyorum neden ama haklısın galiba. Gideceğim.' },
          ],
          changeByPath: {
            music: 'Konser afişinin üstüne "İPTAL" damgası vurulmuş. Ama düğün fotoğrafı yerinde.',
            runaway: 'Tersane vardiya kartının yerinde bir istifa dilekçesi var. Düğün fotoğrafı yerinde.',
            stayed: 'Harman takviminin üstüne "Ankara\'ya gittim, babam kızdı" yazılmış. Düğün fotoğrafı yerinde.',
          },
        },
        {
          id: 'kal',
          text: 'Planını bozma. Bugün yapman gerekeni yap.',
          flags: { paradox: true },
          lines: [
            { s: 'ali77', t: 'Haklısın. Bugün önemli bir gün, işimi bırakamam.' },
            { s: 'ali77', t: 'Ece? Sesin… sesin çok uzaktan geliyor. Neden sesin kayboluyor?' },
          ],
          change: 'Düğün fotoğrafında gelinin yeri boş. Benim çocukluk fotoğrafım soluyor. Ellerime bakıyorum… saydamlaşıyorlar.',
        },
      ],
    },
    wait: [{ s: 'ali77', t: 'Peki, buradayım. Ama gün geçiyor Ece, acele et.' }],
    again: [{ s: 'ali77', t: 'Ece, döndün! Söyle, dinliyorum.' }],
    outro: [{ s: 'ali77', t: 'Ece… teşekkür ederim. Neyi neden söylediğini bilmiyorum ama hep teşekkür edeceğim.' }],
    outroParadox: [{ s: 'ali77', t: 'Ece? Ece! Bir şey yanlış… Kimseyle tanışmadım bugün… Neden bu kadar boş hissediyorum?' }],
  },
];

export const ENDINGS = {
  best: {
    title: 'İki istasyon birden',
    text: 'Dedem hem sahnesine hem de babaanneme yetişti. Tavan arasında artık plaklar, afişler ve benim fotoğraflarım var. Radyo hâlâ cızırdıyor. Belki yarın gece yine çalar.',
  },
  met: {
    title: 'Koltuk 12',
    text: 'Dedem o otobüse bindi ve babaannemle tanıştı. Bir şeyden vazgeçti ama aile fotoğrafları yerinde. Ben de buradayım.',
  },
  paradox: {
    title: 'Boş koltuk',
    text: 'Dedem o otobüse binmedi. Düğün fotoğrafı boş, benim fotoğraflarım siliniyor. Radyo son bir kez cızırdıyor… Frekansı yeniden bulabilirsem belki düzeltebilirim.',
  },
};
