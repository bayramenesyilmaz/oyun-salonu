import { story } from '../../../engine/vn/runtime.js';

const U = (id) => `/kusyolu/chars/${id}.glb`;
const banka = { bg: '#0a0c10', fog: 0.05, wall: '#7a8088', floor: '#4a4a50', floorKind: 'tile', hemi: ['#a0b0c8', '#14161a', 0.55], key: ['#ffe8d0', 46], rim: ['#ff4040', 1.8], lamp: ['#ff3030', 4, 1.4, 2.2, -0.5], flicker: 0.08, exp: 1.05, ceil: '#1a1c22',
  props: [{ k: 'table', x: -2, z: -1.3, w: 1.4, c: '#3a3a40' }, { k: 'table', x: 2.1, z: -1.3, w: 1.4, c: '#3a3a40' }, { k: 'neon', x: 0, y: 2.5, w: 1.8, c: '#ff3040' }, { k: 'box', x: 0.9, w: 0.5, h: 0.5, d: 0.5, c: '#2a2a30' }] };
const komuta = { bg: '#050810', fog: 0.06, wall: '#2a3040', floor: '#1a1c24', hemi: ['#6a88c0', '#06080c', 0.5], key: ['#d0e4ff', 40], rim: ['#3a6aff', 2], lamp: ['#4a8aff', 6, -1.2, 2.0, -0.4], exp: 1.0,
  props: [{ k: 'table', x: 0, z: -1.2, w: 2.2, c: '#222a38' }, { k: 'neon', x: -1, y: 2.2, w: 0.8, c: '#3a6aff' }, { k: 'neon', x: 1, y: 2.2, w: 0.8, c: '#ff3a3a' }] };
const gun = { bg: '#f0e0c8', fog: 0.012, wall: '#d8c8b0', floor: '#8a7a68', floorKind: 'tile', hemi: ['#fff8e8', '#7a6a58', 1.1], key: ['#fff0d0', 62], rim: ['#ffd8a0', 1.1], exp: 1.2, ceil: '#e8d8c0',
  props: [{ k: 'window', x: -1.8, type: 'day' }, { k: 'window', x: 1.8, type: 'day' }] };

export const cfg = {
  id: 'muzakere',
  title: 'Müzakereci',
  tag: 'Gerilim · Aksiyon · Duygusal',
  tagline: 'Banka basıldı. Silahlı bir adam ve dört rehine. Elinde yalnızca bir telefon var.',
  accent: '#ff5a5a',
  player: 'Müzakereci',
  warn: 'Silah sesi ve gerilim içerir. Şiddet gösterilmez.',
  menuCast: { l: 'mert', r: 'zeynep' },
  menuMood: banka,
  chars: {
    mert: { name: 'Hasan (silahlı adam)', glb: U('mert'), color: '#e8c070', pitch: 0.65 },
    zeynep: { name: 'Zeynep (gişe)', glb: U('zeynep'), color: '#ff9fc0', pitch: 1.3 },
    bekci: { name: 'Rıza (güvenlik)', glb: U('bekci'), color: '#9ad0a8', pitch: 0.8 },
    kaan: { name: 'Kaan (müşteri)', glb: U('kaan'), color: '#7fb2ff', pitch: 1.05 },
    elif: { name: 'Elif (müşteri)', glb: U('elif'), color: '#ffb27a', pitch: 1.25 },
    polis: { name: 'Komiser Cengiz', glb: U('polis'), color: '#b8c8ff', pitch: 0.85 },
    arda: { name: 'Müdür Arda', glb: U('arda'), color: '#9fd6ff', pitch: 1 },
  },
  meters: {
    gerilim: { label: 'Gerilim', color: '#ff5a5a', min: 0, max: 10, init: 4, show: true },
    guven: { label: 'Güven', color: '#7ae0a0', min: 0, max: 10, init: 1, show: true },
    sure: { label: 'Süre', color: '#ffc850', min: 0, max: 10, init: 9, show: true },
  },
  scenes: {
    komuta: { mood: komuta, amb: 'rain', music: 'tense', title: 'Komuta Aracı · 14:12' },
    banka: { mood: banka, amb: 'hum', music: 'tense', title: 'Anadolu Bank · İçeride' },
    gun: { mood: gun, amb: 'crowd', music: 'hope', title: 'Üç Gün Sonra' },
  },
  clues: {},
  endings: {
    teslim: { title: 'Silah Yere' },
    kahraman: { title: 'Borcu Silen Konuşma' },
    baskin: { title: 'Baskın' },
    silah: { title: 'Tek Kurşun' },
  },
};

const s = story();
export const st = s;
// her turun sonunda: gerilim 10 → silah sonu, süre 0 → baskın
const check = () => {
  const l = 'c' + (check.n = (check.n || 0) + 1);
  s.branch([{ if: (x) => x.m.gerilim >= 10, go: 'son_silah' }, { if: (x) => x.m.sure <= 0, go: 'son_baskin' }, { go: l }]);
  s.label(l);
};

// ——— GİRİŞ ———
s.scene('komuta');
s.cast({ l: 'polis', r: null });
s.narr('Anadolu Bank, Karaağaç şubesi. Saat 14:12. Üç silahlı çağrı, ardından sessizlik.');
s.say('polis', 'Dinle. İçeride bir adam var. Dört rehine. Adı Hasan Yıldız, elli sekiz yaşında, eski fabrika işçisi. Sabıkası yok.', { expr: 'worry', pose: 'talk' });
s.say('polis', 'On dakikaya özel timin hazır olacak. Sen konuşturacaksın. Çok dikkatli.', { expr: 'calm' });
s.say('you', 'Silahı gösterdi mi?');
s.say('polis', 'Gösterdi. Ama ateş etmedi. Telefonla seni ister. Tek isteği: “Beni dinleyecek biri.”', { expr: 'worry' });
s.say('polis', 'Dikkat: sabrı bitince ya da gerginliği tavan olunca ya içeri girerim ya da… kötüsü.', { expr: 'sad' });
s.fx('phone');
s.scene('banka');
s.cast({ l: 'mert', r: 'zeynep' });
s.narr('Telefon bir kere çaldı. Karşı hat açıldı. Sesli ve ağır bir nefes.');

// ——— TUR 1 ———
s.say('mert', 'Sen kimsin?', { expr: 'worry', pose: 'point' });
s.choice('İlk söz. (Seç.)', [
  { t: '“Adım Müzakereci. Seni dinlemek için buradayım.”', go: 't1_a', inc: { guven: 2, sure: -1 } },
  { t: '“Silahı bırak, kimse zarar görmeyecek.”', go: 't1_b', inc: { gerilim: 2, sure: -1 } },
  { t: '“Hasan Bey, değil mi? Nasılsınız?”', go: 't1_c', inc: { guven: 1, gerilim: -1, sure: -1 } },
]);
s.label('t1_a');
s.say('mert', 'Dinlemek mi? Bu şehirde kimse dinlemez. Ama konuş bakalım.', { expr: 'worry' });
s.go('t1_end');
s.label('t1_b');
s.say('mert', 'Emir mi veriyorsun bana?! Yirmi beş yıl dinledim emir! Sus, dinle!', { expr: 'shock', pose: 'armsup' });
s.go('t1_end');
s.label('t1_c');
s.say('mert', 'Hasan Bey… Kimse bana Bey demedi çok zamandır.', { expr: 'sad' });
s.label('t1_end');
check();

// ——— TUR 2 ———
s.say('zeynep', 'Lütfen… Lütfen bir şey yapmayın…', { expr: 'scared', pose: 'armsup' });
s.say('mert', 'Sus! Kimse konuşmasın!', { expr: 'shock' });
s.choice('Rehineleri nasıl yönetirsin?', [
  { t: '“Hasan, rehinelerden birini serbest bırakabilir misin? Güvenimi göster.”', go: 't2_a', inc: { gerilim: 1, sure: -1 } },
  { t: '“Hepsi iyi mi? Hastası var mı? Su ister mi?”', go: 't2_b', inc: { guven: 2, sure: -1 } },
  { t: '“Burada hiçbir şey yapamazsın. Bırak gitsinler.”', go: 't2_c', inc: { gerilim: 2, guven: -1, sure: -1 } },
]);
s.label('t2_a');
s.say('mert', 'Kimseyi bırakmayacağım. Neden bırakacakmışım?', { expr: 'worry' });
s.say('mert', 'Ama… kadın şu kadar korkuyor. Bırak, o gitsin.', { expr: 'sad', react: { zeynep: { expr: 'cry' } } });
s.set({ zeynepCikti: 1 });
s.inc({ guven: 1 });
s.go('t2_end');
s.label('t2_b');
s.say('mert', 'Neden önemsiyorsun? …Neyse. Yaşlı bekçi tansiyon hapı arıyor. Gözleri kayıyor. Su getirt.', { expr: 'calm' });
s.set({ su: 1 });
s.go('t2_end');
s.label('t2_c');
s.say('mert', 'Seni dinlemeyeceğim. Telefonu kapatırım!', { expr: 'shock' });
s.fx('shake');
s.label('t2_end');
check();

// ——— TUR 3 ———
s.say('polis', '(telsiz) Elli saniyede iki yeni polis aracı geldi. Kitle toplanıyor. Biraz hızlan.', { expr: 'worry' });
s.inc({ sure: -1 });
check();
s.say('mert', 'Neden geldim buraya biliyor musun?', { expr: 'sad', pose: 'point' });
s.choice('Cevap ver. Dikkatli seç.', [
  { t: '“Anlat Hasan. Seni dinliyorum.”', go: 't3_a', inc: { guven: 2, sure: -1 } },
  { t: '“Para için mi? Kaç lira istiyorsun?”', go: 't3_b', inc: { gerilim: 2, guven: -1, sure: -1 } },
  { t: '“Biliyorum. Borçların yüzünden.”', go: 't3_c', inc: { guven: 1, gerilim: 1, sure: -1 } },
]);
s.label('t3_a');
s.say('mert', 'Kızım. Defne. Yirmi dört yaşında. Kalbinde bir delik var, ameliyat lazım. Sigortası yetmedi.', { expr: 'sad' });
s.say('mert', 'Bu banka eve haciz koydu. Kredi borcu. Annesinin ilaçları… Her gün bir mektup.', { expr: 'cry' });
s.set({ sebep: 1 });
s.go('t3_end');
s.label('t3_b');
s.say('mert', 'Para mı?! Seni… Seni aşağılık! Ben hırsız değilim!', { expr: 'shock', pose: 'armsup' });
s.fx('shake');
s.say('mert', 'Ama bu banka bana bir şey borçlu. Bir hayat!', { expr: 'worry' });
s.go('t3_end');
s.label('t3_c');
s.say('mert', 'Biliyor musun?! Kimse bilmiyor… Kızım ameliyat bekliyor.', { expr: 'sad' });
s.set({ sebep: 1 });
s.label('t3_end');
check();

// ——— TUR 4 (araştırma/komuta) ———
s.scene('komuta');
s.cast({ l: 'polis', r: 'arda' });
s.narr('Komuta aracı. Bankanın müdürü Arda, gergin, telefonda.');
s.branch([{ if: (x) => x.flags.sebep, go: 't4_sebep' }, { go: 't4_yok' }]);
s.label('t4_yok');
s.say('arda', 'Hasan Yıldız mı? Kredi dosyası var, haciz bildirimi… ben pek bilmiyorum. Baskı kurma, ben sorumlu olmak istemem.', { expr: 'worry' });
s.go('t4_ask');
s.label('t4_sebep');
s.say('arda', 'Hasan Yıldız… Haciz dosyası var. Kızı Defne Yıldız. Kalp ameliyatı için sigorta reddi, hastane faturası.', { expr: 'sad' });
s.say('arda', 'Biliyorsun, kredi borcu sürece girdi. Ben… cesaret edemedim itiraz etmeye.', { expr: 'worry' });
s.label('t4_ask');
s.choice('Müdür Arda’ya ne diyorsun?', [
  { t: '“Borcu silme yetkin var mı? Hemen bir yazı hazırla.”', go: 't4_a', need: (x) => x.flags.sebep, hint: 'önce Hasan’ın sebebini öğren', inc: { sure: -1 } },
  { t: '“Baskın yetkisi isteme. Biraz daha süre ver.”', go: 't4_b', inc: { sure: -1 } },
  { t: '“Özel tim hazır tutulsun.”', go: 't4_c', inc: { sure: -1, gerilim: 1 } },
]);
s.label('t4_a');
s.say('arda', 'Genel müdürlüğü ararım. Bir imzaya bakar. On dakika!', { expr: 'shock' });
s.set({ yazi: 1 });
s.go('t4_end');
s.label('t4_b');
s.say('polis', 'Beş dakika daha. Ama ondan sonrası benim.', { expr: 'worry' });
s.go('t4_end');
s.label('t4_c');
s.say('polis', 'Hazır. Gerekirse kapıyı kırarız.', { expr: 'calm' });
s.label('t4_end');
check();

// ——— TUR 5 ———
s.scene('banka');
s.cast({ l: 'mert', r: 'bekci' });
s.fx('phone');
s.say('mert', 'Konuşuyorum seninle ama arkada hep o polisler bir şey kurduruyor. Biliyorum.', { expr: 'worry' });
s.say('bekci', 'Evladım… Hasan… Yeter artık. Bırak şunu.', { expr: 'sad', react: { mert: { expr: 'worry' } } });
s.say('mert', 'Rıza, sen karışma! Yirmi yıl aynı kapıdan geçtik!', { expr: 'shock' });
s.choice('Rıza’nın araya girmesini nasıl kullanırsın?', [
  { t: '“Hasan, Rıza’ya kulak ver. O seni tanıyor.”', go: 't5_a', inc: { guven: 1, gerilim: -1, sure: -1 } },
  { t: '“Rıza’yı sustur, kimse konuşmasın.”', go: 't5_b', inc: { gerilim: 2, sure: -1 } },
  { t: '“Hasan, kızın seni böyle görse ne derdi?”', go: 't5_c', inc: { guven: 1, sure: -1 } },
]);
s.label('t5_a');
s.say('bekci', 'Ben de kızım için ağlıyorum. Seni anlıyorum. Silahı indir.', { expr: 'sad' });
s.say('mert', '…', { expr: 'sad' });
s.go('t5_end');
s.label('t5_b');
s.say('mert', 'Ben sana susmasını söylüyorum, o susmayacak, sen susturacaksın! Kim sen?!', { expr: 'shock' });
s.fx('bigshake');
s.go('t5_end');
s.label('t5_c');
s.say('mert', 'Defne… O beni görmesin. O güvende. Ama kalbinin deliği…', { expr: 'cry' });
s.set({ defne: 1 });
s.label('t5_end');
check();

// ——— KARAR ———
s.say('polis', '(telsiz) Süre doluyor. Senin kararın: konuşmaya devam mı, hazırlık mı?', { expr: 'worry' });
s.inc({ sure: -1 });
check();
s.fx('heart');
s.say('mert', 'Bak… Ben yorgunum. Çok yorgunum. Ne yapacağımı bilmiyorum.', { expr: 'sad' });
s.choice('Son hamlen.', [
  { t: '“Müdür seninle konuşmaya hazır. Borcun silinecek. Silahı yere bırakabilir misin?”', go: 'bitis_yazi', need: (x) => x.flags.yazi, hint: 'müdürden yazıyı almalıydın' },
  { t: '“Kızın için buradasın. Onun için dışarı çıkalım. Ben seninleyim.”', go: 'bitis_teslim', need: (x) => x.m.guven >= 5, hint: 'daha çok güven kazan' },
  { t: '“Hiç seçeneğin yok. Silahı bırak ve yere uzan.”', go: 'bitis_sert' },
]);

s.label('bitis_yazi');
s.say('mert', 'Gerçek mi bu? Gerçekten silinecek mi?', { expr: 'shock' });
s.say('you', 'Gerçek. Yazılı. Müdür burada, imzalı. Ve ameliyat için hastane yönetimiyle konuştum.');
s.fx('heart');
s.say('mert', 'Ben… Ben ne yaptım… Ben ne yaptım böyle…', { expr: 'cry' });
s.say('mert', 'Silahı bırakıyorum. Bırakıyorum. Tamam. Kızım…', { expr: 'cry' });
s.fx('door');
s.go('son_kahraman');

s.label('bitis_teslim');
s.say('mert', 'Kızım. O beni böyle görmesin.', { expr: 'sad' });
s.say('you', 'Sen şimdi bırakırsan, onu görürsün. Gerisini birlikte çözeriz.');
s.say('mert', 'Tamam. Tamam. Çıkıyorum.', { expr: 'sad' });
s.fx('door');
s.go('son_teslim');

s.label('bitis_sert');
s.say('mert', 'Seçeneğim yok… Seçeneğim yoktu!', { expr: 'shock', pose: 'armsup' });
s.inc({ gerilim: 4 });
s.branch([{ if: (x) => x.m.gerilim >= 10, go: 'son_silah' }, { go: 'son_baskin' }]);

// ——— SONLAR ———
s.label('son_kahraman');
s.scene('gun');
s.cast({ l: 'arda', r: 'zeynep' });
s.say('arda', 'Borç silindi. Hasan Bey’in kızı ameliyat oldu. Genel müdür bir açıklama yaptı: “Bu bir ders.”', { expr: 'warm' });
s.say('zeynep', 'Rehineler hiç yaralanmadı. Hasan Bey hâlâ yargılanıyor ama… ağlayan bir baba. Ben mahkemede ifade vereceğim.', { expr: 'warm' });
s.end({ id: 'kahraman', title: 'Borcu Silen Konuşma', text: 'Hiç kurşun sıkılmadı. Kimse yaralanmadı. Bir baba silahı bıraktı, bir banka hatasını gördü. Müzakere, silahsız kazanılan savaştır. En iyi son.', kind: 'good', music: 'hope' });

s.label('son_teslim');
s.scene('gun');
s.cast({ l: 'polis', r: 'zeynep' });
s.say('polis', 'Rehinelerin hepsi sağ. Hasan teslim oldu. Kızı onu hastaneden bekliyor.', { expr: 'calm' });
s.say('zeynep', 'Ona kızamıyorum bile. Ama… umarım bir daha kimse bu hâle gelmez.', { expr: 'sad' });
s.end({ id: 'teslim', title: 'Silah Yere', text: 'Hasan güvenle, kendi isteğiyle çıktı. Rehineler kurtuldu. Borç hâlâ ortada, ama Hasan’a yardım edenler artık yalnız değil. Güzel bir son — ama daha iyisi var.', kind: 'good', music: 'hope' });

s.label('son_baskin');
s.scene('banka');
s.cast({ l: 'mert', r: 'zeynep' });
s.fx('door');
s.narr('Cam patladı. Duman. Ses. Beş saniye.');
s.fx('bigshake');
s.fx('flash');
s.scene('gun');
s.cast({ l: 'polis', r: null });
s.say('polis', 'Rehineler kurtuldu. Hasan teslim oldu. Ama bu böyle olmamalıydı.', { expr: 'sad' });
s.say('polis', 'Bir sonraki sefere belki biraz daha dinleyebilirsin.', { expr: 'worry' });
s.end({ id: 'baskin', title: 'Baskın', text: 'Özel tim içeri girdi. Kimse ölmedi ama herkes titriyor. Hasan hapse gitti, kızının ameliyatı hâlâ bekliyor. Çözülebilecek bir hikâye, kapı kırılarak bitti.', kind: 'mid', music: 'sad' });

s.label('son_silah');
s.scene('banka');
s.cast({ l: 'mert', r: 'zeynep' });
s.fx('gun');
s.fx('flash');
s.narr('Tek bir kurşun. Tavana. Camlar kırıldı. Herkes yere yattı.');
s.scene('gun');
s.cast({ l: 'polis', r: null });
s.say('polis', 'Rehineler sağ. Ama Hasan… artık geri dönemez.', { expr: 'sad' });
s.end({ id: 'silah', title: 'Tek Kurşun', text: 'Gerilim sınırı aştı. Bir kurşun, bir yaşam, bir kız çocuğunun yarım kalan ameliyatı. Müzakere yetmedi. Bazen yanlış tek cümle yeter.', kind: 'bad', music: 'sad' });
