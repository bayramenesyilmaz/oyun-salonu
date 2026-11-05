// Radyonun İçinde — 1. bölüm: Köy kanalı. Seviye verisi, replikler ve ipuçları.
export const LEVEL_W = 6500;
export const FLOOR_FALL = 560;
export const TETHER = 270;

export const SOLID = [
  { x: -300, y: 360, w: 1400, h: 400 }, // çatı 0
  { x: 1230, y: 360, w: 770, h: 400 }, // çatı 1 (plaka ve kapı)
  { x: 2480, y: 330, w: 820, h: 400 }, // çatı 2 (çan)
  { x: 3100, y: 220, w: 1100, h: 400 }, // çatı 3 (sessiz köşe)
  { x: 4330, y: 330, w: 2300, h: 400 }, // çatı 4 (horoz kovalamacası)
  { x: 4800, y: 280, w: 50, h: 50 }, // sandıklar
  { x: 5250, y: 280, w: 50, h: 50 },
  { x: 5650, y: 280, w: 50, h: 50 },
];
export const PLATE = { x: 1530, w: 70, y: 360 };
export const DOOR = { x: 1700, y: 150, w: 30, h: 210 };
export const LEVER = { x: 1800, y: 360 };
export const ROPE = { x: 1975, top: 170, bottom: 340 };
export const BRIDGE = { x: 2000, y: 360, w: 480, h: 20 };
export const BELL = { x: 2990, y: 160 };
export const STEPS = [
  { x: 2980, y: 285, w: 50, h: 45 },
  { x: 3030, y: 240, w: 70, h: 90 },
];
export const RADIO = { x: 3650, y: 220 };
export const CHASE = { trigger: 4400, rx: 4100, speed: 205 };
export const FINISH = 6180;
export const CHECKPOINTS = [60, 1300, 2520, 3150, 4350];

export const INTRO = [
  { w: 'radyo', t: '…cızırt… çocuklar… beni duyuyor musunuz?' },
  { w: 'arda', t: 'Elif! Biz… radyonun içindeyiz galiba?' },
  { w: 'elif', t: 'Dedemin radyosu bizi yuttu mu şimdi? Harika.' },
  { w: 'radyo', t: 'Köy kanalından başlayın. Sinyali bulursanız eve dönersiniz. Birbirinize iple bağlısınız, bırakmayın.' },
  { w: 'arda', t: 'İple mi? Ne ip…' },
  { w: 'elif', t: 'Beni çekiştirme, Arda! Önce şu çatılardan geçelim.' },
];
export const QUIET = [
  { w: 'radyo', t: 'Küçükken bu çatıdan yıldız sayardık…' },
  { w: 'elif', t: 'Dedem hep derdi: “Yolu bilmeyen ses arar.”' },
  { w: 'arda', t: 'Bu radyo bizi bir yere götürüyor, hissediyorum.' },
  { w: 'elif', t: 'Yan yana gidersek, bulurmuşuz.' },
];
export const OUTRO = [
  { w: 'radyo', t: 'Birinci frekans bulundu. Daha beş kanal var…' },
  { w: 'arda', t: 'O horozdan sonra gerisi kolaydır herhalde.' },
  { w: 'elif', t: 'Yan yana, unutma. Hadi devam.' },
];
export const NAMES = { arda: 'Arda', elif: 'Elif', radyo: 'Radyo' };
export const HINTS = [
  { x0: 1350, x1: 1690, id: 'plate', t: 'Biri plakada dursun, diğeri kapıdan geçip kolu çeksin (Eylem).' },
  { x0: 1850, x1: 2000, id: 'rope', t: 'Arda’nın kılıcı ipi kesebilir. İpin yanında Eylem.' },
  { x0: 2700, x1: 2980, id: 'bell', t: 'Elif’in oku çana ulaşır. Yukarı + Eylem ile yukarı nişan al.' },
  { x0: 3400, x1: 3640, id: 'quiet', t: 'Radyoya birlikte yaklaşın.' },
];
