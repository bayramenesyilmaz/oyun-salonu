import * as B from './buildings.js'; import * as N from './nature.js'; import * as C from './city.js';
import * as P from './props.js'; import * as V from './vehicles.js'; import * as A from './animals.js';
import * as SF from './soft.js'; import * as Wp from './weapons.js'; import * as H from './characters.js';
export * from './core.js';
// kayıt: {id, ad, kategori, üret()}
export const KIT = [];
const L = (cat, mod, list) => list.forEach(([fn, ad, o]) => { if (typeof mod[fn] === 'function') KIT.push({ id: cat + '.' + (ad.toLowerCase().replace(/\s+/g, '-')), ad, cat, make: () => mod[fn](o) }); });
L('Bina', B, [['house', 'Ev'], ['apartment', 'Apartman'], ['office', 'Ofis'], ['skyscraper', 'Gökdelen'], ['shop', 'Dükkan'], ['bank', 'Banka'], ['stairs', 'Merdiven'], ['elevator', 'Asansör'], ['door', 'Kapı'], ['wall', 'Duvar'], ['fence', 'Çit'], ['vault', 'Kasa dairesi']]);
L('Doğa', N, [['tree', 'Meşe', { type: 'meşe' }], ['tree', 'Çam', { type: 'çam' }], ['tree', 'Palmiye', { type: 'palmiye' }], ['tree', 'Kuru ağaç', { type: 'kuru' }], ['bush', 'Çalı'], ['rock', 'Kaya'], ['mountain', 'Dağ'], ['caveEntrance', 'Mağara'], ['water', 'Su'], ['forest', 'Orman']]);
L('Şehir', C, [['road', 'Yol'], ['sidewalk', 'Kaldırım'], ['crossing', 'Yaya geçidi'], ['streetLamp', 'Sokak lambası'], ['trafficLight', 'Trafik ışığı'], ['sign', 'Tabela'], ['bench', 'Bank'], ['dumpster', 'Çöp konteyneri'], ['trashCan', 'Çöp kutusu'], ['hydrant', 'Yangın musluğu'], ['busStop', 'Durak'], ['mailbox', 'Posta kutusu'], ['barrier', 'Bariyer'], ['fountain', 'Çeşme']]);
L('Eşya', P, [['bed', 'Yatak'], ['table', 'Masa'], ['chair', 'Sandalye'], ['sofa', 'Koltuk'], ['wardrobe', 'Dolap'], ['shelf', 'Raf'], ['counter', 'Tezgah'], ['cashRegister', 'Kasa makinesi'], ['safe', 'Çelik kasa'], ['crate', 'Sandık'], ['barrel', 'Varil'], ['lamp', 'Lamba'], ['tv', 'TV'], ['window_', 'Pencere'], ['cashBag', 'Para çantası'], ['medkit', 'İlk yardım'], ['toilet', 'Tuvalet'], ['cell', 'Hücre']]);
L('Araç', V, [['car', 'Sedan', { type: 'sedan' }], ['car', 'Taksi', { type: 'taksi' }], ['car', 'Polis arabası', { type: 'polis' }], ['car', 'SUV', { type: 'suv' }], ['car', 'Minibüs', { type: 'minibüs' }], ['truck', 'Kamyon'], ['bus', 'Otobüs'], ['motorcycle', 'Motor'], ['bicycle', 'Bisiklet'], ['helicopter', 'Helikopter'], ['boat', 'Tekne'], ['tank', 'Tank']]);
L('Hayvan', A, [['dog', 'Köpek'], ['cat', 'Kedi'], ['horse', 'At'], ['cow', 'İnek'], ['sheep', 'Koyun'], ['deer', 'Geyik'], ['bird', 'Kuş'], ['fish', 'Balık'], ['chicken', 'Tavuk'], ['wolf', 'Kurt'], ['bear', 'Ayı'], ['boar', 'Yaban domuzu']]);
L('Silah', Wp, [['pistol', 'Tabanca'], ['rifle', 'Tüfek'], ['shotgun', 'Pompalı'], ['sniper', 'Keskin nişancı'], ['smg', 'Hafif makineli'], ['knife', 'Bıçak'], ['baton', 'Cop'], ['grenade', 'El bombası'], ['bat', 'Sopa'], ['flashlight', 'El feneri']]);
L('Karakter', H, [['civilian', 'Sivil'], ['soldier', 'Asker'], ['police', 'Polis'], ['robber', 'Soyguncu'], ['guard', 'Gardiyan'], ['doctor', 'Doktor'], ['chef', 'Aşçı'], ['cashier', 'Kasiyer'], ['prisoner', 'Mahkum'], ['agent', 'Ajan'], ['boss', 'Patron'], ['tourist', 'Turist']]);
L('Yumuşak (deneme)', SF, [['softCar', 'Araba'], ['softRifle', 'Tüfek'], ['softHuman', 'Karakter'], ['softHuman', 'Kırmızılı', { shirt: 0xc0392b }], ['softMountain', 'Dağ'], ['softTree', 'Ağaç'], ['softWolf', 'Kurt']]);
export const CATS = [...new Set(KIT.map((k) => k.cat))];
export const make = (id, o) => { const k = KIT.find((x) => x.id === id); return k && k.make(o); };
