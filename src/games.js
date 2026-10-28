// Oyun listesi. Yeni oyun eklemek: klasörünü src/games/ altına koy, buraya bir satır ekle.
export const GAMES = [
  {
    id: 'karakuyu',
    title: 'Karakuyu',
    tag: 'Korku',
    blurb: 'Terk edilmiş bir Anadolu köyü, kurumuş bir kuyu ve adları anılmayanlar: bizden iyiler. İki son.',
    color: '#9a2c20',
    icon: '/icons-karakuyu/icon-512.png',
    fonts: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=Caveat:wght@500&display=swap',
    load: () => import('./games/karakuyu/App.jsx'),
  },
  {
    id: 'karakol',
    title: 'KARAKOL — Son Tahliye',
    tag: 'Aksiyon · Kurtarma',
    blurb: 'Kurgusal bir sınır vadisinde sivilleri bul, koru ve güvenle tahliye et.',
    color: '#d0a64a',
    icon: '/icons-karakol/icon-512.png',
    fonts: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@400;500&family=Caveat:wght@500&display=swap',
    load: () => import('./games/karakol/App.jsx'),
  },
  {
    id: 'keci',
    title: 'Keçi Kaçtı!',
    tag: 'Komedi · Macera',
    blurb: 'Düğün günü. İnatçı keçi Gıdık ahırdan kaçtı. Karpuzlar, tavuklar, traktör… ve halay.',
    color: '#ffcf3a',
    icon: '/icons-keci/icon-512.png',
    fonts: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap',
    load: () => import('./games/keci/App.jsx'),
  },
];
