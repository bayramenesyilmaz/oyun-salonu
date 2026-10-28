import { useEffect, useState } from 'react';
import { GAMES } from '../games.js';
import './portal.css';

export default function Portal() {
  const [installEvt, setInstallEvt] = useState(null);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;

  useEffect(() => {
    const f = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try {
      await installEvt.userChoice;
    } catch {
      /* yok say */
    }
    setInstallEvt(null);
  };


  return (
    <div className="portal">
      <header className="p-head">
        <div className="p-logo">
          <span className="p-mark" aria-hidden="true" />
          <span>OYUN SALONU</span>
        </div>
        {installEvt ? (
          <button className="p-install" onClick={install}>Uygulama olarak yükle</button>
        ) : ios && !standalone ? (
          <span className="p-hint">Paylaş → Ana Ekrana Ekle</span>
        ) : null}
      </header>

      <main>
        <h1>Tarayıcıda oynanan,<br />Anadolu'dan hikâyeler.</h1>
        <p className="p-lead">Kurulum yok, hesap yok. Bilgisayarda klavye ve fareyle, telefonda dokunmatik kontrollerle oyna.</p>

        <div className="p-grid">
          {GAMES.map((g) => (
            <a key={g.id} className="p-card" href={'/' + g.id} style={{ '--c': g.color }}>
              <img src={g.icon} alt="" loading="lazy" />
              <div className="p-body">
                <span className="p-tag">{g.tag}</span>
                <h2>{g.title}</h2>
                <p>{g.blurb}</p>
                <span className="p-play">Oyna →</span>
              </div>
            </a>
          ))}
        </div>
      </main>

      <footer className="p-foot">
        Tüm oyunlar ücretsiz ve açık kaynak araçlarla yapıldı. İlerlemen bu cihazda saklanır.
      </footer>
    </div>
  );
}
