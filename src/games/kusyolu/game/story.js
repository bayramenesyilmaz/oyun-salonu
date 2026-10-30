// KUŞYOLU — Bölüm 1: Göktaşı. Kişiler, yerler ve olaylar kurgudur.
// Oyuncu Arda'dır (birinci şahıs). Diğer dört arkadaş sahnede.

export const SPEAKERS = {
  arda: { name: 'Arda', color: '#ffd9a8', pitch: 0.95, rate: 1.0 },
  kaan: { name: 'Kaan', color: '#9fd0ff', pitch: 1.05, rate: 1.06 },
  elif: { name: 'Elif', color: '#ffc4b8', pitch: 1.25, rate: 1.0, female: true },
  mert: { name: 'Mert', color: '#d7e3b0', pitch: 0.8, rate: 0.95 },
  zeynep: { name: 'Zeynep', color: '#d9b8ff', pitch: 1.3, rate: 1.04, female: true },
  anlatici: { name: '', color: '#c8ccd6', pitch: 1, rate: 1 },
};
export const VOICE_INDEX = { arda: 0, kaan: 1, mert: 2, elif: 0, zeynep: 1 };

export const CHAPTER1 = {
  title: 'Göktaşı',
  place: 'Kızılkaya Mahallesi · Ağustos · 23.40',
  intro: [
    { s: 'kaan', t: 'Arda! Gel buraya, bu gece gökyüzü başka türlü.' },
    { s: 'elif', t: 'Bu gece Perseid yağmuru var. Saatte elli altmış tane meteor düşüyor.' },
  ],
  // her arkadaşla konuşma (sırası serbest); ilk konuşma uzun, sonrakiler kısa
  talk: {
    kaan: [
      [
        { s: 'kaan', t: 'Annem yine aradı. Gece yarısı çatıda ne işiniz var dedi.' },
        { s: 'arda', t: 'Peki sen ne dedin ona?' },
        { s: 'kaan', t: 'Yıldız sayıyoruz dedim. Güldü, kapattı.' },
      ],
      [{ s: 'kaan', t: 'Şu beyaz bulut gibi şeriti görüyor musun? Dedem ona Kuşyolu derdi. Kuşlar göçerken onu takip edermiş.' }],
    ],
    elif: [
      [
        { s: 'elif', t: 'Bak, kuzeydoğuya. Hepsi aynı noktadan çıkıyor gibi görünüyor.' },
        { s: 'arda', t: 'Gerçekten aynı yerden mi geliyorlar?' },
        { s: 'elif', t: 'Hayır. Bir kuyrukluyıldızın bıraktığı tozun içinden geçiyoruz.' },
      ],
      [{ s: 'elif', t: 'Bir gün oraya gideceğim. Gülme. Ciddiyim.' }],
    ],
    mert: [
      [
        { s: 'mert', t: 'Çay demlendi, otur biraz.' },
        { s: 'mert', t: 'Yarın sanayide bir motor sökeceğiz. Eller yine yağ olacak.' },
      ],
      [{ s: 'mert', t: 'Sen yıldız bak, ben çaya bakarım. Herkesin bir işi var.' }],
    ],
    zeynep: [
      [
        { s: 'zeynep', t: 'Telefonu sehpaya diktim, gökyüzünü kaydediyor.' },
        { s: 'zeynep', t: 'Bir şey olursa kaçırmayız. Gerçi hep bir şey olmaz.' },
      ],
      [{ s: 'zeynep', t: 'Pil yüzde kırk. Bir saat daha dayanır.' }],
    ],
  },
  meteor: [
    { s: 'elif', t: 'Şuna bakın! O ne?' },
    { s: 'kaan', t: 'Bu meteor değil! Bu düşüyor, bize doğru düşüyor!' },
  ],
  afterFlash: [{ s: 'mert', t: 'Herkes yere! Ses gelecek!' }],
  afterBoom: [
    { s: 'zeynep', t: 'Siz iyi misiniz? Kimsenin bir şeyi yok, değil mi?' },
    { s: 'kaan', t: 'Arkadaki boş araziye düştü. Gördüm, oraya düştü!' },
    { s: 'zeynep', t: 'Kaydettim. Hepsi telefonda.' },
    { s: 'arda', t: 'Hadi. Kimse gelmeden önce biz bakalım.' },
  ],
  arsaIntro: [
    { s: 'mert', t: 'Duman hâlâ çıkıyor. Yavaş olun.' },
    { s: 'elif', t: 'Arda, gel. Bunu görmen lazım.' },
  ],
  crater: [
    { s: 'elif', t: 'Sıcak. Ama yanmıyor. Taş nefes alıyor gibi.' },
    { s: 'mert', t: 'Sakın dokunmayın, ne olduğunu bilmiyoruz.' },
    { s: 'zeynep', t: 'Telefonun pusulası deliye döndü. Etrafında bir alan var.' },
  ],
  take: [
    { s: 'arda', t: 'Çok hafif. Ve sıcak, ama elimi yakmıyor.' },
    { s: 'kaan', t: 'Abi… ışıklar. Bütün mahallenin ışıkları titriyor.' },
    { s: 'zeynep', t: 'Taş her attığında ışıklar da atıyor. Sanki bir şeye sinyal yolluyor.' },
    { s: 'mert', t: 'Siren sesi. Polis geliyor.' },
    { s: 'arda', t: 'Kimseye bir şey söylemiyoruz. Taşı depoya götürüyoruz. Hemen.' },
  ],
  idleBarks: {
    kaan: ['Abi bak, bir tane daha kaydı!', 'Sen dilek tuttun mu bari?'],
    elif: ['Hepsi Kahraman takımyıldızından geliyor. Adı da oradan: Perseid.'],
    mert: ['Çayınız soğumasın, hadi gelin.'],
    zeynep: ['Kayıt devam ediyor.'],
  },
};

export const OBJECTIVES = {
  talk: (n) => `Arkadaşlarınla konuş (${n}/4)`,
  watch: 'Gökyüzüne bak',
  door: 'Çatı kapısından aşağı in',
  crater: 'Kratere yaklaş',
  take: 'Taşı al',
  end: '',
};
