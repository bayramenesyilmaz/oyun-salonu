// Tüm Türkçe diyaloglar ve belgeler. Kurgusal kişiler, kurgusal yerler.
// Konuşmacılar: arslan (oyuncu), kemal, selim, hasan, karakol (telsiz), dusman

export const L1 = {
  intro: [
    { s: 'selim', t: 'Yukarı köylerden on dört kişi kayıp. Aileleri üç gündür karakolun önünde bekliyor.' },
    { s: 'selim', t: 'Bu gece kimseyi kurtarmaya gitmiyoruz. Önce nerede olduklarını bileceğiz.' },
    { s: 'karakol', t: 'Çiftlik tarafında ışık var. Kartal Bir, hazır olduğunda yüzbaşının çadırına.' },
  ],
  briefing: [
    { s: 'selim', t: 'Gel Arslan. Durum şu: çiftlik binalarında hareket var. Bir araç, bir nöbet kulübesi, bir de kapısı zincirli bir ambar.' },
    { s: 'selim', t: 'Gözetleme tepesine çıkacaksın, dürbünle üçünü de doğrulayacaksın. Ateş temasına girmek yok, mecbur kalmadıkça.' },
    { s: 'selim', t: 'Bir de Hasan Dayı var. Çoban. Dün akşam sürüsünü dere kenarındaki ağıla götürmüş, dönmemiş. Yolunun üstündeyse getir.' },
    { s: 'arslan', t: 'Anlaşıldı. Kemal benimle mi?' },
    { s: 'selim', t: 'Kemal seninle. Teçhizatını al, atış alanında elini ısıt, sonra çık.' },
  ],
  gear: [{ s: 'kemal', t: 'Fener tüfeğin sağında, F ile. Dürbün iki numarada, Teğmenim.' }],
  range: [{ s: 'kemal', t: 'Üç hedef. Acele etme. Nefesini ver, sonra tetik.' }],
  rangeDone: [{ s: 'kemal', t: 'Şarjörü değiştir, boş şarjörle kapıdan çıkılmaz.' }],
  rangeReload: [{ s: 'kemal', t: 'Tamam. Hazırsan kapıdayım.' }],
  gate: [
    { s: 'karakol', t: 'Kartal Bir, Karakol. Kapıdan çıkışınız görüldü. Telsiz sessizliği, sadece gerektiğinde.' },
    { s: 'kemal', t: 'Yol kısa ama açık. Doğudaki dere yatağından gidersek kimse görmez. Biraz uzar.' },
  ],
  ridgeNear: [{ s: 'kemal', t: 'Tepe burası. Yukarıda çömel, siluet verme.' }],
  ridgeTop: [{ s: 'arslan', t: 'Çiftlik görüş alanında. Dürbünü al, işaretlemeye başlıyorum.' }],
  mark: {
    kulube: [
      { s: 'arslan', t: 'Karakol, Kartal Bir. Nöbet kulübesi doğrulandı. Bir nöbetçi, projektör çalışıyor.' },
      { s: 'karakol', t: 'Anlaşıldı Kartal Bir.' },
    ],
    arac: [
      { s: 'arslan', t: 'Araç doğrulandı. Kasası brandalı, plakası yok.' },
      { s: 'karakol', t: 'Not edildi.' },
    ],
    ambar: [
      { s: 'arslan', t: 'Ambar. Kapı dışarıdan zincirli, içeride ışık var. Rehineler büyük ihtimalle orada.' },
      { s: 'selim', t: 'Tamam Arslan. Yarın gece için bu kadarı yeter.' },
    ],
  },
  allMarked: [{ s: 'selim', t: 'Üçü de elimizde. Ekibini al, karakola dön. Hasan Dayı hâlâ dışarıda, unutma.' }],
  allMarkedHasan: [{ s: 'selim', t: 'Üçü de elimizde. Hasan Dayı seninleyse dikkatli gel, yolu gözle.' }],
  hasanFound: [
    { s: 'hasan', t: 'Kim var orada? Asker misiniz? Çok şükür.' },
    { s: 'arslan', t: 'Hasan Dayı, sakin ol. Karakoldan geliyoruz. Seni götüreceğiz.' },
    { s: 'hasan', t: 'Gece yarısı adamlar geçti buradan. Elleri bağlı insanlar vardı. Biri benim yeğenim, Murat.' },
    { s: 'arslan', t: 'Arkamda kal. Eğil dediğimde eğil.' },
  ],
  hasanSafe: [
    { s: 'selim', t: 'Hasan Dayı! Geç içeri, sobanın yanına otur.' },
    { s: 'hasan', t: 'Yeğenimi getirin evlat. Ambardaydı, gözümle gördüm.' },
  ],
  contact: [{ s: 'kemal', t: 'Temas! Bizi gördüler!' }],
  enemyShout: [{ s: 'dusman', t: 'Orada biri var!' }],
  kemalDown: [{ s: 'kemal', t: 'Vuruldum! Bacağım…' }],
  kemalRevived: [
    { s: 'arslan', t: 'Bastır şuraya. Kalkabiliyor musun?' },
    { s: 'kemal', t: 'Kalkarım. Devam.' },
  ],
  kemalFollow: [{ s: 'kemal', t: 'Arkandayım.' }],
  kemalHold: [{ s: 'kemal', t: 'Burayı tutuyorum.' }],
  kemalHoldFire: [{ s: 'kemal', t: 'Ateşi kesiyorum.' }],
  kemalFree: [{ s: 'kemal', t: 'Ateş serbest.' }],
  hasanWait: [{ s: 'hasan', t: 'Tamam, burada beklerim.' }],
  hasanFollow: [{ s: 'hasan', t: 'Geliyorum, geliyorum.' }],
  hasanHurt: [{ s: 'hasan', t: 'Ah! Yandım!' }],
  civLost: [{ s: 'karakol', t: 'Kartal Bir… sivil durumu? Tekrarla. Sivil durumu?' }],
  civShot: [{ s: 'kemal', t: 'Teğmenim! Sivil var, ateşi kes!' }],
  kemalNeeded: [{ s: 'arslan', t: 'Kemal\'i geride bırakmam. Önce onu kaldırmalıyım.' }],
  extractNoMarks: [{ s: 'selim', t: 'Arslan, daha bir şey görmedin. Tepeye çık.' }],
  ending: [
    { s: 'selim', t: 'Koordinatlar elimizde. On dört kişi, bir ambar. Yarın gece aşağı köyden başlıyoruz.' },
    { s: 'kemal', t: 'Teğmenim, Hasan Dayı\'nın yeğeni… Murat. Bulacağız değil mi?' },
    { s: 'arslan', t: 'Elimizden geleni yapacağız. Şimdi git, iki saat uyu.' },
  ],
  endingNoHasan: [
    { s: 'selim', t: 'Koordinatlar elimizde. Ama Hasan Dayı hâlâ orada.' },
    { s: 'kemal', t: 'Sabah ilk ışıkta ağıla bir ekip yollarız, Komutanım.' },
    { s: 'selim', t: 'Yollarız. Yarın gece aşağı köyden başlıyoruz.' },
  ],
};

export const DOCS = {
  defter: {
    title: 'Hasan Dayı\'nın not defteri',
    text: `Ekim.
Sürü: 41 baş. Kınalı kuzu topallıyor, ayağına katran sürdüm.

Gece çiftlik yolundan kamyon geçti, farları kapalı. Murat'a söyledim, oralara yaklaşma oğlum. Dinlemez ki.

Su kuyusunun yanına bir de yabancı köpek geldi. Bizimkiler havlamadı. Tuhaf.`,
  },
  telsiz: {
    title: 'Yanık araçta bulunan not',
    text: `(Yarısı yanmış, kurşun kalemle)

…kanal dört. Ambarın kapısı gece açılmayacak. Su sabah verilir, ekmek öğlen.
Kimse kimseyle konuşmayacak.
Çoban gördüyse…

(gerisi okunmuyor)`,
  },
  cizim: {
    title: 'Terk edilmiş evde bir çocuk çizimi',
    text: `Üç ev, bir ağaç, bir güneş. Altında kurşun kalemle:
"Ayşe — 2. sınıf. Benim köyüm."

Kâğıdın arkasında yetişkin el yazısıyla, aceleyle yazılmış bir liste: köyden götürülenlerin adları.
On dört ad. Sonuncusu: Murat Yıldız.`,
  },
};
