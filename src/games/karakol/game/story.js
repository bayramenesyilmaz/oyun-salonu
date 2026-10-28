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

// ===================================================================
// BÖLÜM 2 — TERK EDİLMİŞ KÖY (Aşağıköy)
// ===================================================================
export const L2 = {
  intro: [
    { s: 'selim', t: 'Aşağıköy üç yıldır boş. Ama dün gece köyden bir çocuk sesi telsize karıştı.' },
    { s: 'selim', t: 'Ambardakileri buradan geçirmişler. Bazıları kaçmış olabilir. Köyde saklanan varsa bulun, kamyona getirin.' },
  ],
  start: [
    { s: 'kemal', t: 'Kamyon burada bekleyecek Teğmenim. Köye kadar dört yüz metre.' },
    { s: 'karakol', t: 'Kartal Bir, köyde en az altı silahlı kişi var. Sivilleri bulmadan ateş açmayın.' },
  ],
  enter: [{ s: 'kemal', t: 'Kapılar açık, camlar kırık. Ses gelen yere bakalım: okul, kahve, çeşmenin oradaki evler.' }],
  knock: [{ s: 'arslan', t: 'Duydun mu? Okulun içinden. Biri fısıldıyor.' }],
  zehra: [
    { s: 'zehra', t: 'Asker misiniz? Gerçekten mi? Torunum burada, Ayşe. İki gündür sesini çıkarmadı.' },
    { s: 'arslan', t: 'Zehra Teyze, arkamdan gelin. Eğil dediğimde eğilin.' },
  ],
  ayse: [
    { s: 'ayse', t: 'Annem de götürüldü. Onu da bulacak mısınız?' },
    { s: 'arslan', t: 'Bulacağız. Şimdi babaannenin elini bırakma.' },
  ],
  yusuf: [
    { s: 'yusuf', t: 'Gelmeyeceksiniz sanıyordum. Bacağım tutmuyor ama yürürüm, merak etme.' },
  ],
  seher: [
    { s: 'seher', t: 'Kamyonla geçtiler, maden tarafına. Murat da aralarındaydı. Ben atladım, kaçtım.' },
    { s: 'arslan', t: 'Seher Hanım, bunu sonra Yüzbaşıya anlatırsın. Şimdi benimle gel.' },
  ],
  civWait: [{ s: 'yusuf', t: 'Tamam, burada beklerim.' }],
  civFollow: [{ s: 'zehra', t: 'Geliyoruz.' }],
  civHurt: [{ s: 'zehra', t: 'Ah! Vuruldum!' }],
  firstSafe: [{ s: 'kemal', t: 'Biri kamyonda. Battaniyeyi örttüm. Diğerleri için dönelim.' }],
  radio: [
    { s: 'arslan', t: 'Kahvede bir telsiz. Kanal dört açık. Kablolarını söküyorum.' },
    { s: 'karakol', t: 'Kartal Bir, onların kanalı sustu. İyi iş.' },
  ],
  allSafe: [{ s: 'karakol', t: 'Kartal Bir, kamyon dolu mu? Hareket izni verildi.' }],
  ending: [
    { s: 'seher', t: 'Maden tesisi. Kuzeydeki eski krom madeni. Gece orada ışık yanıyor.' },
    { s: 'selim', t: 'Duydun Arslan. Yarın gece değil, bu gece. Rehineleri taşımadan önce.' },
    { s: 'kemal', t: 'Ayşe uyudu Teğmenim. Kamyonda, babaannesinin kucağında.' },
  ],
  endingLoss: [
    { s: 'selim', t: 'Herkesi getiremedik. Bunu unutmayacağız.' },
    { s: 'seher', t: 'Maden tesisi. Kuzeydeki eski krom madeni. Diğerleri orada.' },
  ],
};

// ===================================================================
// BÖLÜM 3 — SON ÇAĞRI (eski krom madeni tesisi)
// ===================================================================
export const L3 = {
  intro: [
    { s: 'selim', t: 'Eski krom madeni. Jeneratörleri çalışıyor, projektörleri açık. Altı kişi orada olmalı.' },
    { s: 'selim', t: 'Işıklar senin düşmanın Arslan. Jeneratörü bulursan karanlık bizim olur.' },
  ],
  start: [
    { s: 'kemal', t: 'Ana kapıda iki nöbetçi. Doğu tarafında tel örgü yırtık, oradan girebiliriz.' },
    { s: 'karakol', t: 'Kartal Bir, tesisin içinden düzenli vuruş sesi alıyoruz. Metal bir kapı. Biri işaret veriyor.' },
  ],
  knock: [{ s: 'arslan', t: 'Vuruşlar. Üç kısa, üç uzun. Hangarın içinden geliyor.' }],
  knock2: [{ s: 'kemal', t: 'Bir ses de maden girişinden. Daha zayıf.' }],
  power: [
    { s: 'arslan', t: 'Jeneratör kapandı. Fenerimi kapatırsam beni göremezler.' },
    { s: 'kemal', t: 'Karanlıkta onlar da kör. Ama sesimizi duyarlar, yavaş.' },
  ],
  roomA: [
    { s: 'rehine', t: 'Kimsiniz? Asker mi? Çok şükür… Üç kişiyiz, hepimiz iyiyiz.' },
    { s: 'arslan', t: 'Ayağa kalkın. Benim arkamda, tek sıra.' },
  ],
  roomB: [
    { s: 'murat', t: 'Dayım… Hasan Dayımı gördünüz mü? Ağıldaydı.' },
    { s: 'arslan', t: 'Murat? Seni karakolda bekleyen biri var. Hadi.' },
  ],
  roomBnoHasan: [
    { s: 'murat', t: 'Dayım… Hasan Dayım ağıldaydı. Ona ne oldu?' },
    { s: 'arslan', t: 'Murat, sabah ağıla ekip gitti. Önce seni çıkaralım.' },
  ],
  call: [
    { s: 'arslan', t: 'Telsiz odası. Konvoy saati yazıyor: şafakta, taş ocağından dört kişiyi daha taşıyacaklar.' },
    { s: 'arslan', t: '"Konvoy iptal, yol kontrolde, bekleyin." Gönderildi. Biraz zaman kazandık.' },
    { s: 'selim', t: 'Akıllıca Arslan. Ama dört kişi daha var demek. Önce bunları çıkar.' },
  ],
  cut: [{ s: 'kemal', t: 'Kilidi kesiyorum… tamam, açıldı.' }],
  ending: [
    { s: 'murat', t: 'Dört kişi daha var. Taş ocağında, kamyonda. Şafakta götürecekler.' },
    { s: 'selim', t: 'Konvoy hazırlansın. Kurtardıklarımızı karakola götürürken onları da alacağız.' },
  ],
  endingLoss: [
    { s: 'selim', t: 'Birini kaybettik. Ama dört kişi daha var, taş ocağında.' },
    { s: 'selim', t: 'Konvoy hazırlansın. Şafakta yola çıkıyoruz.' },
  ],
};

// ===================================================================
// BÖLÜM 4 — TAHLİYE (konvoy)
// ===================================================================
export const L4 = {
  intro: [
    { s: 'selim', t: 'Konvoy karakola dönüyor. Arkada on bir kişi var. Önümüzde Kurtboğazı köprüsü.' },
    { s: 'selim', t: 'Taş ocağındaki kamyon da aynı yolu kullanacak. İkisini birden halletmeliyiz.' },
  ],
  start: [
    { s: 'kemal', t: 'Konvoy durdu Teğmenim. Köprünün başında bir şey var.' },
    { s: 'arslan', t: 'Dürbünle bakıyorum. Kimse araçtan inmesin.' },
  ],
  scoutDone: [
    { s: 'arslan', t: 'Barikat ve iki yamaçta pusu. Konvoy ilerlerse ateş altında kalır.' },
    { s: 'selim', t: 'Konvoy bekliyor. Önce pusuyu dağıtın, sonra barikatı açın.' },
  ],
  clearDone: [{ s: 'kemal', t: 'Yamaçlar temiz. Barikata gidelim.' }],
  barricade: [
    { s: 'arslan', t: 'Halatı bağladım. Zırhlı araç çeksin.' },
    { s: 'karakol', t: 'Yol açıldı Kartal Bir.' },
  ],
  quarry: [{ s: 'selim', t: 'Taş ocağı köprünün doğusunda. Kamyon orada, motor çalışıyor. Hemen!' }],
  quarryCall: [{ s: 'kemal', t: 'Sahte çağrı işe yaramış, Teğmenim. Kamyonda sadece iki kişi var.' }],
  hostages: [
    { s: 'rehine', t: 'Bizi götürecekler sanıyorduk! Asker gelmiş, kalkın!' },
    { s: 'arslan', t: 'Dördünüz de iyi misiniz? Konvoya, hemen.' },
  ],
  reinforce: [
    { s: 'karakol', t: 'Kartal Bir, kuzeyden bir araç geliyor. Takviye!' },
    { s: 'kemal', t: 'Siper alın! Sivilleri kayaların arkasına!' },
  ],
  ayseMother: [
    { s: 'rehine', t: 'Ayşe… kızım Ayşe nerede? Aşağıköydeydi!' },
    { s: 'arslan', t: 'Ayşe konvoyda. Babaannesiyle. Gidip sarılacaksın.' },
  ],
  allSafe: [{ s: 'selim', t: 'Hepsi araçta. Konvoy, hareket!' }],
  ending: [
    { s: 'selim', t: 'On dört kişiden kurtarabildiklerimiz konvoyda. Karakola dönüyoruz.' },
    { s: 'karakol', t: 'Komutanım, tesisten kaçanlar karakol yönüne toplanıyor. Bu gece bitmedi.' },
    { s: 'selim', t: 'Helikopter sabah yedide. O saate kadar karakolu tutacağız.' },
  ],
};

// ===================================================================
// BÖLÜM 5 — SON KARAKOL (final)
// ===================================================================
export const L5 = {
  intro: [
    { s: 'selim', t: 'Siviller sığınakta. Helikopter yedide inecek. Yirmi dakika.' },
    { s: 'selim', t: 'Örgütten geriye kalanlar son bir kez deneyecek. Karakolu tutacağız.' },
  ],
  start: [{ s: 'selim', t: 'Arslan, buraya gel. Mevzileri anlatacağım.' }],
  brief: [
    { s: 'selim', t: 'Kuzey yolundan gelecekler, belki dere yatağından da. Sen gözetleme kulesinin altındaki kum torbası mevzisine geç.' },
    { s: 'selim', t: 'Cephane konteynerin yanında. Kemal seninle. Kimse sığınağa yaklaşmayacak.' },
  ],
  hasanAmmo: [
    { s: 'hasan', t: 'Evlat! Cephane kutusunu ben taşırım, sen ateş et. Murat sığınakta, hepimiz buradayız.' },
  ],
  hasanAmmoNoMurat: [{ s: 'hasan', t: 'Evlat, cephaneyi ben taşırım. Murat… Murat için de dua ediyorum.' }],
  inPos: [{ s: 'kemal', t: 'Mevzideyiz. Kuzey yolu görüş alanında.' }],
  w1: [
    { s: 'karakol', t: 'Kuzey yolunda hareket! Beş, belki altı kişi!' },
    { s: 'selim', t: 'Tüm birlikler, ateş serbest!' },
  ],
  w1done: [{ s: 'kemal', t: 'Geri çekildiler! Şarjörünü değiştir Teğmenim.' }],
  w2: [
    { s: 'kemal', t: 'Doğu! Dere yatağından sızıyorlar!' },
    { s: 'selim', t: 'Arslan, doğu duvarı! Sığınağın tarafı!' },
  ],
  w2done: [{ s: 'selim', t: 'Doğu temiz. Helikopter on dakika uzakta.' }],
  w3: [
    { s: 'karakol', t: 'Son grup! Yoldan ve batı sırtından aynı anda!' },
  ],
  w3radio: [{ s: 'selim', t: 'Telsizleri sustuğu için birbirlerinden habersizler. Dağınık geliyorlar, fırsat bu!' }],
  w3done: [{ s: 'kemal', t: 'Bitti mi? Bitti… Teğmenim, bitti.' }],
  retreat: [{ s: 'karakol', t: 'Kalanlar geri çekiliyor, kuzeye dağılıyorlar.' }],
  heli: [
    { s: 'karakol', t: 'Helikopter iniş alanına yaklaşıyor. Siviller, sığınaktan çıkın!' },
    { s: 'selim', t: 'Arslan, iniş alanının yanında dur. Herkes binene kadar.' },
  ],
  ammo: [{ s: 'kemal', t: 'Cephane aldım, sen de al.' }],
};

// Final sonları: kararlar ve kurtarılanların sayısına göre seçilir
export function finalEnding(story) {
  const saved = (story.ch2Saved || 0) + (story.ch3Saved || 0) + (story.ch4Saved || 0);
  const lines = [];
  if (story.hasanSaved && story.muratSaved) {
    lines.push({ s: 'hasan', t: 'Murat! Oğlum! Gel buraya, gel…' });
    lines.push({ s: 'arslan', t: 'Söz vermiştim Hasan Dayı. Yeğenin burada.' });
  } else if (story.muratSaved) {
    lines.push({ s: 'kemal', t: 'Murat helikoptere binmeden önce ağıla baktı. Dayısının sürüsü oradaydı.' });
  } else if (story.hasanSaved) {
    lines.push({ s: 'hasan', t: 'Murat\'ı bulamadınız, biliyorum. Ama ötekileri getirdiniz. Sağ olun evlat.' });
  }
  if (saved >= 14) lines.push({ s: 'selim', t: 'On dört kişi. On dördü de. Bu vadide böyle bir sabah görmedim Arslan.' });
  else if (saved >= 10) lines.push({ s: 'selim', t: `On dört kişiden ${saved} kişi eve dönüyor. Geri kalanların adını unutmayacağız.` });
  else lines.push({ s: 'selim', t: `${saved} kişi. Hepsini getiremedik. Bu yükü birlikte taşıyacağız.` });
  if (story.ch2Ayse !== false) lines.push({ s: 'ayse', t: 'Teğmen Abi! Annem burada! Annemi buldunuz!' });
  lines.push({ s: 'kemal', t: 'Teğmenim, iki saat uyumamız gerekiyordu. Ne zaman uyuyoruz?' });
  lines.push({ s: 'arslan', t: 'Helikopter kalkınca Kemal. Helikopter kalkınca.' });
  return lines;
}

Object.assign(DOCS, {
  okul: {
    title: 'Okulun tahtasında tebeşir yazısı',
    text: `Silinmeye çalışılmış, yine de okunuyor:

"Çocuklar, sesiniz çıkmasın. Yüklükteyiz.
Askerler gelince üç kere vurun.
— Zehra Öğretmen"

Altında bir çocuk eliyle: üç çizgi, bir güneş.`,
  },
  kahve: {
    title: 'Kahvenin masasında bırakılmış kâğıt',
    text: `Kanal dört. Saat başı rapor.
Aşağıköy: dört kişi kayıp, aramaya devam.
Madene götürülenler: altı.
Taş ocağı: dört, şafakta.

(Kâğıdın kenarında karalanmış bir koyun resmi.)`,
  },
  liste: {
    title: 'Seher Hanım\'ın cebinden düşen not',
    text: `İsimler. Hepsi bir zarfın arkasına, titrek harflerle:

Zehra, Ayşe, Yusuf, Seher — Aşağıköy.
Murat ve beş kişi daha — maden.
Dört kişi — taş ocağı.

"Kimse unutulmasın."`,
  },
  vardiya: {
    title: 'Hangar duvarında vardiya çizelgesi',
    text: `Jeneratör: gece boyu açık. Yakıt sabah gelir.
Işık kesilirse herkes kapıya.
Maden girişinde tek kişi. Telsiz odası anahtarı ofiste.

Birinin kurşun kalemle eklediği: "Burada kalmak istemiyorum."`,
  },
  murat: {
    title: 'Maden duvarına kazınmış satırlar',
    text: `M.Y. — 3. gün.
Dayım ağıldadır. Kuzuları sayıyordur.
Biri bizi bulursa, ona söyleyin: ben iyiyim.`,
  },
  konvoy: {
    title: 'Taş ocağındaki kamyonun güneşliğinde not',
    text: `Şafakta hareket. Köprüde bekleyenler yolu kapatacak.
Asker gelirse çatışmaya girmeyin, dağılın.

(Altında silik bir imza. Okunmuyor.)`,
  },
});
