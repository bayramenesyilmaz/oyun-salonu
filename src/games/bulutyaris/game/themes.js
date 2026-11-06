import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const Mx = (c, o) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const Bx = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });

function skyDome(top, mid, hor) {
  const g = new THREE.SphereGeometry(1100, 24, 16);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const a = new THREE.Color(top), b = new THREE.Color(mid), h = new THREE.Color(hor), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = clamp(pos.getY(i) / 1100, -0.2, 1);
    if (t < 0.18) c.copy(h).lerp(b, Math.max(0, t) / 0.18); else c.copy(b).lerp(a, (t - 0.18) / 0.82);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10;
  return m;
}
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function clouds(group, tr, n, y0, y1, big = false, color = 0xffffff, emis = 0x9ab4d0) {
  const cg = new THREE.IcosahedronGeometry(1, 0);
  const cm = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: emis, emissiveIntensity: 0.55 }), n * 4);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), s3 = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < n; i++) {
    let x, z;
    if (i < n * 0.48) {
      const j = Math.floor(Math.random() * tr.N), off = (Math.random() < 0.5 ? -1 : 1) * rnd(14, 90);
      x = tr.P[j].x + tr.R[j].x * off; z = tr.P[j].z + tr.R[j].z * off;
    } else { const a = Math.random() * 6.283, r = rnd(430, 1100); x = Math.cos(a) * r - 20; z = Math.sin(a) * r - 120; }
    const near = i < n * 0.48;
    const y = near ? rnd(y0, y1) : rnd(y0 - 10, y1 + 6) + (big && Math.random() < 0.15 ? rnd(20, 70) : 0);
    const sz = near ? rnd(6, 13) : rnd(18, 50);
    for (let p = 0; p < 4; p++) {
      ps.set(x + rnd(-sz, sz) * 0.8, y + rnd(-1, 1) * sz * 0.2, z + rnd(-sz, sz) * 0.8);
      const s = sz * rnd(0.55, 1);
      s3.set(s, s * 0.6, s);
      m4.compose(ps, q, s3);
      cm.setMatrixAt(k++, m4);
    }
  }
  group.add(cm);
}
const nearTrack = (tr, x, z, r) => tr.P.some((p, k) => k % 5 === 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < r * r);
function inst(group, geo, mat, list, colors) {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  list.forEach((o, i) => {
    e.set(o.rx || 0, o.ry || 0, 0);
    q.setFromEuler(e);
    m4.compose(p.set(o.x, o.y, o.z), q, s.set(o.sx, o.sy ?? o.sx, o.sz ?? o.sx));
    im.setMatrixAt(i, m4);
    if (colors) im.setColorAt(i, c.set(colors[i % colors.length]));
  });
  group.add(im);
  return im;
}

// Her tema: gökyüzü, sis, ışık ve aşağıdaki manzara. update(dt, t) isteğe bağlı.
export function buildTheme(def, tr) {
  const group = new THREE.Group();
  const theme = def.theme;
  const out = { group, fog: [0xcfe8fb, 90, 560], hemi: [0xcfe6ff, 0x9fb4d8, 1.35], sun: [0xfff0d0, 2.0, [-120, 200, 80]], update: null };
  const sunDisc = (color, x, y, z, r = 40) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), Bx(color, { fog: false }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    group.add(m);
  };

  if (theme === 'cloud') {
    group.add(skyDome('#2a74d6', '#6db8f0', '#dff1fd'));
    sunDisc(0xfff6c9, -520, 480, 380);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), Bx(0xe9f5ff));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -60;
    group.add(floor);
    clouds(group, tr, 420, -36, -16, true);
    const grass = Mx(0x6fc46a), rock = Mx(0x8a7a68), treeM = Mx(0x2f8f5a);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.283 + rnd(-0.2, 0.2), r = rnd(160, 420);
      const x = Math.cos(a) * r - 20, z = Math.sin(a) * r - 120, s = rnd(14, 34);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.9, 3, 7), grass);
      const bot = new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 1.1, 7), rock);
      bot.rotation.x = Math.PI;
      top.position.set(x, rnd(-25, 10), z);
      bot.position.set(x, top.position.y - 1.5 - s * 0.55, z);
      group.add(top, bot);
      for (let t = 0; t < 3; t++) {
        const tree = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 6), treeM);
        tree.position.set(x + rnd(-s * 0.6, s * 0.6), top.position.y + 4.5, z + rnd(-s * 0.6, s * 0.6));
        group.add(tree);
      }
    }
  }

  if (theme === 'city') {
    out.fog = [0xf0a37e, 80, 640];
    out.hemi = [0xffd2b8, 0x6a5a92, 1.25];
    out.sun = [0xffb070, 1.8, [200, 90, -120]];
    group.add(skyDome('#25307f', '#c4568f', '#ffb784'));
    sunDisc(0xffd9a0, 560, 150, -420, 80);
    const win = canvasTex(32, 64, (g, w, h) => {
      g.fillStyle = '#1e2240'; g.fillRect(0, 0, w, h);
      for (let y = 2; y < h; y += 4) for (let x = 2; x < w; x += 4) { if (Math.random() < 0.55) { g.fillStyle = Math.random() < 0.8 ? '#ffd27a' : '#9fe3ff'; g.fillRect(x, y, 2, 2); } }
    });
    const mat = new THREE.MeshLambertMaterial({ map: win, emissive: 0xffffff, emissiveMap: win, emissiveIntensity: 0.85 });
    const list = [];
    for (let gx = -760; gx <= 760; gx += 40) for (let gz = -980; gz <= 560; gz += 40) {
      if (Math.random() < 0.16) continue;
      const w = rnd(18, 32), d = rnd(18, 32), top = -48 - Math.pow(Math.random(), 1.6) * 110 + (Math.random() < 0.05 ? 80 : 0);
      const near = tr.P.some((p, i) => i % 12 === 0 && (p.x - gx) ** 2 + (p.z - gz) ** 2 < 55 * 55);
      const t2 = near ? Math.min(top, -50) : top;
      list.push({ x: gx + rnd(-4, 4), z: gz + rnd(-4, 4), y: (t2 - 300) / 2, sx: w, sy: t2 + 300, sz: d });
    }
    inst(group, new THREE.BoxGeometry(1, 1, 1), mat, list);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), Bx(0x15172c));
    road.rotation.x = -Math.PI / 2; road.position.y = -302;
    group.add(road);
    clouds(group, tr, 140, -34, -22, false, 0xffd8c8, 0xd08aa0);
    // yanıp sönen kule ışıkları
    const beacons = [];
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, r = rnd(120, 520); beacons.push({ x: Math.cos(a) * r - 20, y: rnd(-50, -14), z: Math.sin(a) * r - 120, sx: 2.5 }); }
    const bm = inst(group, new THREE.IcosahedronGeometry(1, 0), Bx(0xff4d4d), beacons);
    out.update = (dt, t) => { bm.visible = Math.floor(t * 1.4) % 2 === 0; };
  }

  if (theme === 'ocean') {
    out.fog = [0xc4e6f6, 120, 760];
    out.hemi = [0xe4f3ff, 0x6aa6c8, 1.35];
    out.sun = [0xfff0cf, 2.1, [-200, 120, 160]];
    group.add(skyDome('#1d6fc4', '#74c3ea', '#ffe9b8'));
    sunDisc(0xfff2c0, -600, 220, 420, 60);
    const wt = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#1f84c6'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(200,238,255,.55)'; g.lineWidth = 2;
      for (let i = 0; i < 16; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 5, x + 18, y); g.stroke(); }
    }, 90, 90);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), Bx(0xffffff, { map: wt }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -62;
    group.add(sea);
    const sand = Mx(0xf0d9a0), palm = Mx(0x2e9b52), trunk = Mx(0x8a5a2b), rock = Mx(0x7a8190);
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * 6.283, r = rnd(120, 650);
      const x = Math.cos(a) * r - 20, z = Math.sin(a) * r - 120, s = rnd(18, 50);
      if (nearTrack(tr, x, z, s + 50)) continue;
      const isl = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.8, s, 8, 8), sand);
      isl.position.set(x, -60, z);
      group.add(isl);
      for (let k = 0; k < 4; k++) {
        const px = x + rnd(-s * 0.4, s * 0.4), pz = z + rnd(-s * 0.4, s * 0.4), hh = rnd(9, 15);
        const tr1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, hh, 5), trunk);
        tr1.position.set(px, -56 + hh / 2, pz);
        const lf = new THREE.Mesh(new THREE.ConeGeometry(5, 3, 6), palm);
        lf.position.set(px, -56 + hh, pz);
        group.add(tr1, lf);
      }
    }
    for (let i = 0; i < 16; i++) { const a = Math.random() * 6.283, r = rnd(140, 600), h = rnd(30, 90); if (nearTrack(tr, Math.cos(a) * r - 20, Math.sin(a) * r - 120, 70)) continue; const rk = new THREE.Mesh(new THREE.ConeGeometry(rnd(10, 22), h, 6), rock); rk.position.set(Math.cos(a) * r - 20, -62 + h / 2 - 6, Math.sin(a) * r - 120); group.add(rk); }
    const hull = Mx(0xffffff), sail = Mx(0xff5a4a, { side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.283, r = rnd(100, 500);
      const b = new THREE.Group();
      const hu = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 9), hull); hu.position.y = 0.7;
      const sa = new THREE.Mesh(new THREE.ConeGeometry(3.2, 10, 3), sail); sa.position.y = 6.4; sa.rotation.y = 1;
      b.add(hu, sa);
      b.position.set(Math.cos(a) * r - 20, -61.3, Math.sin(a) * r - 120);
      b.rotation.y = Math.random() * 6;
      group.add(b);
    }
    clouds(group, tr, 130, -34, -20);
    out.update = (dt) => { wt.offset.x += dt * 0.004; wt.offset.y += dt * 0.002; };
  }

  if (theme === 'forest') {
    out.fog = [0xbfe3c8, 60, 470];
    out.hemi = [0xe6ffe0, 0x4a7a4a, 1.3];
    out.sun = [0xfff3c8, 1.9, [-80, 220, 120]];
    group.add(skyDome('#3f9ad8', '#9fd8cc', '#e8f7d8'));
    sunDisc(0xfffad0, -480, 520, 300, 50);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), Bx(0x1d4a2c));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -78;
    group.add(floor);
    const greens = [0x2c7a3a, 0x358f43, 0x246b33, 0x3f9d4a, 0x1f5e2c];
    const list = [];
    for (let i = 0; i < 1500; i++) {
      const a = Math.random() * 6.283, r = Math.pow(Math.random(), 0.7) * 820;
      const x = Math.cos(a) * r - 20, z = Math.sin(a) * r - 120;
      const s = rnd(9, 18);
      list.push({ x, z, y: rnd(-62, -40), sx: s, sy: s * 0.7, sz: s });
    }
    inst(group, new THREE.IcosahedronGeometry(1, 0), Mx(0xffffff), list, greens);
    // nehir
    const rv = new THREE.Mesh(new THREE.PlaneGeometry(26, 2400), Bx(0x2f9fd0));
    rv.rotation.x = -Math.PI / 2; rv.rotation.z = 0.5; rv.position.set(40, -39, -100);
    group.add(rv);
    // dev ağaçlar yol kenarında
    const trunk = Mx(0x6b4a2b), crown = Mx(0x2a8a3c);
    for (let i = 0; i < 40; i++) {
      const j = Math.floor(Math.random() * tr.N), off = (Math.random() < 0.5 ? -1 : 1) * rnd(26, 110);
      const x = tr.P[j].x + tr.R[j].x * off, z = tr.P[j].z + tr.R[j].z * off, h = rnd(26, 44);
      const tk = new THREE.Mesh(new THREE.CylinderGeometry(2, 3.4, h, 6), trunk);
      tk.position.set(x, -42 + h / 2, z);
      const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(12, 18), 0), crown);
      cr.position.set(x, -42 + h, z); cr.scale.y = 0.65;
      group.add(tk, cr);
    }
    clouds(group, tr, 150, -34, -22, false, 0xf2fff0, 0xa9cbb0);
  }

  if (theme === 'space') {
    out.fog = [0x070818, 160, 900];
    out.hemi = [0x9a8cff, 0x201a4a, 1.0];
    out.sun = [0xffffff, 1.9, [150, 180, 100]];
    const sk = new THREE.Mesh(new THREE.SphereGeometry(1100, 16, 12), Bx(0x03040c, { side: THREE.BackSide, fog: false, depthWrite: false }));
    sk.renderOrder = -10;
    group.add(sk);
    const pts = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = 1000, s = Math.sqrt(1 - u * u); pts.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, fog: false }));
    group.add(stars);
    // nebula bulutları
    for (const [c, x, y, z, r] of [[0x7a3cff, -500, 200, -600, 260], [0x1fb6ff, 600, 120, -300, 220], [0xff3c9a, 100, 300, 700, 240]]) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), Bx(c, { transparent: true, opacity: 0.14, fog: false, depthWrite: false }));
      n.position.set(x, y, z);
      group.add(n);
    }
    // gezegen + halka
    const pl = new THREE.Mesh(new THREE.SphereGeometry(170, 28, 20), Mx(0xd9825b));
    pl.position.set(-420, -90, -560);
    const ring = new THREE.Mesh(new THREE.RingGeometry(230, 330, 40), Bx(0xe9c79a, { side: THREE.DoubleSide, transparent: true, opacity: 0.7, fog: false }));
    ring.position.copy(pl.position); ring.rotation.x = 1.25; ring.rotation.y = 0.3;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(60, 16, 12), Mx(0xc8cbe0));
    moon.position.set(520, 60, 420);
    const blue = new THREE.Mesh(new THREE.SphereGeometry(90, 20, 14), Mx(0x3f7fe0));
    blue.position.set(480, -120, -520);
    group.add(pl, ring, moon, blue);
    // asteroitler
    const list = [];
    for (let i = 0; i < 220; i++) {
      const a = Math.random() * 6.283, r = rnd(60, 760);
      const ax = Math.cos(a) * r - 20, az = Math.sin(a) * r - 120;
      if (tr.P.some((p, k) => k % 6 === 0 && (p.x - ax) ** 2 + (p.z - az) ** 2 < 70 * 70)) continue;
      list.push({ x: Math.cos(a) * r - 20, y: rnd(-120, 90), z: Math.sin(a) * r - 120, sx: rnd(3, 20), sy: rnd(3, 16), sz: rnd(3, 20), rx: rnd(0, 6), ry: rnd(0, 6) });
    }
    const ast = inst(group, new THREE.DodecahedronGeometry(1, 0), Mx(0x8a8798), list);
    out.update = (dt, t) => { ast.rotation.y = t * 0.004; pl.rotation.y = t * 0.02; };
    // neon çizgi: yol altı ışığı (parlak şerit için ek yok, renkli bordür yeterli)
  }
  return out;
}
