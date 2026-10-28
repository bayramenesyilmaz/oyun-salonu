import { LEVELS } from '../game/levels/index.js';

export const CONTROLS = [
  ['W A S D', 'Hareket'],
  ['Fare', 'Bakış'],
  ['Shift', 'Koş'],
  ['C / Ctrl', 'Çömel'],
  ['Boşluk', 'Zıpla'],
  ['Sol tık', 'Ateş'],
  ['Sağ tık', 'Nişan / dürbünde yakınlaştır'],
  ['R', 'Şarjör değiştir'],
  ['1 / 2', 'Tüfek / Dürbün'],
  ['E', 'Etkileşim'],
  ['F', 'Fener'],
  ['V', 'Odak (yavaş çekim)'],
  ['G', 'Kemal: takip et / bekle'],
  ['T', 'Kemal: ateş serbest / tut'],
  ['Esc', 'Duraklat'],
];

export const TOUCH_CONTROLS = [
  ['Sol taraf', 'Sürükle: yürü (en üste it: koş)'],
  ['Sağ taraf', 'Sürükle: bak'],
  ['ATEŞ', 'Basılı tut (sürükleyerek nişanı düzelt)'],
  ['NİŞAN', 'Aç / kapat (dürbünde yakınlaştır)'],
  ['E', 'Etkileşim (parlarsa bir şey var)'],
  ['R', 'Şarjör değiştir'],
  ['ÇÖMEL', 'Aç / kapat'],
  ['DÜRBÜN · FENER · ODAK', 'Alt sıradaki butonlar'],
  ['KEMAL', 'Bekle / gel · ateş serbest / kes'],
  ['❚❚', 'Duraklat'],
];

export function Controls({ touch = false }) {
  return (
    <div className="controls">
      {(touch ? TOUCH_CONTROLS : CONTROLS).map(([k, v]) => (
        <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
      ))}
    </div>
  );
}

export function SettingsPanel({ s, set, voiceAvailable, touch = false }) {
  return (
    <div className="settings">
      <label><span>{touch ? 'Bakış hassasiyeti' : 'Fare hassasiyeti'}</span><input type="range" min="0.3" max="2.5" step="0.05" value={s.sens} onChange={(e) => set('sens', +e.target.value)} /><em>{s.sens.toFixed(2)}</em></label>
      <label><span>Görüş alanı (FOV)</span><input type="range" min="60" max="95" step="1" value={s.fov} onChange={(e) => set('fov', +e.target.value)} /><em>{s.fov}°</em></label>
      <label><span>Genel ses</span><input type="range" min="0" max="1" step="0.05" value={s.vol} onChange={(e) => set('vol', +e.target.value)} /><em>{Math.round(s.vol * 100)}</em></label>
      <label><span>Müzik</span><input type="range" min="0" max="1" step="0.05" value={s.music} onChange={(e) => set('music', +e.target.value)} /><em>{Math.round(s.music * 100)}</em></label>
      <label><span>Grafik kalitesi</span>
        <select value={s.quality} onChange={(e) => set('quality', e.target.value)}>
          <option value="low">Düşük</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksek</option>
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={s.voice} onChange={(e) => set('voice', e.target.checked)} /><span>Seslendirme (Türkçe)</span></label>
      {!voiceAvailable && <p className="note">Bu tarayıcıda Türkçe okuma sesi bulunamadı; diyaloglar altyazıyla gösterilir.</p>}
      <label className="check"><input type="checkbox" checked={s.subtitles} onChange={(e) => set('subtitles', e.target.checked)} /><span>Altyazılar</span></label>
      <p className="note">Grafik kalitesi değişikliği gölgeleri ve çözünürlüğü anında etkiler; ot yoğunluğu bir sonraki açılışta.</p>
    </div>
  );
}

export function MainMenu({ hasResume, onContinue, onLevels, onSettings, onControls, onInstall, isTouch }) {
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone);
  return (
    <div className="screen menu">
      <div className="menu-col">
        <div className="logo">
          <span className="pre">KARAKOL</span>
          <span className="sub">SON TAHLİYE</span>
        </div>
        <div className="menu-buttons">
          {hasResume && <button className="btn primary" onClick={onContinue}>Devam et</button>}
          <button className={'btn' + (hasResume ? '' : ' primary')} onClick={onLevels}>{hasResume ? 'Bölümler' : 'Başla'}</button>
          <button className="btn" onClick={onSettings}>Ayarlar</button>
          <button className="btn" onClick={onControls}>Kontroller</button>
          {onInstall && <button className="btn ghost" onClick={onInstall}>Uygulama olarak yükle</button>}
          <a className="btn ghost" href="/">← Oyun Salonu</a>
        </div>
        {!onInstall && ios && !standalone && <p className="disclaimer">Uygulama gibi oynamak için: Safari → Paylaş → Ana Ekrana Ekle</p>}
        {isTouch && <p className="disclaimer">Telefonu yan çevir. Kulaklık önerilir.</p>}
        <p className="disclaimer">Kurgusal bir bölgede geçen, kurgusal karakterlerle anlatılan bir hikâyedir. Gerçek kişi, olay ya da operasyon içermez.</p>
      </div>
    </div>
  );
}

export function LevelSelect({ save, onPick, onBack }) {
  return (
    <div className="screen levels">
      <h2>Bölümler</h2>
      <div className="level-grid">
        {LEVELS.map((L) => {
          const open = L.playable && L.id <= save.unlocked;
          const best = save.best[L.id];
          return (
            <button key={L.id} className={'level-card' + (open ? '' : ' locked')} onClick={() => open && onPick(L)} disabled={!open}>
              <span className="num">{String(L.id).padStart(2, '0')}</span>
              <span className="title">{L.title}</span>
              <span className="tag">{L.tag}</span>
              <span className="sum">{L.summary}</span>
              {open ? (
                best ? <span className="best">En iyi: {best.total} puan · Rütbe {best.rank}</span> : <span className="best">Henüz oynanmadı</span>
              ) : (
                <span className="lock">{L.playable ? `Kilitli — önce Bölüm ${L.id - 1}` : 'Geliştiriliyor'}</span>
              )}
            </button>
          );
        })}
      </div>
      <button className="btn ghost" onClick={onBack}>Geri</button>
    </div>
  );
}

export function Briefing({ level, onStart, onBack }) {
  return (
    <div className="screen briefing">
      <div className="brief-card">
        <span className="kicker">BÖLÜM {level.id} · {level.tag}</span>
        <h2>{level.title}</h2>
        <div className="meta"><span>{level.time}</span><span>{level.weather}</span><span>Ekip: Tğm. Arslan, Uzm. Çvş. Kemal</span></div>
        <p className="lead">{level.summary}</p>
        <ol>
          {level.brief.map((b) => <li key={b}>{b}</li>)}
        </ol>
        <p className="note">Puan: kurtarılan siviller, tamamlanan hedefler, bulunan belgeler ve ekibin güvenliği. Düşman etkisiz hâle getirmek puan getirmez; fark edilmeden ilerlemek getirir.</p>
        <div className="row">
          <button className="btn ghost" onClick={onBack}>Geri</button>
          <button className="btn primary" onClick={onStart}>Göreve başla</button>
        </div>
      </div>
    </div>
  );
}

export function Results({ r, onRetry, onLevels, onMenu, onNext }) {
  return (
    <div className="screen results">
      <div className="res-card">
        <span className="kicker">BÖLÜM {r.level} TAMAMLANDI</span>
        <div className="rank-row">
          <div className={'rank r-' + (r.rank === 'Ş' ? 'S' : r.rank)}>{r.rank}</div>
          <div>
            <div className="total">{r.total}<small> / {r.max}</small></div>
            <div className="rank-name">{{ Ş: 'Şerefle', A: 'Başarılı', B: 'Tamamlandı', C: 'Ağır bedel' }[r.rank]}</div>
          </div>
        </div>
        <table>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.label} className={row.bad ? 'bad' : row.value ? '' : 'zero'}>
                <td>{row.label}</td>
                <td>{row.value > 0 ? '+' : ''}{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="extra">
          <span>Süre: {r.extra.time}</span>
          <span>İsabet: {r.extra.accuracy}</span>
          <span>Etkisiz bırakılan: {r.extra.enemiesDown}</span>
        </div>
        {r.level < 5 ? (
          <p className="note">Bölüm {r.level + 1} — {LEVELS[r.level].title} açıldı.</p>
        ) : (
          <p className="note">KARAKOL — Son Tahliye tamamlandı. Kararların ve kurtardığın her kişi sonu belirledi.</p>
        )}
        <div className="row">
          <button className="btn ghost" onClick={onMenu}>Ana menü</button>
          <button className="btn" onClick={onLevels}>Bölümler</button>
          <button className={'btn' + (onNext ? '' : ' primary')} onClick={onRetry}>Tekrar oyna</button>
          {onNext && <button className="btn primary" onClick={onNext}>Sonraki bölüm →</button>}
        </div>
      </div>
    </div>
  );
}
