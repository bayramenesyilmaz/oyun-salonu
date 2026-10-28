// Oyun içi arayüz: hedefler, pusula, sağlık, mühimmat, ekip, tespit, dürbün, altyazı.
const DIRS = [
  ['K', 0], ['KD', 45], ['D', 90], ['GD', 135], ['G', 180], ['GB', 225], ['B', 270], ['KB', 315],
];

function Compass({ heading }) {
  // heading: yaw (0 = kuzey/−Z). Pusula derecesi: kuzeyden saat yönünde
  const deg = ((-heading * 180) / Math.PI + 360) % 360;
  const items = [];
  for (const [l, d] of DIRS) {
    for (const off of [-360, 0, 360]) {
      const rel = d + off - deg;
      if (Math.abs(rel) <= 70) items.push(<span key={l + off} className={'cmp-l' + (l.length === 1 ? ' main' : '')} style={{ left: `${50 + (rel / 70) * 50}%` }}>{l}</span>);
    }
  }
  for (let d = 0; d < 360; d += 15) {
    for (const off of [-360, 0, 360]) {
      const rel = d + off - deg;
      if (Math.abs(rel) <= 70 && d % 45) items.push(<i key={'t' + d + off} className="cmp-t" style={{ left: `${50 + (rel / 70) * 50}%` }} />);
    }
  }
  return (
    <div className="compass">
      {items}
      <b className="cmp-n">{Math.round(deg)}°</b>
    </div>
  );
}

export function HUD({ touch = false, hud, objectives, subtitle, hints, toasts, hitmarker, damages, banner, progress, locked, settings }) {
  if (!hud) return null;
  const binoZoom = hud.equipped === 'binoculars' && hud.ads > 0.85;
  const rifleAds = hud.equipped === 'rifle' && hud.ads > 0.6;
  const gap = 6 + Math.min(40, hud.spread * 900);
  return (
    <div className={'hud' + (hud.slow ? ' slow' : '')}>
      {binoZoom && (
        <div className="bino">
          <svg className="bino-svg" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="lens">
                <stop offset="0.86" stopColor="#000" />
                <stop offset="1" stopColor="#fff" />
              </radialGradient>
              <mask id="binoMask">
                <rect x="-50" y="-50" width="260" height="190" fill="#fff" />
                <circle cx="61" cy="45" r="41" fill="url(#lens)" />
                <circle cx="99" cy="45" r="41" fill="url(#lens)" />
              </mask>
            </defs>
            <rect x="-50" y="-50" width="260" height="190" fill="#000" mask="url(#binoMask)" />
          </svg>
          <div className="bino-cross">
            <i className="h" />
            <i className="v" />
            {[-3, -2, -1, 1, 2, 3].map((k) => <i key={k} className="mil" style={{ left: `calc(50% + ${k * 4}vh)` }} />)}
          </div>
          <div className="bino-read">
            <span>MESAFE {hud.bino?.dist != null ? `${hud.bino.dist} m` : '— — —'}</span>
            <span>HEDEF {hud.bino?.marked ?? 0}/{hud.bino?.total ?? 3}</span>
          </div>
          {hud.bino?.focus && (
            <div className={'bino-target' + (hud.bino.focus.blocked ? ' blocked' : '')}>
              <span>{hud.bino.focus.label}</span>
              <div className="bar"><div style={{ width: `${hud.bino.focus.progress * 100}%` }} /></div>
            </div>
          )}
        </div>
      )}

      <div className="top">
        <Compass heading={hud.heading} />
        {hud.detect > 0.02 && (
          <div className={'detect' + (hud.detect >= 1 ? ' full' : '')}>
            <svg viewBox="0 0 40 24" width="40" height="24">
              <path d="M2 12 Q20 -4 38 12 Q20 28 2 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="20" cy="12" r="5" fill="currentColor" opacity={0.3 + hud.detect * 0.7} />
            </svg>
            <div className="bar"><div style={{ width: `${hud.detect * 100}%` }} /></div>
          </div>
        )}
      </div>

      <div className="objectives" style={{ opacity: binoZoom ? 0 : 1 }}>
        {objectives.map((o) => (
          <div key={o.id} className={'obj' + (o.done ? ' done' : '') + (o.failed ? ' failed' : '') + (o.optional ? ' opt' : '')}>
            <i />
            <span>{o.text}</span>
          </div>
        ))}
      </div>

      {hud.wp && !binoZoom && (
        <div className={'waypoint' + (hud.wp.edge ? ' edge' : '') + (hud.wp.optional ? ' opt' : '')} style={{ left: `${hud.wp.x}%`, top: `${hud.wp.y}%` }}>
          <i />
          <span>{hud.wp.dist} m</span>
        </div>
      )}

      {!binoZoom && !rifleAds && hud.owned.rifle && hud.equipped === 'rifle' && (
        <div className="crosshair" style={{ '--g': `${gap}px` }}>
          <i className="l" /><i className="r" /><i className="t" /><i className="b" />
        </div>
      )}
      {!hud.owned.rifle && <div className="dot" />}
      {hitmarker && <div key={hitmarker.id} className={'hitmark' + (hitmarker.kill ? ' kill' : '')} />}
      {damages.map((d) => (
        <div key={d.id} className="dmg" style={{ transform: `translate(-50%,-50%) rotate(${-d.ang}rad)` }}><i /></div>
      ))}

      {hud.prompt && !binoZoom && (
        <div className="prompt">{!touch && <kbd>E</kbd>} {hud.prompt}</div>
      )}
      {progress && (
        <div className="progress" key={progress.id}>
          <span>{progress.label}</span>
          <div className="bar"><div style={{ animationDuration: `${progress.dur}s` }} /></div>
        </div>
      )}
      {banner && <div className="banner" key={banner.id}>{banner.text}</div>}

      <div className="left-bottom">
        <div className="hp">
          <span className="lbl">SAĞLIK</span>
          <div className="bar"><div className={hud.health < 35 ? 'low' : ''} style={{ width: `${hud.health}%` }} /></div>
        </div>
        {hud.squad && (
          <div className="unit">
            <span className={'pip' + (hud.squad.down ? ' down' : '')} />
            <b>Kemal</b>
            <span>{hud.squad.down ? 'YARALI — E ilk yardım' : `${hud.squad.order === 'follow' ? 'Takip' : 'Bekle'} · ${hud.squad.free ? 'Ateş serbest' : 'Ateş tut'}`}</span>
            <small>G · T</small>
          </div>
        )}
        {hud.civ && (
          <div className="unit civ">
            <span className={'pip' + (hud.civ.state === 'lost' ? ' down' : hud.civ.state === 'safe' ? ' safe' : '')} />
            <b>{hud.civ.name}</b>
            <span>{{ follow: 'Takip ediyor', wait: 'Bekliyor', cover: 'Siperde', safe: 'Güvende', lost: 'Kaybedildi' }[hud.civ.state] || ''}</span>
          </div>
        )}
      </div>

      <div className="right-bottom">
        {hud.owned.rifle && (
          <>
            <div className="weapon">
              <span className="wname">{hud.equipped === 'rifle' ? 'Piyade tüfeği' : 'Dürbün 8×'}</span>
              {hud.equipped === 'rifle' && (
                <span className={'ammo' + (hud.ammo <= 5 ? ' low' : '')}>
                  {hud.reloading ? '…' : hud.ammo}
                  <small>/ {hud.reserve}</small>
                </span>
              )}
            </div>
            <div className="slots">
              <span className={hud.equipped === 'rifle' ? 'on' : ''}>1</span>
              <span className={hud.equipped === 'binoculars' ? 'on' : ''}>2</span>
              <span className={'lampk' + (hud.lamp ? ' on' : '')}>F</span>
            </div>
            <div className={'focus' + (hud.focusActive ? ' active' : '')}>
              <span>ODAK · V</span>
              <div className="bar"><div style={{ width: `${hud.focus * 100}%` }} /></div>
            </div>
          </>
        )}
      </div>

      {hud.crouch && <div className="stance">ÇÖMELMİŞ</div>}

      <div className="toasts">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>
      <div className="hints">
        {hints.map((h) => <div key={h.id} className="hint">{h.text}</div>)}
      </div>
      {subtitle && settings.subtitles && (
        <div className="subtitle">
          <b style={{ color: subtitle.color }}>{subtitle.who}</b> {subtitle.text}
        </div>
      )}
      {!locked && !touch && <div className="lock-hint">Fareyi kilitlemek için ekrana tıkla</div>}
      {hud.fps != null && <div className="fps">{hud.fps} fps</div>}
    </div>
  );
}
