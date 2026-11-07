import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { KIT, CATS } from '../../kit/index.js';
import { countTris } from '../../kit/core.js';
import './kit.css';

export default function App() {
  const [cat, setCat] = useState(CATS[0]);
  const [sel, setSel] = useState(0);
  const [info, setInfo] = useState('');
  const box = useRef(null), st = useRef({});
  const list = KIT.filter((k) => k.cat === cat);
  const item = list[Math.min(sel, list.length - 1)];

  useEffect(() => {
    const el = box.current;
    const r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(r.domElement);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x9ec7e8);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
    sc.add(new THREE.HemisphereLight(0xdfeeff, 0x6a6a58, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(6, 12, 8); sc.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshLambertMaterial({ color: 0x7a9a5a })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
    const s = st.current; s.r = r; s.sc = sc; s.cam = cam; s.yaw = 0.6; s.dist = 8; s.h = 1; s.t = 0;
    const size = () => { const w = el.clientWidth, h = el.clientHeight; r.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); addEventListener('resize', size);
    let down = null, raf, last = performance.now();
    const pd = (e) => { down = e.clientX; s.auto = false; }, pm = (e) => { if (down != null) { s.yaw -= (e.clientX - down) * 0.01; down = e.clientX; } }, pu = () => { down = null; };
    r.domElement.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu);
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; s.t += dt;
      if (s.auto !== false) s.yaw += dt * 0.5;
      const d = s.dist; cam.position.set(Math.sin(s.yaw) * d, s.h * 0.7 + d * 0.28, Math.cos(s.yaw) * d); cam.lookAt(0, s.h * 0.45, 0);
      const o = s.obj; if (o) { const u = o.userData; if (u.anim) u.anim(dt, 1.2); if (u.spinners) u.spinners.forEach((x) => (x.rotation.y += dt * 25)); if (u.wheels) u.wheels.forEach((w) => (w.rotation.x -= dt * 4)); if (u.tick) u.tick(dt, s.t); }
      r.render(sc, cam); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.__kit = s;
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); r.dispose(); el.innerHTML = ''; };
  }, []);

  useEffect(() => {
    const s = st.current; if (!s.sc || !item) return;
    if (s.obj) s.sc.remove(s.obj);
    let o; try { o = item.make(); } catch (e) { console.error(item.id, e); setInfo('Hata: ' + e.message); return; }
    const b = new THREE.Box3().setFromObject(o); const sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    o.position.x -= c.x; o.position.z -= c.z; o.position.y -= b.min.y;
    const wrap = new THREE.Group(); wrap.add(o); wrap.userData = o.userData; s.sc.add(wrap); s.obj = wrap;
    const m = Math.max(sz.x, sz.y, sz.z); s.dist = Math.max(2, m * 2.7); s.h = sz.y;
    setInfo(`${sz.x.toFixed(1)}×${sz.y.toFixed(1)}×${sz.z.toFixed(1)} m · ${countTris(o)} üçgen`);
  }, [item && item.id]);

  return (
    <div className="kit">
      <div className="kit-top"><a href="/">←</a><b>Oyun Kiti</b><span>{KIT.length} obje</span></div>
      <div className="kit-cats">{CATS.map((c) => <button key={c} className={c === cat ? 'on' : ''} onClick={() => { setCat(c); setSel(0); }}>{c}</button>)}</div>
      <div className="kit-view" ref={box}><div className="kit-info"><b>{item && item.ad}</b><small>{info}</small></div></div>
      <div className="kit-list">{list.map((k, i) => <button key={k.id} className={k === item ? 'on' : ''} onClick={() => { setSel(i); st.current.auto = true; }}>{k.ad}</button>)}</div>
    </div>
  );
}
