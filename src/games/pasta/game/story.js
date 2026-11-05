import { story } from '../../../engine/vn/runtime.js';

const U = (id) => `/kusyolu/chars/${id}.glb`;
const salon = { bg: '#1c141a', fog: 0.03, wall: '#7a5a52', floor: '#3b2a22', hemi: ['#ffd9b0', '#2a1c14', 0.75], key: ['#ffe2b8', 55], rim: ['#ff9fb0', 1.4], lamp: ['#ffb870', 7, 1.6, 2.0, -0.4], exp: 1.1,
  props: [{ k: 'curtain', x: -2.4, c: '#7a2a3a' }, { k: 'curtain', x: 2.1, c: '#7a2a3a' }, { k: 'window', x: 0, type: 'dawn' }, { k: 'table', x: -2.0, z: -1.2, w: 1.4, c: '#d8c8b8' }, { k: 'table', x: 2.0, z: -1.2, w: 1.4, c: '#d8c8b8' }, { k: 'lamp', x: 1.5, h: 2.0, c: '#ffcf8a' }, { k: 'neon', x: 0, y: 2.55, w: 1.6, c: '#ff5a8a' }] };
const depo = { bg: '#0a1218', fog: 0.07, wall: '#9ab0b8', floor: '#58666c', floorKind: 'tile', hemi: ['#9fc8e8', '#1a2428', 0.55], key: ['#cfeaff', 42], rim: ['#7ac0ff', 1.6], flicker: 0.25, exp: 1.05, dustColor: '#bfe4ff',
  props: [{ k: 'box', x: -2, w: 0.7, h: 0.9, d: 0.7, c: '#8a6a3a' }, { k: 'box', x: 2.1, w: 0.9, h: 1.3, d: 0.8, c: '#6a7a8a' }, { k: 'box', x: 1.3, w: 0.6, h: 0.5, d: 0.6, c: '#8a6a3a' }, { k: 'lamp', x: -1.2, h: 2.3, c: '#cfeaff' }] };
const mutfak = { bg: '#130d0a', fog: 0.05, wall: '#8a6a4a', floor: '#4a3626', hemi: ['#ffcf9a', '#2a1a10', 0.7], key: ['#ffd9a8', 50], rim: ['#ffb070', 1.2], lamp: ['#ffa850', 8, -1.4, 1.8, -0.6], exp: 1.15,
  props: [{ k: 'shelf', x: -2.2, c: '#5a3a24' }, { k: 'table', x: 0.2, z: -1.2, w: 1.8, c: '#6a4a30' }, { k: 'window', x: 2.3, type: 'dawn' }, { k: 'lamp', x: -0.9, h: 2.1, c: '#ffcf8a' }] };
const final = { ...salon, bg: '#201420', exp: 1.25, key: ['#fff0cc', 70], props: [...salon.props, { k: 'table', x: 0, z: -1.5, w: 1.6, c: '#f0e8dc' }, { k: 'cake', x: 0, z: -1.5 }] };

export const cfg = {
  id: 'pasta',
  title: 'Kayıp Pasta Vakası',
  tag: 'Komedi · Gizem · Duygusal',
  tagline: 'Düğüne iki saat var. Dört katlı pasta kayıp. Herkes bir şey saklıyor.',
  accent: '#ff8fb1',
  player: 'Müfettiş Poyraz',
  menuCast: { l: 'zeynep', r: 'mert' },
  menuMood: salon,
  chars: {
    kaan: { name: 'Kaan (damat)', glb: U('kaan'), color: '#7fb2ff', pitch: 1.05 },
    zeynep: { name: 'Zeynep (organizatör)', glb: U('zeynep'), color: '#ff8fb1', pitch: 1.3 },
    mert: { name: 'Mert Amca', glb: U('mert'), color: '#d8c080', pitch: 0.7 },
    bekci: { name: 'Bekçi Rıza', glb: U('bekci'), color: '#9ad0a8', pitch: 0.8 },
    elif: { name: 'Elif (pastacı)', glb: U('elif'), color: '#ffb27a', pitch: 1.25 },
    arda: { name: 'Arda (kameraman)', glb: U('arda'), color: '#9fd6ff', pitch: 1 },
  },
  scenes: {
    salon: { mood: salon, amb: 'crowd', music: 'funny', title: 'Gül Sofrası Düğün Salonu · 17:00' },
    depo: { mood: depo, amb: 'hum', music: 'tense', title: 'Soğuk Hava Deposu' },
    mutfak: { mood: mutfak, amb: 'night', music: 'warm', title: 'Salon Mutfağı' },
    final: { mood: final, amb: 'crowd', music: 'hope', title: 'Düğün · 19:00' },
  },
  clues: {
    kirinti: { t: 'Pasta kırıntıları', d: 'Depoda, rafın arkasında beyaz krema ve bisküvi kırıntısı. Biri bir şeyi aceleyle taşımış.' },
    fis: { t: 'Soğutucunun fişi', d: 'Depodaki soğutucunun fişi çekilmiş. Yerine bir semaverin kablosu takılı.' },
    kutu: { t: 'Sabah kutusu', d: 'Bekçi Rıza sabah 04:00’te, un içinde bir kadının büyük bir kutu taşıdığını görmüş.' },
    video: { t: 'Kamera kaydı', d: 'Arda’nın kaydında 03:40’ta Mert Amca, depoda soğutucuyu çekip semaver takıyor.' },
    liste: { t: 'Zeynep’in listesi', d: '“Pasta 06:00 teslim ✔ Soğutucu kontrol ✔”. Kontrol kâğıtta, depoda değil.' },
    defter: { t: 'Elif’in tarif defteri', d: 'Annesinin elyazısı: “Düğün pastası sabırla yapılır kızım.” Sayfa unlu parmak izleriyle dolu.' },
    kaan: { t: 'Kaan’ın ezberi', d: 'Kaan sabaha kadar depoda yemin metnini ezberlemiş. “Fısıltı gibi bir uğultu vardı, soğutucu susmuştu.”' },
  },
  endings: {
    tatli: { title: 'Herkesin Pastası' },
    mert: { title: 'Semaverin Suçu' },
    elif: { title: 'Yanlış Kişi, Kırık Kalp' },
    karpuz: { title: 'Karpuzlu Düğün' },
  },
};

const s = story();
export const st = s;
const E = { hot: 'shock', ok: 'smile' };

// ——— GİRİŞ ———
s.scene('salon');
s.cast({ l: 'zeynep', r: null });
s.narr('Gül Sofrası Düğün Salonu. Saat 17:00. Düğüne iki saat var.');
s.say('zeynep', 'Müfettiş! Müfettiş, geldiniz! Allah razı olsun, pasta kayboldu!', { expr: 'scared', pose: 'armsup' });
s.say('you', 'Sakin olun. Pasta dediğin ayakla gitmez. En son nerede görüldü?');
s.say('zeynep', 'Dört katlı! Bir buçuk metre! Sabah altıda soğuk hava deposuna koyduk. Öğlen baktım, yok!', { expr: 'shock' });
s.say('zeynep', 'Gelinin ağlamaktan gözü şişti. Damat “iptal edelim” diyor. Kayınvalide “pasta yoksa ben yokum” diyor.', { expr: 'worry' });
s.say('you', '(Bir pasta. İki saat. Bir salon dolusu telaş. Başlayalım.)');
s.set({ guven: 0 });
s.label('hub0');
s.choice('Nereden başlarsın?', [
  { t: 'Önce depoya bakayım.', go: 'depo' },
  { t: 'Önce şüphelilerle konuşayım.', go: 'hub' },
]);

// ——— MERKEZ ———
s.label('hub');
s.scene('salon');
s.cast({ l: null, r: null });
s.choice('Kiminle konuşacaksın? (Not defterine ipuçları düşer: ☰ yanındaki 📓)', [
  { t: 'Kaan, damat', go: 'kaan', show: (x) => !x.flags.kaan },
  { t: 'Mert Amca', go: 'mert', show: (x) => !x.flags.mert },
  { t: 'Bekçi Rıza', go: 'bekci', show: (x) => !x.flags.bekci },
  { t: 'Arda, kameraman', go: 'arda', show: (x) => !x.flags.arda },
  { t: 'Zeynep, organizatör (tekrar)', go: 'zeynep', show: (x) => !x.flags.zeynep },
  { t: 'Soğuk hava deposuna bak', go: 'depo', show: (x) => !x.flags.depo },
  { t: 'Elif, pastacı (mutfakta)', go: 'elif' },
  { t: 'Suçluyu açıklıyorum', go: 'accuse', need: (x) => x.clues.length >= 3, hint: 'en az 3 ipucu lazım' },
]);

// ——— KAAN ———
s.label('kaan');
s.set({ kaan: 1 });
s.scene('salon');
s.cast({ l: 'kaan', r: null });
s.say('kaan', 'Müfettiş! Hayatımın günü… pasta yok, kravat yok, ben de yarım!', { expr: 'scared' });
s.say('kaan', 'Sabaha kadar uyumadım. Depoda dolaştım. Evet, depoda.', { expr: 'worry' });
s.choice('', [
  { t: '“Depoda ne işin vardı sabaha karşı?”', go: 'kaan_a' },
  { t: '“Pastayı sen mi aldın?”', go: 'kaan_b' },
]);
s.label('kaan_a');
s.say('kaan', 'Yemin metnini ezberliyordum! Evde annem, kız kardeşim… Tek sessiz yer soğuk hava deposuydu.', { expr: 'worry' });
s.say('kaan', 'Bir ara uğultu kesildi. Soğutucu sustu. “Neyse, sabah anlarlar” dedim.', { expr: 'calm' });
s.add('kaan');
s.say('you', '(Soğutucu sustu. Not alalım.)');
s.go('kaan_end');
s.label('kaan_b');
s.say('kaan', 'Ben mi?! Ben pastayı yemin ederim sevgilimden daha çok seviyorum… yani aynı seviyorum! Hayır! Düzeltiyorum!', { expr: 'shock', pose: 'armsup' });
s.say('kaan', 'Hayır, almadım. Ama depoda uğultu kesildiğini fark ettim. Soğutucu sustu.', { expr: 'worry' });
s.add('kaan');
s.label('kaan_end');
s.go('hub');

// ——— MERT AMCA ———
s.label('mert');
s.set({ mert: 1 });
s.scene('salon');
s.cast({ l: 'mert', r: null });
s.say('mert', 'Ben bir şey yemedim. Hiçbir şey. Hiç.', { expr: 'smirk' });
s.say('you', 'Kolundaki krema nedir Mert Amca?');
s.say('mert', 'Krema mı? Bu… cilt bakım ürünü!', { expr: 'shock' });
s.choice('', [
  { t: '“Amca, düğün öncesi cilt bakımı mı?”', go: 'mert_a' },
  { t: '“Dün gece nerede uyudun?”', go: 'mert_b' },
]);
s.label('mert_a');
s.say('mert', 'Tamam, tamam! Dün gece prova pastasından bir parmak aldım. Bir parmak! Elif bırakmıştı, çay saatiydi!', { expr: 'grin', react: {} });
s.say('mert', 'Pasta benim değil. Bak kolum krema ama kalbim temiz.', { expr: 'warm' });
s.say('you', '(Krema bir yem. Asıl pasta başka yerde.)');
s.go('mert_c');
s.label('mert_b');
s.say('mert', 'Salonun arka odasında. Horlarım, biliyorum. Bekçi Rıza “ses geliyordu” diyor, bana bakma.', { expr: 'smirk' });
s.say('mert', 'Sabaha karşı çay istedim… Neyse. Semaver bulmak ne zor iş, Müfettiş!', { expr: 'worry' });
s.say('you', '(Semaver? İlginç.)');
s.set({ semaver: 1 });
s.label('mert_c');
s.go('hub');

// ——— BEKÇİ ———
s.label('bekci');
s.set({ bekci: 1 });
s.scene('salon');
s.cast({ l: 'bekci', r: null });
s.say('bekci', 'Otuz yıldır bu kapıyı bekliyorum evladım. Bir kedi giremez, pasta mı çıkar?', { expr: 'calm' });
s.say('bekci', 'Ama bir şey var… Sabaha karşı dörde doğru, arka kapıdan biri çıktı. Kucağında kocaman bir kutu.', { expr: 'worry' });
s.choice('', [
  { t: '“Kimdi? Yüzünü gördün mü?”', go: 'bekci_a' },
  { t: '“Saat kaçtı tam olarak?”', go: 'bekci_b' },
]);
s.label('bekci_a');
s.say('bekci', 'Karanlıktı. Ama saçı sarıydı, ceketi derinin. Üstü başı un içindeydi.', { expr: 'calm' });
s.say('bekci', 'Selam vermedi. Hızlıca mutfağa girdi. “Bir daha soğuk hava deposuna girmem” der gibi koşuyordu.', { expr: 'smirk' });
s.add('kutu');
s.say('you', '(Sarı saç, deri ceket, un… Elif.)');
s.go('bekci_end');
s.label('bekci_b');
s.say('bekci', 'Dört. Dörtte çay demledim. Hep dörtte demlerim. Çaydanlık sönünce baktım zaten.', { expr: 'smile' });
s.say('bekci', 'Kutuyu taşıyan sarı saçlıydı. Ceketi deri.', { expr: 'calm' });
s.add('kutu');
s.label('bekci_end');
s.go('hub');

// ——— ARDA ———
s.label('arda');
s.set({ arda: 1 });
s.scene('salon');
s.cast({ l: 'arda', r: null });
s.say('arda', 'Ben kameramanım. Her şeyi çekerim. Gece boyunca depoyu da, salonu da. Hepsi kartta.', { expr: 'smile', pose: 'point' });
s.say('arda', 'Ama sana tek şartım var: videoyu izlerken kimseye “karelerden biri komik çıktı” deme.', { expr: 'smirk' });
s.choice('', [
  { t: '“Göster bakalım.”', go: 'arda_a' },
  { t: '“Depoyu hangi saatte çektin?”', go: 'arda_b' },
]);
s.label('arda_a');
s.scene('depo');
s.cast({ l: 'arda', r: null });
s.narr('Arda’nın kamerası. Gece 03:40. Soğuk hava deposu. Yeşil gece görüşü.');
s.say('arda', 'Bak, şurada. Bu kim?', { expr: 'shock' });
s.say('you', 'Mert Amca. Soğutucunun fişini çekiyor… ve bir semaver takıyor.', { expr: 'calm' });
s.say('arda', 'Çay istemiş. Ben kaydetmişim, o yüzden yaygara yok, hayır!', { expr: 'smile' });
s.add('video', 'fis');
s.fx('shake');
s.go('arda_c');
s.label('arda_b');
s.say('arda', 'Gece üçten sabah altıya. Ben uyuyakalırım ama kamera uyumaz. Kaydı verebilirim.', { expr: 'smile' });
s.say('arda', 'İzle. Merak etme, pastayı kimin çaldığını yine de söylemeyeceğim.', { expr: 'smirk' });
s.go('arda_a');
s.label('arda_c');
s.scene('salon');
s.go('hub');

// ——— ZEYNEP (TEKRAR) ———
s.label('zeynep');
s.set({ zeynep: 1 });
s.scene('salon');
s.cast({ l: 'zeynep', r: null });
s.say('zeynep', 'Pasta listemde var! Bak: “Pasta 06:00 teslim ✔ Soğutucu kontrol ✔”', { expr: 'worry', pose: 'point' });
s.say('you', 'Soğutucuyu kontrol eden kişi sen miydin?');
s.say('zeynep', 'Ben… Kontrol ettim. Listede. Yani aklımda. Yani listede.', { expr: 'shock' });
s.add('liste');
s.say('you', '(Kontrol kâğıtta, depoda değil. Not edildi.)');
s.go('hub');

// ——— DEPO ———
s.label('depo');
s.set({ depo: 1 });
s.scene('depo');
s.cast({ l: null, r: null });
s.narr('Depo. Soğutucu kapalı, içerisi hâlâ serin ama ısınıyor. Raf arkasında bir şeyler parlıyor.');
s.fx('letterbox');
s.choice('Neye bakacaksın?', [
  { t: 'Rafın arkasına.', go: 'depo_a' },
  { t: 'Soğutucunun fişine.', go: 'depo_b' },
]);
s.label('depo_a');
s.narr('Beyaz krema… bisküvi kırıntısı. Büyük bir şey burada kırılmış. Ve sonra hızlıca toplanmış.');
s.add('kirinti');
s.label('depo_a2');
s.choice('', [{ t: 'Fişe de bakayım.', go: 'depo_b', show: (x) => !x.clues.includes('fis') }, { t: 'Yeter, çıkayım.', go: 'depo_end' }]);
s.label('depo_b');
s.narr('Soğutucunun fişi prizden çekilmiş. Yerine bir semaverin kablosu takılı. Semaverin içinde hâlâ ılık su var.');
s.add('fis');
s.say('you', '(Pasta çalınmadı. Pasta… eridi.)', { expr: 'calm' });
s.fx('push');
s.label('depo_end');
s.fx('noletterbox');
s.fx('pull');
s.go('hub');

// ——— ELİF ———
s.label('elif');
s.scene('mutfak');
s.cast({ l: 'elif', r: null });
s.branch([{ if: (x) => x.flags.elifSon, go: 'elif_son' }, { if: (x) => x.flags.elif1, go: 'elif_ikinci' }, { go: 'elif_ilk' }]);

s.label('elif_ilk');
s.set({ elif1: 1 });
s.say('elif', 'Müfettiş… Pasta mı? Ben… Hiçbir şey bilmiyorum. Mutfağım dolu, işim çok.', { expr: 'worry' });
s.say('elif', 'Pastayı soğuk hava deposuna koydum, o kadar. Lütfen beni rahat bırak.', { expr: 'sad' });
s.choice('Elif’e nasıl yaklaşırsın?', [
  { t: '“Elif Hanım, korkmanıza gerek yok. Yalnızca yardım etmek istiyorum.”', go: 'elif_nazik', inc: { guven: 1 } },
  { t: '“Pastayı sen sakladın, değil mi?”', go: 'elif_sert' },
]);
s.label('elif_nazik');
s.say('elif', 'Çok yorgunum… Ben… Daha sonra konuşabilir miyiz? Bir şey bulunca gelin.', { expr: 'sad' });
s.set({ guven: 1 });
s.go('elif_cik');
s.label('elif_sert');
s.say('elif', 'Ben mi?! Şimdi kovulacağım! Beni suçlamayın!', { expr: 'shock', pose: 'armsup' });
s.say('elif', 'Konuşmak istemiyorum. Çıkın lütfen.', { expr: 'sad' });
s.set({ sert: 1 });
s.label('elif_cik');
s.go('hub');

s.label('elif_ikinci');
s.branch([
  { if: (x) => x.clues.includes('kutu') && x.clues.includes('fis') && !x.flags.sert, go: 'elif_acik' },
  { if: (x) => x.clues.includes('kutu') && x.clues.includes('video'), go: 'elif_acik' },
  { go: 'elif_yine' },
]);
s.label('elif_yine');
s.say('elif', 'Hâlâ bir şey bilmiyorum. Ama… sizi yalnız bırakmam. Daha çok ipucu bulun, tamam mı?', { expr: 'worry' });
s.go('hub');

s.label('elif_acik');
s.say('you', 'Elif Hanım. Sabah dörtte bir kutu taşıdın. Arka kapıdan. Un içinde.', { expr: 'calm' });
s.say('elif', '…', { expr: 'shock' });
s.say('elif', 'Gördüler. Tabii gördüler.', { expr: 'sad' });
s.fx('heart');
s.say('elif', 'Pasta… Sabah altıda tam yerindeydi. Ama soğutucu susmuş. Öğlen baktım: ortası çökmüş, katlar kaymış, krema akmış.', { expr: 'cry' });
s.say('elif', 'Annemin mutfağında öğrendim bu işi. Annem geçen kış… O gün tarifini bana bırakmıştı. “Düğün pastası sabırla yapılır” demişti.', { expr: 'cry' });
s.say('elif', 'Düğünden önce ağlamak istemedim. Kimseye söylemeden yenisini yapmaya karar verdim. Sabaha kadar, sonra öğlen…', { expr: 'sad' });
s.say('elif', 'Yetişmeyecek. Biliyorum. Kutuyu mutfağa taşıdım, eski pastayı dükkâna gönderdim… Ama yenisi hâlâ fırında!', { expr: 'cry' });
s.add('defter');
s.set({ elifSon: 1 });
s.choice('Elif ağlıyor. Ne yaparsın?', [
  { t: '“Yenisini birlikte bitirelim. Salon ekibi yardım eder.”', go: 'elif_yardim', inc: { guven: 2 } },
  { t: '“Kendi başına çözmeye çalışmak hataydı. Neden söylemedin?”', go: 'elif_sitem' },
]);
s.label('elif_yardim');
s.say('elif', 'Ama… kimse bana… Ben kimseye yük olmak istemem.', { expr: 'sad' });
s.say('you', 'Pasta tek kişinin işi değil. Düğün de değil.', { expr: 'warm' });
s.say('elif', 'Teşekkür ederim. Gerçekten. Yani… tamam. Tamam. Unu getir.', { expr: 'smile' });
s.set({ yardim: 1 });
s.go('hub');
s.label('elif_sitem');
s.say('elif', 'Haklısınız. Utandım. Utanınca saklanır insan.', { expr: 'sad' });
s.go('hub');
s.label('elif_son');
s.say('elif', 'Fırın hazır. Siz ne karar verirseniz.', { expr: 'worry' });
s.go('hub');

// ——— SUÇLAMA ———
s.label('accuse');
s.scene('salon');
s.cast({ l: 'zeynep', r: 'kaan' });
s.narr('Saat 18:30. Salon dolmaya başladı. Müfettiş kürsüye çıktı. Herkes nefesini tuttu.');
s.fx('letterbox');
s.say('zeynep', 'Peki, kim?! Kim pastayı kaçırdı?!', { expr: 'shock' });
s.choice('Kararını ver.', [
  { t: '“Kimse çalmadı. Birlikte çözeceğiz.”', go: 'son_tatli', need: (x) => x.flags.yardim && x.clues.includes('fis') && x.clues.includes('defter'), hint: 'önce Elif’in güvenini kazan' },
  { t: 'Mert Amca’yı suçla (semaver).', go: 'son_mert', need: (x) => x.clues.includes('fis') || x.clues.includes('video'), hint: 'soğutucu ipucu lazım' },
  { t: 'Elif’i suçla (kutuyu taşıyan).', go: 'son_elif' },
  { t: 'Kaan’ı suçla (depodaydı).', go: 'son_karpuz' },
  { t: 'Zeynep’i suçla (kontrolü atladı).', go: 'son_karpuz' },
  { t: 'Bekçi Rıza’yı suçla.', go: 'son_karpuz' },
]);

s.label('son_tatli');
s.fx('noletterbox');
s.scene('mutfak');
s.cast({ l: 'elif', r: 'mert' });
s.narr('Mutfağa herkes doldu. Zeynep un eledi. Kaan krema çırptı. Arda kaydı bırakıp kat kat bisküvi dizdi.');
s.say('mert', 'Ben semaveri sökeceğim. Çay soğutucudan çok uzak durmalı, ders aldım!', { expr: 'grin' });
s.say('elif', 'Annem… Bugün sağ olsa, tarifini bu kadar kalabalık bir mutfakta yapacağıma çok şaşırırdı.', { expr: 'smile' });
s.fx('laugh');
s.scene('final');
s.cast({ l: 'kaan', r: 'zeynep' });
s.say('kaan', 'Yemin ederim, gelinin gözü şimdi mutluluktan şişti. Pasta dört kat değil, altı kat!', { expr: 'grin' });
s.say('zeynep', 'Fazla kaymış ama gerçek. Gerçek bir pasta.', { expr: 'warm' });
s.say('you', '(Bir pasta yoktu. Bir mutfak vardı. Ve artık herkes bir mutfağın parçasıydı.)');
s.end({ id: 'tatli', title: 'Herkesin Pastası', text: 'Pasta kaybolmadı; eridi, çöktü, saklandı. Ama düğün yetişti, Elif yalnız olmadığını öğrendi, Mert Amca bir daha soğutucuya semaver takmayacağına söz verdi. En güzel son.', kind: 'good', music: 'hope' });

s.label('son_mert');
s.fx('noletterbox');
s.scene('salon');
s.cast({ l: 'mert', r: 'zeynep' });
s.say('mert', 'Ben mi?! Ben bir çay istedim! Pasta çay içer mi?!', { expr: 'shock' });
s.say('zeynep', 'Mert Amca! Soğutucunun fişini çektin!', { expr: 'shock' });
s.say('mert', 'Eh… Semaver de elektrikle çalışıyor, hesap ortada.', { expr: 'worry' });
s.fx('laugh');
s.scene('mutfak');
s.cast({ l: 'elif', r: null });
s.say('elif', 'Yenisini yetiştirdim. Küçük, çarpık ama sıcak. Yine de… keşke bunu bir başkasıyla yapabilseydim.', { expr: 'sad' });
s.end({ id: 'mert', title: 'Semaverin Suçu', text: 'Dava çözüldü, suçlu bulundu, düğün yetişti. Ama Elif kimsenin yardımını istemeden ağlayarak çalıştı. Yine de pasta kesildi, Mert Amca ömür boyu çay yasağına çarptırıldı.', kind: 'mid', music: 'warm' });

s.label('son_elif');
s.fx('noletterbox');
s.scene('mutfak');
s.cast({ l: 'elif', r: null });
s.say('elif', 'Ben… Beni mi suçluyorsunuz?', { expr: 'shock' });
s.fx('heart');
s.say('elif', 'Annem… “Sabırla yapılır” demişti. Ben sabredemedim. İşte bu yüzden.', { expr: 'cry' });
s.say('you', '(Yanlış kişiyi seçtin. Elif zaten yeterince kırıktı.)', { expr: 'worry' });
s.scene('final');
s.cast({ l: 'kaan', r: 'zeynep' });
s.say('kaan', 'Marketten pasta aldık. Üzerinde “Mutlu Yıllar Ayşe” yazıyor.', { expr: 'sad' });
s.say('zeynep', 'Gelin Defne.', { expr: 'sad' });
s.end({ id: 'elif', title: 'Yanlış Kişi, Kırık Kalp', text: 'Pasta marketten geldi. Elif işini bıraktı. Mert Amca hâlâ semaverini seviyor. Bazen doğru suçlu, doğru insan olmaz.', kind: 'bad', music: 'sad' });

s.label('son_karpuz');
s.fx('noletterbox');
s.scene('salon');
s.cast({ l: 'kaan', r: 'zeynep' });
s.say('kaan', 'Ben mi?! Ben mi?! Ben sadece… ezberliyordum!', { expr: 'shock' });
s.say('zeynep', 'Hayır, ben mi? Ben listeye yazdım!', { expr: 'shock' });
s.fx('laugh');
s.narr('Saat 19:00. Salona sessizlik çöktü. Mutfaktan bir karpuz yuvarlandı.');
s.say('mert', 'Pasta yok ama karpuz var. Vatan sağ olsun.', { expr: 'grin' });
s.end({ id: 'karpuz', title: 'Karpuzlu Düğün', text: 'Yanlış kişiyi suçladın. Düğün karpuzla kesildi, fotoğraflarda herkes gülüyor, tek mağdur sensin. Elif bu arada fırında hâlâ yeni bir pasta yapıyordu… kimse sormadı.', kind: 'bad', music: 'funny' });
