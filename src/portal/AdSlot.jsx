// Reklam yer tutucusu. Şimdilik reklam yok: yer tutucular yalnızca adresin sonuna ?reklam eklenince görünür.
// Gerçek reklam ağı bağlanınca (ör. AdSense) bu bileşenin içi o ağın kodu ile değiştirilir; boyutlar sabit olduğu için sayfa kaymaz.
//
// Kurallar (mobilde rahatsız etmemek için):
//  - açılır pencere, tam ekran, sesli/otomatik oynayan reklam YOK
//  - oyun sırasında hiçbir reklam yok; yalnızca menülerde ve oyun bitiş ekranında
//  - yapışkan (ekranda sabit duran) reklam YOK
//  - her reklamın üstünde küçük "Reklam" etiketi, yüksekliği sabit
export const AD_SLOTS = {
  'portal-top': { h: 100, note: 'Ana sayfa, arama çubuğunun altı · 320×100 / 728×90' },
  'portal-feed': { h: 120, note: 'Oyun listesinde 6. kartın sonrası · yerel (kart gibi) reklam' },
  'portal-bottom': { h: 100, note: 'Ana sayfa altı, alt bilginin üstü · 320×100 / 728×90' },
  'game-end': { h: 250, note: 'Oyun bitiş ekranı (görev bitti / kaybettin) · 300×250' },
};

const show = (() => {
  try {
    return new URLSearchParams(location.search).has('reklam') || localStorage.getItem('reklam') === '1';
  } catch {
    return false;
  }
})();

export default function AdSlot({ slot, feed }) {
  const s = AD_SLOTS[slot];
  if (!show || !s) return null;
  return (
    <div className={'ad-slot' + (feed ? ' feed' : '')} style={{ minHeight: s.h }} data-slot={slot}>
      <small>Reklam</small>
      <span>{slot}</span>
      <em>{s.note}</em>
    </div>
  );
}
