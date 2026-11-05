import { story } from '../../../engine/vn/runtime.js';

const U = (id) => `/kusyolu/chars/${id}.glb`;
const kapi = { bg: '#05080e', fog: 0.07, wall: '#3a4650', floor: '#2a2a2c', floorKind: 'tile', hemi: ['#5a7aa0', '#0a0c10', 0.42], key: ['#bcd8ff', 34], rim: ['#4060a0', 1.3], lamp: ['#ffb060', 6, 1.4, 1.7, -0.3], exp: 1.0, ceil: '#101418',
  props: [{ k: 'table', x: 0, z: -1.2, w: 1.6, c: '#3a3028' }, { k: 'window', x: -2, type: 'storm' }, { k: 'lamp', x: 1.4, h: 1.7, c: '#ffcf8a' }, { k: 'frame', x: 2.2, c: '#5a5a50' }] };
const koridor = { bg: '#020406', fog: 0.11, wall: '#6a7a78', floor: '#3a4040', floorKind: 'tile', hemi: ['#6a90a0', '#050708', 0.3], key: ['#bfe0d8', 30], rim: ['#30a090', 1.8], flicker: 0.5, exp: 0.95, dustColor: '#9fd0c4', ceil: '#0c1010',
  props: [{ k: 'door', x: -2.2, c: '#2a3430' }, { k: 'door', x: 2.2, c: '#2a3430' }, { k: 'lamp', x: 0.9, h: 2.5, c: '#aaf0e0' }, { k: 'box', x: -1.4, w: 0.5, h: 0.4, d: 1.4, c: '#4a5050' }] };
const kayit = { bg: '#0a0806', fog: 0.08, wall: '#5a4a38', floor: '#2a221a', hemi: ['#a08060', '#0a0806', 0.45], key: ['#ffd8a0', 32], rim: ['#a06a40', 1.0], lamp: ['#ffb868', 7, -0.8, 1.8, -0.4], flicker: 0.12, exp: 1.0,
  props: [{ k: 'shelf', x: -2.1 }, { k: 'shelf', x: 2.0 }, { k: 'table', x: 0, z: -1.3, w: 1.4, c: '#4a3626' }, { k: 'lamp', x: 0.6, h: 1.3, c: '#ffc87a' }] };
const kat3 = { bg: '#060204', fog: 0.1, wall: '#6a6064', floor: '#33292c', floorKind: 'tile', hemi: ['#a04050', '#0a0204', 0.28], key: ['#ff9a9a', 26], rim: ['#c01830', 2.2], flicker: 0.7, exp: 0.95, dustColor: '#ffb0b0', ceil: '#100608',
  props: [{ k: 'bed', x: -1.9, c: '#c8c0bc' }, { k: 'bed', x: 1.9, c: '#c8c0bc' }, { k: 'curtain', x: -0.2, c: '#6a6a70' }, { k: 'neon', x: 0, y: 2.4, w: 0.9, c: '#c01830' }] };
const sabah = { bg: '#e0b890', fog: 0.015, wall: '#c8b8a8', floor: '#8a7a6a', floorKind: 'tile', hemi: ['#fff0d8', '#6a5a4a', 1.1], key: ['#fff0d0', 60], rim: ['#ffc890', 1.2], exp: 1.2, dustColor: '#ffe8c0', ceil: '#d8c8b8',
  props: [{ k: 'window', x: -1.6, type: 'day' }, { k: 'window', x: 1.6, type: 'day' }, { k: 'table', x: 0, z: -1.3, w: 1.4, c: '#8a6a4a' }] };

export const cfg = {
  id: 'vardiya',
  title: 'Gece Vardiyası',
  tag: 'Korku · Gerilim · Duygusal',
  tagline: 'Yıkılacak eski bir hastane. Sen yeni bekçisin. Üçüncü kata çıkma.',
  accent: '#7ae0c0',
  player: 'Sen',
  warn: 'Hafif korkutucu sahneler, ani sesler ve ışık patlamaları içerir.',
  menuCast: { l: 'bekci', r: 'elif' },
  menuMood: koridor,
  chars: {
    bekci: { name: 'Rıza Usta', glb: U('bekci'), color: '#9ad0a8', pitch: 0.8 },
    elif: { name: 'Gece Kadını', glb: U('elif'), color: '#c8e8ff', pitch: 1.2 },
    zeynep: { name: 'Zeynep (telsiz)', glb: U('zeynep'), color: '#ff9fc0', pitch: 1.3 },
    arda: { name: 'Dr. Umut', glb: U('arda'), color: '#9fd6ff', pitch: 1 },
  },
  meters: { cesaret: { label: 'Cesaret', color: '#7ae0c0', min: 0, max: 5, init: 4, show: true } },
  scenes: {
    kapi: { mood: kapi, amb: 'rain', music: 'sad', title: 'Karaağaç Eski Devlet Hastanesi · 23:40' },
    koridor: { mood: koridor, amb: 'hum', music: 'horror', title: 'Zemin Kat · Koridor' },
    kayit: { mood: kayit, amb: 'wind', music: 'tense', title: 'Kayıt Odası' },
    kat3: { mood: kat3, amb: 'hum', music: 'horror', title: 'Üçüncü Kat' },
    sabah: { mood: sabah, amb: 'night', music: 'hope', title: 'Sabah' },
  },
  clues: {
    dosya: { t: 'Umut’un dosyası', d: '“Umut Aydın, 6 yaş, zatürre. 14 Şubat 1998. Taburcu: sağlıklı.” Annesi kayıtlı: Selin Aydın.' },
    defter: { t: 'Gece defteri', d: '“Selin Aydın, trafik kazası, 03:10, vefat. Kimsesi 3. kat 12. yatakta uyuyan oğlu.”' },
    kutu: { t: 'Müzik kutusu', d: '12. yataktaki küçük müzik kutusu. Kapağının içinde: “Umut’a, her gece.”' },
    ninni: { t: 'Ninni', d: 'Kutunun melodisi bir ninni. Kapakta bir iki satır sözü var: “uyu yavrum, ben yanındayım.”' },
  },
  endings: {
    huzur: { title: 'Huzur' },
    ninni: { title: 'Son Ninni' },
    kacis: { title: 'Kaçış' },
    kayip: { title: 'Üçüncü Kat' },
  },
};

const s = story();
export const st = s;
let fc = 0;
// korku: cesaret düşer, 0 olursa kaçış sonu
const fear = (n, fxName = 'boom') => {
  s.fx(fxName);
  s.inc({ cesaret: -n });
  const l = 'f' + fc++;
  s.branch([{ if: (x) => x.m.cesaret <= 0, go: 'son_kacis' }, { go: l }]);
  s.label(l);
};

// ——— GİRİŞ ———
s.scene('kapi');
s.cast({ l: 'bekci', r: null });
s.narr('Karaağaç Eski Devlet Hastanesi. Gelecek ay yıkılacak. Gece vardiyası: sen ve yağmur.');
s.say('bekci', 'Yeni çocuk sen misin? Şu çayı iç, iyi gelir. Devir teslim kısa tutacağım.', { expr: 'smile' });
s.say('bekci', 'Bir: Üçüncü kata çıkma. İki: Bir kadın sana bir şey sorarsa “bilmiyorum” de. Üç: Telsiz kesilirse olduğun yerde bekle.', { expr: 'calm', pose: 'point' });
s.choice('', [
  { t: '“Şaka mı bu?”', go: 'giris_a' },
  { t: '“Neden üçüncü kat?”', go: 'giris_b' },
  { t: '“Tamam. Anladım.”', go: 'giris_c' },
]);
s.label('giris_a');
s.say('bekci', 'Otuz yıldır bu hastanede çalışıyorum evladım. Şakam yok.', { expr: 'calm' });
s.go('giris_end');
s.label('giris_b');
s.say('bekci', '1998’de bir gece ağır bir kaza oldu. Kadının oğlu hayatta kaldı, kendisi kurtarılamadı. O gece o katta… sonra hastaneye bir hafifleme geldi, bir çeşit yas.', { expr: 'sad' });
s.say('bekci', 'Ben bir şey görmedim. Ama kimse oraya gece çıkmaz.', { expr: 'calm' });
s.set({ bilgi: 1 });
s.go('giris_end');
s.label('giris_c');
s.say('bekci', 'Aferin. Kolay gelsin. Ben… ben gidiyorum.', { expr: 'worry' });
s.label('giris_end');
s.cast({ l: null, r: null });
s.say('bekci', 'Sabaha kadar tek başınasın. Zeynep telsizde. Hadi.', { expr: 'smile' });
s.fx('door');

// ——— PATROL 1 ———
s.scene('koridor');
s.cast({ l: null, r: null });
s.narr('00:30. Fenerin ışığı koridorun sonuna ulaşmıyor. Bir lamba cızırdıyor.');
s.say('zeynep', 'Telsiz kontrol. Her şey yolunda mı?', { name: 'Zeynep (telsiz)' });
s.choice('', [
  { t: '“Her şey yolunda.”', go: 'p1_a' },
  { t: '“Burada garip sesler var.”', go: 'p1_b' },
]);
s.label('p1_a');
s.say('zeynep', 'İyi. Geceler uzun olur. Kolay gelsin.', { name: 'Zeynep (telsiz)' });
s.go('p1_end');
s.label('p1_b');
s.say('zeynep', 'Eski bina işte. Tesisat. Rüzgâr. Kendini kaptırma.', { name: 'Zeynep (telsiz)' });
s.label('p1_end');
s.fx('knock');
s.narr('Üç kez, yavaşça. Kapı çalındı. Sağ taraftaki, kilitli odadan.');
s.choice('Ne yaparsın?', [
  { t: 'Kapıyı açarım.', go: 'k_ac' },
  { t: 'Görmezden gelip yürürüm.', go: 'k_yuru' },
  { t: 'Telsizle haber veririm.', go: 'k_telsiz' },
]);
s.label('k_ac');
s.narr('Kapı gıcırdayarak açılır. İçeride yalnızca üst üste yığılmış tekerlekli sandalyeler. Bir tanesi yavaşça dönüyor.');
fear(1, 'shake');
s.go('p2');
s.label('k_yuru');
s.narr('Adımların hızlanır. Ardında kapı yine çalar, bu sefer daha yakından.');
fear(1, 'shake');
s.go('p2');
s.label('k_telsiz');
s.say('zeynep', 'Kimse yok o odada. Anahtar bende. Ama… bekle, ben bir şey duydum. Sen iyi misin?', { name: 'Zeynep (telsiz)' });
s.inc({ cesaret: 0 });
s.narr('Cızırtı. Sonra sessizlik. Telsiz kesildi.');
s.fx('blackout');
s.narr('Bekle. Olduğun yerde bekle.');
s.fx('lights');

// ——— İLK KARŞILAŞMA ———
s.label('p2');
s.narr('Koridorun sonunda bir siluet. Beyaz bir ışığın içinde. Ellerini önünde tutuyor.');
s.fx('blackout');
s.fx('lights');
s.cast({ c: 'elif' });
s.fx('push');
s.say('elif', 'Umut’u gördün mü?', { name: '???', expr: 'worry', pose: 'idle' });
s.say('elif', 'Küçüktü. Yatağa uyudu. Kayboldu. Biri aldı mı?', { name: '???', expr: 'sad' });
s.choice('Kuralı hatırlarsın: “bilmiyorum” de.', [
  { t: '“Bilmiyorum.”', go: 'bil' },
  { t: '“Kimsin? Sana yardım edebilir miyim?”', go: 'yardim' },
  { t: 'Arkanı dönüp koşarım.', go: 'kos' },
]);
s.label('bil');
s.say('elif', 'Herkes öyle diyor.', { name: '???', expr: 'sad' });
s.narr('Beyaz ışık söner. Koridorda yalnızca onun hafif, kırık hıçkırığı kalır.');
fear(1, 'heart');
s.go('devam');
s.label('yardim');
s.say('elif', 'Adım Selin. Bir ses beni buraya çağırdı. Kayıtlarda adı yazıyor olmalı. Ama kimse bakmıyor.', { name: 'Selin', expr: 'sad' });
s.say('elif', 'Yardım edersen… 3. kata çıkma. Oğlumun dosyasını bul. “Kayıt odası.”', { name: 'Selin', expr: 'worry' });
s.set({ selin: 1 });
s.inc({ cesaret: 1 });
s.fx('pull');
s.go('devam');
s.label('kos');
s.narr('Arkandan bir çığlık: İnce, uzun, camı çatlatacak bir çığlık.');
fear(2, 'screech');
s.go('devam');

// ——— KAYIT ODASI ———
s.label('devam');
s.cast({ c: null });
s.fx('pull');
s.scene('kayit');
s.narr('Kayıt odası. Raflar tavana kadar uzanıyor. Bir lamba sallanıyor, kâğıtlar kendiliğinden hışırdıyor.');
s.label('kayit_hub');
s.choice('Neye bakarsın? (Zaman az.)', [
  { t: '1998 klasörlerine bak.', go: 'kay_a', show: (x) => !x.flags.k_a },
  { t: 'Gece defterlerini karıştır.', go: 'kay_b', show: (x) => !x.flags.k_b },
  { t: 'Bir sandık açmayı dene.', go: 'kay_c', show: (x) => !x.flags.k_c },
  { t: 'Üçüncü kata çık.', go: 'kat3', need: (x) => x.clues.includes('dosya') || x.clues.includes('defter'), hint: 'önce bir ipucu bul' },
]);
s.label('kay_a');
s.set({ k_a: 1 });
s.narr('Mart, Şubat… Şubat 1998. Dosyanın üzerinde çocukça bir kalp çizilmiş.');
s.add('dosya');
s.narr('“Umut Aydın, 6 yaş. Taburcu: sağlıklı.” Annesi Selin Aydın.');
s.go('kayit_hub');
s.label('kay_b');
s.set({ k_b: 1 });
s.narr('Defterin son sayfası: “03:10 — Selin Aydın, trafik kazası, vefat. Oğlu 3. katta, 12. yatakta uyuyor. Kimsesi yok. — Hemşire Nermin”');
s.add('defter');
s.narr('Kâğıt ıslak. Gözyaşı gibi. Ya da yağmur.');
s.go('kayit_hub');
s.label('kay_c');
s.set({ k_c: 1 });
s.narr('Sandık kıpırdıyor. Gıcırtıyla açıldı. İçinden bir sürü örümcek ağı ve bir telefon sesi duyuluyor.');
fear(1, 'phone');
s.narr('Sandık boştu. Telefon çalmaya devam ediyor. Odanın dışında.');
s.go('kayit_hub');

// ——— ÜÇÜNCÜ KAT ———
s.label('kat3');
s.scene('kat3');
s.cast({ l: null, r: null });
s.narr('Merdiven. Her basamakta kat kat soğuk. Üçüncü kat: tek tek sıralanmış yataklar.');
s.fx('letterbox');
s.say('zeynep', '…yapma. Çıkma. Lütfen…', { name: 'Zeynep (telsiz)' });
s.narr('Telsiz cızırdıyor. Yirmi yıldır kimse bu kata basmamış gibi.');
s.choice('12. yatak nerede?', [
  { t: 'Sağ taraftaki yatağa git.', go: 'k3_a' },
  { t: 'Sol tarafı kontrol et.', go: 'k3_b' },
]);
s.label('k3_b');
s.narr('Sol taraftaki yatakların arasında örtüler kendiliğinden kalkıp iniyor. Ayak sesleri senden önce gidiyor.');
fear(1, 'shake');
s.label('k3_a');
s.narr('12. yatak. Üzerinde küçük, eskimiş bir müzik kutusu.');
s.add('kutu');
s.narr('Kutuyu açarsın. Notalar yavaş yavaş akar: bir ninni. Odaya durgun, loş bir sıcaklık yayılır.');
s.add('ninni');
s.fx('heart');
s.narr('Ve sonra arkandaki ışık gider.');
s.fx('blackout');
s.cast({ c: 'elif' });
s.fx('lights');
s.fx('push');

// zamanlı seçim
s.say('elif', 'Onu bulmuşsun.', { name: 'Selin', expr: 'shock' });
s.choice('Selin tam arkanda. Dört saniyen var.', [
  { t: 'Dönüp yüzüne bakarım.', go: 'son_hub' },
  { t: 'Kutuyu kapatıp koşarım.', go: 'k3_kos' },
  { t: 'Kutuyu çalmaya devam ederim.', go: 'son_hub' },
], { time: 6, timeout: 1, react: 'scared' });
s.label('k3_kos');
s.narr('Kapıya doğru koştun. Kapı sen vardığında kapandı. Koridor uzuyor.');
fear(2, 'screech');
s.narr('Kutu ellerinden kayıp yere düştü. Ninni yavaşlayarak sustu. Selin senin ardında ağlıyor.');
s.say('elif', 'Kaçma… ben yalnızca soracaktım.', { name: 'Selin', expr: 'cry' });

// ——— SON SEÇİM ———
s.label('son_hub');
s.fx('noletterbox');
s.fx('pull');
s.say('elif', 'Umut… Bana söyle. İyi mi? Yaşadı mı?', { name: 'Selin', expr: 'worry' });
s.choice('Selin’e ne söylersin?', [
  { t: '“Yaşadı. Doktor oldu. Dosyada her şey yazıyor.”', go: 'son_a', need: (x) => x.clues.includes('dosya'), hint: 'dosyayı bulmalısın' },
  { t: 'Müzik kutusunun ninnisini çalıp onunla birlikte mırıldanırım.', go: 'son_b', need: (x) => x.clues.includes('ninni') && x.clues.includes('kutu') && x.flags.selin, hint: 'Selin’e yardım etmeyi seçmiş olmalısın' },
  { t: '“Ben… bilmiyorum.”', go: 'son_c' },
]);

s.label('son_a');
s.say('you', 'İyi. Yaşadı. Büyüdü, doktor oldu. Bu hastanede çalıştı. Dosyası burada, sağlıklı taburcu.');
s.say('elif', 'Doktor… Doktor mu?', { name: 'Selin', expr: 'smile' });
s.say('elif', 'Hep derdim: iyileşirsen, başkalarını iyileştireceksin. Gece ağladı mı?', { name: 'Selin', expr: 'sad' });
s.say('you', 'Büyük bir adam oldu. Ağladığı gün bile hâlâ senin ninnini mırıldanıyordur.');
s.fx('heart');
s.say('elif', 'Teşekkür ederim. Artık gidebilirim.', { name: 'Selin', expr: 'smile' });
s.go('son_sabah_a');

s.label('son_b');
s.say('you', 'Müzik kutusunu bir daha çevirirsin. Tuşlara parmağın dokunur, ses kırılgan.');
s.narr('Mırıldanmaya başlarsın. Sözleri yarım, ama kalp hatırlar. Selin sana katılır. İki ses, tek ninni.');
s.fx('heart');
s.say('elif', 'Böyle söylerdim ona. Her gece. Hep o ninniyle.', { name: 'Selin', expr: 'cry' });
s.say('elif', 'Teşekkürler. Gece kapandı… sabah geldi.', { name: 'Selin', expr: 'smile' });
s.go('son_sabah_b');

s.label('son_c');
s.say('elif', 'Herkes öyle diyor…', { name: 'Selin', expr: 'sad' });
s.narr('Işık titredi. Yataklar kayıyor. Telsiz bir daha konuşmadı.');
fear(2, 'boom');
s.narr('Kapı yok. Merdiven yok. Sadece bir koridor ve hıçkırık.');
s.go('son_kayip');

s.label('son_sabah_a');
s.scene('sabah');
s.cast({ l: 'bekci', r: 'arda' });
s.say('bekci', 'Sabah oldu evladım. Üçüncü katta müzik kutusunu bulmuşsun.', { expr: 'calm' });
s.say('arda', 'Buna benzer bir kutum vardı. Küçükken kaybettim. Annemin ninnisi hep kulağımdaydı.', { expr: 'sad' });
s.say('you', 'Bunu sana vermem gerek.');
s.fx('letterbox');
s.say('arda', 'Bunu… Annemin yazısı. “Umut’a, her gece.”', { expr: 'cry' });
s.end({ id: 'huzur', title: 'Huzur', text: 'Selin hastanenin son gecesinde, oğlunun iyi olduğunu öğrenip huzur buldu. Dr. Umut müzik kutusunu aldı ve yıkılacak binaya son kez baktı. Bazı kayıp şeyler yalnızca birinin sorması için bekler.', kind: 'good', music: 'hope' });

s.label('son_sabah_b');
s.scene('sabah');
s.cast({ l: 'arda', r: 'bekci' });
s.say('bekci', 'Gece boyunca bir ninni duydum. Yıllardır ilk kez bu bina… sessiz.', { expr: 'sad' });
s.say('arda', 'Bu kutuyu nerede buldun? Annem… O ninni, annemindi.', { expr: 'cry' });
s.say('you', 'Üçüncü katta, 12. yatakta. O gece seni bekliyordu.');
s.fx('heart');
s.say('arda', 'Biliyorum artık. Bu gece annem yanımdaydı.', { expr: 'warm' });
s.end({ id: 'ninni', title: 'Son Ninni', text: 'Müzik kutusu ve mırıldanan bir ninni… Selin yıllardır sorduğu soruya cevap buldu ve oğlu ona, nihayet, ninnisini geri verdi. Bu, hastanenin en sıcak sabahıydı.', kind: 'good', music: 'hope' });

s.label('son_kacis');
s.fx('noletterbox');
s.scene('kapi');
s.cast({ l: 'bekci', r: null });
s.narr('Hastanenin kapısından dışarı fırladın. Yağmurda ıslandın, dizlerin titriyor.');
s.say('bekci', 'Gördüm. Sana söylemiştim. Çay iç… sonra git, bir daha gelme.', { expr: 'calm' });
s.say('you', 'O… kim?');
s.say('bekci', 'Bir anne.', { expr: 'sad' });
s.end({ id: 'kacis', title: 'Kaçış', text: 'Hastaneyi yaktılar, yıktılar. Selin hâlâ bir çocuğun adını soruyor. Sen bir daha gece vardiyası almadın. Ama yağmurlu gecelerde bir ninni duyarsın.', kind: 'bad', music: 'sad' });

s.label('son_kayip');
s.fx('noletterbox');
s.scene('sabah');
s.cast({ l: 'bekci', r: null });
s.say('bekci', 'Üçüncü kat. Hâlâ aynı yerde… Seni sabahleyin 3. kat merdiveninde buldular. Saçların beyaz.', { expr: 'worry' });
s.say('bekci', 'Sana söylemiştim: “bilmiyorum” de.', { expr: 'sad' });
s.end({ id: 'kayip', title: 'Üçüncü Kat', text: 'Bazı sorulara “bilmiyorum” demek yetmez; bazılarını cevaplamak gerekir. Sabaha kadar koridorda kaldın, ve hiçbir şey eskisi gibi olmadı.', kind: 'bad', music: 'horror' });
