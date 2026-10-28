import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './textures.js';

// Köyün tamamı burada kodla kurulur.
// Koordinatlar: kuyu (0,0), kuzey -Z, doğu +X, güney +Z.

export const VILLAGE_R = 47.5;
export const STREAM_Z = 55;
const WALL_T = 0.45;

export function buildWorld(scene, T) {
  const r = rng(42);
  const colliders = []; // {minX,maxX,minZ,maxZ,id}
  const batches = new Map(); // material -> geometry[]
  const animated = []; // her karede çağrılacak fonksiyonlar

  // ---------- Malzemeler ----------
  const M = {
    plaster: new MeshStd(T.plaster, 0.95, { bumpMap: T.plaster, bumpScale: 1.2 }),
    stone: new MeshStd(T.stone, 0.92, { bumpMap: T.stone, bumpScale: 2 }),
    wood: new MeshStd(T.wood, 0.85, { bumpMap: T.wood, bumpScale: 0.8 }),
    roof: new MeshStd(T.roof, 1),
    darkWood: new MeshStd(T.wood, 0.9, { color: 0x6b5a4a }),
    window: new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.4 }),
    kilim: new MeshStd(T.kilim, 0.95),
    floor: new MeshStd(T.wood, 0.9, { color: 0x9a8a78 }),
    hay: new THREE.MeshStandardMaterial({ color: 0x8a7444, roughness: 1, map: T.ground }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.55, metalness: 0.6 }),
  };

  function MeshStd(map, rough, extra = {}) {
    return new THREE.MeshStandardMaterial({ map, roughness: rough, ...extra });
  }

  // Dünya boyutuna göre UV'leri ölçeklenmiş kutu
  function boxGeo(w, h, d, tile = 3) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [
      [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * (dims[f][0] / tile), uv.getY(i) * (dims[f][1] / tile));
      }
    }
    return g;
  }

  function batch(mat, geo) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(geo);
  }

  // Statik kutu: birleştirilecek geometriye eklenir, istenirse çarpışma kutusu da olur
  function addBox(mat, w, h, d, x, y, z, { collide = true, ry = 0, tile = 3 } = {}) {
    const g = boxGeo(w, h, d, tile);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    batch(mat, g);
    if (collide) {
      const cw = ry ? Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d : w;
      const cd = ry ? Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d : d;
      colliders.push({ minX: x - cw / 2, maxX: x + cw / 2, minZ: z - cd / 2, maxZ: z + cd / 2, maxY: y + h / 2 });
    }
    return g;
  }

  function addCollider(x, z, w, d, id) {
    const c = { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, id };
    colliders.push(c);
    return c;
  }

  // ---------- Zemin ----------
  function heightAt(x, z) {
    const rr = Math.hypot(x, z);
    let h = 0;
    if (rr > 52) {
      // köy sığ bir yayla çanağında: yumuşak, alçak tepeler
      const k = rr - 52;
      const rise = Math.min(9, k * 0.16);
      h = rise * (0.75 + 0.25 * Math.sin(Math.atan2(z, x) * 5 + 1.3)) +
        Math.sin(x * 0.09) * Math.cos(z * 0.07) * Math.min(k * 0.05, 1.6);
    }
    // yol koridoru düz kalsın
    if (Math.abs(x) < 7 && z > 40 && z < 95) h *= Math.min(1, Math.abs(x) / 7) ** 2;
    // köy yolunu kesen dere (köprü altında yol düz kalır)
    const dz = Math.abs(z - STREAM_Z);
    if (dz < 2.4 && Math.abs(x) > 4.4) h -= 0.75 * Math.cos((dz / 2.4) * Math.PI * 0.5) * Math.min(1, (Math.abs(x) - 4.4) / 1.2);
    return h;
  }

  {
    const g = new THREE.PlaneGeometry(320, 320, 160, 160);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({ map: T.ground, roughness: 1, bumpMap: T.ground, bumpScale: 1.5 })
    );
    T.ground.repeat.set(60, 60);
    ground.receiveShadow = true;
    scene.add(ground);

    // Toprak yol
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3024, roughness: 1, map: T.ground, transparent: true, opacity: 0.85 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 100, 1, 1), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 50);
    road.receiveShadow = true;
    scene.add(road);
  }

  // ---------- Gökyüzü, ay, yıldızlar, dağlar ----------
  {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {},
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `varying vec3 vP; void main(){
          float h = clamp(vP.y + 0.02, -0.2, 1.0);
          vec3 horizon = vec3(0.105,0.13,0.18);
          vec3 top = vec3(0.012,0.018,0.034);
          vec3 c = mix(horizon, top, smoothstep(0.0, 0.55, h));
          // ayın olduğu yöne hafif aydınlık
          vec3 moonDir = normalize(vec3(-0.45, 0.42, -0.78));
          c += vec3(0.07,0.085,0.11) * pow(max(dot(vP, moonDir),0.0), 8.0);
          gl_FragColor = vec4(c,1.0);
        }`,
      })
    );
    sky.renderOrder = -10;
    scene.add(sky);

    const starG = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < 1400; i++) {
      const a = r() * Math.PI * 2, y = 0.12 + r() * 0.88;
      const rad = Math.sqrt(1 - y * y);
      pos.push(Math.cos(a) * rad * 380, y * 380, Math.sin(a) * rad * 380);
    }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const stars = new THREE.Points(
      starG,
      new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, color: 0xb8c4dc, fog: false, transparent: true, opacity: 0.75, depthWrite: false })
    );
    scene.add(stars);

    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.moon, fog: false, depthWrite: false, transparent: true }));
    moon.scale.set(70, 70, 1);
    moon.position.set(-0.45, 0.42, -0.78).normalize().multiplyScalar(360);
    scene.add(moon);

    // Doğu ufkunda dağ silüetleri (bulmaca için "dağa bakan taş")
    const mg = [];
    for (let layer = 0; layer < 2; layer++) {
      const R = 230 + layer * 50;
      const pts = [];
      const N = 90;
      for (let i = 0; i <= N; i++) {
        const a = -Math.PI * 0.42 + (i / N) * Math.PI * 0.84; // doğu yarısı
        const hh =
          28 + layer * 18 +
          Math.sin(i * 0.31 + layer) * 14 +
          Math.sin(i * 0.11 + layer * 3) * 22 +
          (r() - 0.5) * 6;
        pts.push([Math.cos(a) * R, Math.sin(a) * R, Math.max(6, hh)]);
      }
      const verts = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0, h0] = pts[i];
        const [x1, z1, h1] = pts[i + 1];
        verts.push(x0, -5, z0, x1, -5, z1, x1, h1, z1, x0, -5, z0, x1, h1, z1, x0, h0, z0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const col = layer === 0 ? 0x0b0e14 : 0x141a24;
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, fog: false, side: THREE.DoubleSide }));
      m.renderOrder = -9 + (1 - layer);
      mg.push(m);
      scene.add(m);
    }
  }

  // ---------- Ev üretici ----------
  const windows = [];
  const doorways = []; // varlığın evlere girebilmesi için

  function wallWithDoor(axis, fixed, from, to, h, doorCenter, doorW, mat) {
    // axis 'x': duvar x boyunca uzanır, z = fixed. axis 'z': duvar z boyunca, x = fixed.
    const segs = [];
    if (doorCenter == null) segs.push([from, to]);
    else {
      segs.push([from, doorCenter - doorW / 2]);
      segs.push([doorCenter + doorW / 2, to]);
    }
    for (const [a, b] of segs) {
      const len = b - a;
      if (len <= 0.05) continue;
      const c = (a + b) / 2;
      if (axis === 'x') addBox(mat, len, h, WALL_T, c, h / 2, fixed);
      else addBox(mat, WALL_T, h, len, fixed, h / 2, c);
    }
    if (doorCenter != null) {
      doorways.push(axis === 'x' ? { x: doorCenter, z: fixed, axis, w: doorW } : { x: fixed, z: doorCenter, axis, w: doorW });
      const lh = h - 2.15;
      if (axis === 'x') addBox(mat, doorW, lh, WALL_T, doorCenter, 2.15 + lh / 2, fixed, { collide: false });
      else addBox(mat, WALL_T, lh, doorW, fixed, 2.15 + lh / 2, doorCenter, { collide: false });
      // ahşap kapı kasası
      const fw = 0.12;
      if (axis === 'x') {
        addBox(M.darkWood, fw, 2.15, WALL_T + 0.06, doorCenter - doorW / 2 + fw / 2, 1.075, fixed, { collide: false, tile: 1 });
        addBox(M.darkWood, fw, 2.15, WALL_T + 0.06, doorCenter + doorW / 2 - fw / 2, 1.075, fixed, { collide: false, tile: 1 });
        addBox(M.darkWood, doorW, fw, WALL_T + 0.06, doorCenter, 2.15 - fw / 2, fixed, { collide: false, tile: 1 });
      } else {
        addBox(M.darkWood, WALL_T + 0.06, 2.15, fw, fixed, 1.075, doorCenter - doorW / 2 + fw / 2, { collide: false, tile: 1 });
        addBox(M.darkWood, WALL_T + 0.06, 2.15, fw, fixed, 1.075, doorCenter + doorW / 2 - fw / 2, { collide: false, tile: 1 });
        addBox(M.darkWood, WALL_T + 0.06, fw, doorW, fixed, 2.15 - fw / 2, doorCenter, { collide: false, tile: 1 });
      }
    }
  }

  function ruinWall(axis, fixed, from, to, h, mat) {
    // parçalı, yer yer yıkılmış duvar
    let a = from;
    while (a < to - 0.1) {
      const len = Math.min(to - a, 0.9 + r() * 2.2);
      if (r() < 0.78) {
        const hh = h * (0.25 + r() * 0.75);
        const c = a + len / 2;
        if (axis === 'x') addBox(mat, len, hh, WALL_T, c, hh / 2, fixed);
        else addBox(mat, WALL_T, hh, len, fixed, hh / 2, c);
      }
      a += len;
    }
  }

  function house({ cx, cz, w, d, h = 2.9, door = 'S', doorW = 1.1, doorOff = 0, ruin = false, mat = M.plaster, win = true }) {
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const t = WALL_T;
    const sides = {
      N: ['x', z0 + t / 2, x0, x1],
      S: ['x', z1 - t / 2, x0, x1],
      W: ['z', x0 + t / 2, z0 + t, z1 - t],
      E: ['z', x1 - t / 2, z0 + t, z1 - t],
    };
    for (const k of Object.keys(sides)) {
      const [axis, fixed, from, to] = sides[k];
      if (ruin) {
        if (k === door) {
          const mid = (from + to) / 2 + doorOff;
          doorways.push(axis === 'x' ? { x: mid, z: fixed, axis, w: doorW } : { x: fixed, z: mid, axis, w: doorW });
          ruinWall(axis, fixed, from, mid - doorW / 2 - 0.2, h, mat);
          ruinWall(axis, fixed, mid + doorW / 2 + 0.2, to, h, mat);
        } else ruinWall(axis, fixed, from, to, h, mat);
      } else {
        const dc = k === door ? (from + to) / 2 + doorOff : null;
        wallWithDoor(axis, fixed, from, to, h, dc, doorW, mat);
      }
    }
    // taş temel kuşağı
    if (!ruin) {
      addBox(M.stone, w + 0.12, 0.45, 0.12, cx, 0.22, z0 - 0.02, { collide: false });
      addBox(M.stone, w + 0.12, 0.45, 0.12, cx, 0.22, z1 + 0.02, { collide: false });
      addBox(M.stone, 0.12, 0.45, d, x0 - 0.02, 0.22, cz, { collide: false });
      addBox(M.stone, 0.12, 0.45, d, x1 + 0.02, 0.22, cz, { collide: false });
      // zemin
      addBox(M.floor, w - t * 2, 0.04, d - t * 2, cx, 0.02, cz, { collide: false, tile: 2 });
      // toprak dam + saçak
      addBox(M.roof, w + 0.6, 0.35, d + 0.6, cx, h + 0.17, cz, { collide: false, tile: 4 });
      addBox(M.darkWood, w + 0.7, 0.12, d + 0.7, cx, h - 0.02, cz, { collide: false, tile: 2 });
      // dışarı taşan hatıl uçları
      for (let i = 0; i < Math.floor(w / 1.1); i++) {
        const xx = x0 + 0.5 + i * 1.1;
        for (const zz of [z0 - 0.35, z1 + 0.35]) addBox(M.darkWood, 0.16, 0.16, 0.5, xx, h - 0.15, zz, { collide: false, tile: 1 });
      }
      // damdaki loğ taşı
      if (r() < 0.6) {
        const lg = new THREE.CylinderGeometry(0.22, 0.22, 0.8, 10);
        lg.rotateZ(Math.PI / 2);
        lg.translate(cx + (r() - 0.5) * w * 0.5, h + 0.57, cz + (r() - 0.5) * d * 0.5);
        batch(M.stone, lg);
      }
      // sahte pencereler
      if (win) {
        for (const k of ['N', 'E', 'W', 'S']) {
          if (k === door || r() < 0.35) continue;
          const [axis, fixed] = sides[k];
          const out = k === 'N' || k === 'W' ? -1 : 1;
          const along = axis === 'x' ? cx + (r() - 0.5) * (w - 2.5) : cz + (r() - 0.5) * (d - 2.5);
          const off = fixed + out * (t / 2 + 0.01);
          const pw = 0.7, ph = 0.6;
          const g = new THREE.PlaneGeometry(pw, ph);
          if (axis === 'x') {
            if (out < 0) g.rotateY(Math.PI);
            g.translate(along, 1.55, off);
            addBox(M.darkWood, pw + 0.16, 0.08, 0.1, along, 1.55 - ph / 2, off, { collide: false, tile: 1 });
          } else {
            g.rotateY(out > 0 ? Math.PI / 2 : -Math.PI / 2);
            g.translate(off, 1.55, along);
            addBox(M.darkWood, 0.1, 0.08, pw + 0.16, off, 1.55 - ph / 2, along, { collide: false, tile: 1 });
          }
          windows.push(g);
        }
      }
    } else {
      // moloz
      for (let i = 0; i < 8; i++) {
        const s = 0.2 + r() * 0.45;
        const rg = new THREE.DodecahedronGeometry(s, 0);
        rg.scale(1, 0.6, 1);
        rg.translate(x0 + r() * w, s * 0.3, z0 + r() * d);
        batch(M.stone, rg);
      }
      addBox(M.darkWood, 0.15, 0.15, d * 0.9, cx + (r() - 0.5), 0.3, cz, { collide: false, ry: 0.4 + r(), tile: 1 });
    }
  }

  // ---------- Etkileşim nesneleri ----------
  const refs = { pages: {}, hiding: [], dials: {} };

  function paper(id, x, y, z, ry = 0) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.32),
      new THREE.MeshStandardMaterial({ map: T.paper, roughness: 0.9, emissive: 0x8a7a50, emissiveIntensity: 0.18, side: THREE.DoubleSide })
    );
    m.rotation.set(-Math.PI / 2, 0, ry);
    m.position.set(x, y + 0.006, z);
    m.userData.interactId = id;
    scene.add(m);
    // fark edilsin diye zayıf parıltı
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: T.dot, color: 0xd8c08a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.scale.set(0.9, 0.9, 1);
    glow.position.set(x, y + 0.1, z);
    scene.add(glow);
    animated.push((dt, tt) => {
      glow.material.opacity = m.visible ? 0.12 + Math.sin(tt * 2.2 + x) * 0.06 : 0;
    });
    m.userData.glow = glow;
    refs.pages[id] = m;
    return m;
  }

  function yukluk(id, x, z, facing) {
    // Geleneksel yüklük: duvara gömülü ahşap dolap. Saklanma yeri.
    const alongX = facing === 'N' || facing === 'S';
    const W = 1.3, D = 0.7, H = 2.2;
    const sx = alongX ? W : D, sz = alongX ? D : W;
    addBox(M.darkWood, sx, H, sz, x, H / 2, z, { tile: 1.2 });
    const dir = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[facing];
    // kapak çizgileri (iki kanat)
    const panel = new THREE.Mesh(
      boxGeo(alongX ? 1.2 : 0.04, 2.0, alongX ? 0.04 : 1.2, 1),
      new THREE.MeshStandardMaterial({ map: T.wood, color: 0x8a6e52, roughness: 0.8 })
    );
    panel.position.set(x + dir[0] * (D / 2 + 0.02), 1.1, z + dir[1] * (D / 2 + 0.02));
    panel.castShadow = true;
    panel.receiveShadow = true;
    scene.add(panel);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.metal);
    knob.position.copy(panel.position).add(new THREE.Vector3(dir[0] * 0.04, 0, dir[1] * 0.04));
    scene.add(knob);
    panel.userData.interactId = id;
    refs.hiding.push({
      id,
      kind: 'yukluk',
      object: panel,
      inside: new THREE.Vector3(x, 1.45, z),
      yaw: Math.atan2(-dir[0], -dir[1]),
      exit: new THREE.Vector3(x + dir[0] * 1.05, 0, z + dir[1] * 1.05),
    });
  }

  function hay(id, x, z, s = 1) {
    const g = new THREE.SphereGeometry(1.1 * s, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1.1, 1.0, 0.95);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n = 1 + (r() - 0.5) * 0.12;
      p.setXYZ(i, p.getX(i) * n, p.getY(i) * n, p.getZ(i) * n);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, M.hay);
    m.position.set(x, 0, z);
    m.castShadow = m.receiveShadow = true;
    m.userData.interactId = id;
    scene.add(m);
    // dağınık saman çöpleri
    for (let i = 0; i < 6; i++) {
      const sg = new THREE.PlaneGeometry(0.5, 0.02);
      sg.rotateX(-Math.PI / 2);
      sg.rotateY(r() * Math.PI);
      sg.translate(x + (r() - 0.5) * 3, 0.03, z + (r() - 0.5) * 3);
      batch(M.hay, sg);
    }
    addCollider(x, z, 1.9 * s, 1.8 * s);
    refs.hiding.push({
      id,
      kind: 'saman',
      object: m,
      inside: new THREE.Vector3(x, 0.75, z),
      yaw: 0,
      exit: null, // en yakın boş noktaya çıkılır
      radius: 1.6 * s,
    });
  }

  function table(x, z, round = true) {
    if (round) {
      // sini + ayak
      const top = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 20);
      top.translate(x, 0.38, z);
      batch(M.metal, top);
      const leg = new THREE.CylinderGeometry(0.35, 0.42, 0.36, 10, 1, true);
      leg.translate(x, 0.18, z);
      batch(M.darkWood, leg);
      addCollider(x, z, 1.0, 1.0);
      return 0.4;
    }
    addBox(M.darkWood, 1.4, 0.06, 0.7, x, 0.78, z, { collide: false, tile: 1 });
    for (const [dx, dz] of [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]])
      addBox(M.darkWood, 0.06, 0.75, 0.06, x + dx, 0.375, z + dz, { collide: false, tile: 1 });
    addCollider(x, z, 1.4, 0.7);
    return 0.81;
  }

  function sedir(x, z, w, d) {
    addBox(M.darkWood, w, 0.4, d, x, 0.2, z, { tile: 1.5 });
    addBox(M.kilim, w - 0.1, 0.1, d - 0.1, x, 0.45, z, { collide: false, tile: 1.6 });
  }

  function floorKilim(x, z, w, d, ry = 0) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.rotateY(ry);
    g.translate(x, 0.05, z);
    batch(M.kilim, g);
  }

  function wallKilim(x, z, ry, w = 1.2, h = 1.6) {
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(ry);
    g.translate(x, 1.5, z);
    batch(M.kilim, g);
  }

  function stove(x, z) {
    const body = new THREE.CylinderGeometry(0.28, 0.3, 0.7, 12);
    body.translate(x, 0.45, z);
    batch(M.metal, body);
    const pipe = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
    pipe.translate(x, 1.9, z);
    batch(M.metal, pipe);
    addCollider(x, z, 0.6, 0.6);
  }

  // ---------- Evler ----------
  // 1) Dedenin evi
  house({ cx: -14, cz: -12, w: 8, d: 6, door: 'S', doorOff: 1.6 });
  sedir(-14.4, -14.05, 5, 0.8);
  wallKilim(-14.4, -14.52, 0, 2.2, 1.2);
  floorKilim(-13.6, -11.8, 2.6, 1.7);
  const t1 = table(-13.4, -12.1);
  paper('page1', -13.35, t1, -12.05, 0.4);
  yukluk('hide_dede', -17.2, -11.2, 'E');
  stove(-10.95, -10.1);

  // 2) Ahır
  house({ cx: 16, cz: -16, w: 10, d: 7, h: 3.2, door: 'W', doorW: 2.2, mat: M.stone, win: false });
  for (const [px, pz] of [[14, -14.5], [14, -17.5], [17.5, -14.5], [17.5, -17.5]]) addBox(M.darkWood, 0.22, 3.2, 0.22, px, 1.6, pz, { tile: 1 });
  addBox(M.darkWood, 0.8, 0.9, 4.2, 19.95, 0.45, -16, { tile: 1.5 }); // yemlik
  paper('page2', 19.9, 0.9, -15.2, -0.2);
  hay('hide_ahir_ic', 17.4, -18.3, 0.8);
  {
    // anahtar
    const key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 14), M.metal);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.012), M.metal);
    shaft.position.x = 0.09;
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.012), M.metal);
    bit.position.set(0.14, -0.015, 0);
    key.add(ring, shaft, bit);
    key.rotation.x = -Math.PI / 2;
    key.position.set(19.85, 0.915, -16.7);
    key.traverse((o) => (o.userData.interactId = 'key'));
    key.userData.interactId = 'key';
    scene.add(key);
    refs.key = key;
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: T.dot, color: 0xc8b070, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.scale.set(0.6, 0.6, 1);
    glow.position.set(19.85, 1.0, -16.7);
    scene.add(glow);
    key.userData.glow = glow;
  }

  // 3) Muhtarın evi (kilitli)
  house({ cx: 0, cz: -30, w: 9, d: 7, h: 3.2, door: 'S' });
  sedir(0, -32.95, 5, 0.8);
  wallKilim(-2.5, -33.02, 0);
  floorKilim(0.4, -29.6, 3, 2);
  const t3 = table(2.6, -31.6, false);
  paper('page3', 2.5, t3, -31.6, 0.1);
  addBox(M.darkWood, 0.45, 0.9, 0.45, 2.6, 0.45, -30.8, { collide: false, tile: 1 }); // sandalye
  yukluk('hide_muhtar', -3.9, -29.4, 'E');
  stove(3.9, -27.6);
  {
    // kilitli kapı (menteşe pivotu)
    const pivot = new THREE.Group();
    pivot.position.set(-0.55, 0, -26.5 - WALL_T / 2);
    const door = new THREE.Mesh(boxGeo(1.1, 2.12, 0.08, 1), new THREE.MeshStandardMaterial({ map: T.wood, color: 0x7a5e44, roughness: 0.85 }));
    door.position.set(0.55, 1.06, 0);
    door.castShadow = door.receiveShadow = true;
    door.userData.interactId = 'muhtarDoor';
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), M.metal);
    handle.position.set(0.95, 1.0, 0.06);
    handle.userData.interactId = 'muhtarDoor';
    pivot.add(door, handle);
    scene.add(pivot);
    refs.muhtarDoor = { pivot, mesh: door, collider: addCollider(0, -26.5 - WALL_T / 2, 1.1, 0.3, 'muhtarDoor') };
  }

  // ---------- Cin hikâyesi nesneleri ----------
  refs.items = {};
  function pickup(id, obj, x, y, z, glowCol = 0xc8b070) {
    obj.position.set(x, y, z);
    obj.traverse((o) => {
      o.userData.interactId = id;
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(obj);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: T.dot, color: glowCol, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.scale.set(0.7, 0.7, 1);
    glow.position.set(x, y + 0.08, z);
    scene.add(glow);
    animated.push((dt, tt) => (glow.material.opacity = obj.visible ? 0.1 + Math.sin(tt * 2 + x) * 0.05 : 0));
    obj.userData.glow = glow;
    refs.items[id] = obj;
  }
  {
    // dedenin çakısı (demir)
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.025), new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.7 }));
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, 0.02), M.metal);
    blade.position.x = 0.085;
    g.add(handle, blade);
    g.rotation.y = 0.6;
    pickup('item_cak', g, -15.6, 0.51, -14.0);
    // tuz kesesi
    const salt = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 1 }));
    salt.scale.set(1, 1.2, 1);
    pickup('item_tuz', salt, -11.75, 0.09, -11.0);
    // ekmek (kuru yufka)
    const bread = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.95 }));
    pickup('item_ekmek', bread, 3.05, t3 + 0.02, -31.35);
    // at nalı (mezarlık duvarının üstünde)
    const nal = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 6, 14, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.6, metalness: 0.6 }));
    nal.rotation.x = -Math.PI / 2;
    pickup('item_nal', nal, -30.5, 0.82, 9.2);
  }
  {
    // Kuyunun güney ağzında düz adak taşı
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.32), M.stone);
    slab.position.set(0, 0.88, 1.12);
    slab.receiveShadow = true;
    slab.userData.interactId = 'offer';
    scene.add(slab);
    const offering = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.95 }));
    b.position.set(-0.1, 0.93, 1.12);
    const sl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 1 }));
    sl.position.set(0.17, 0.94, 1.12);
    offering.add(b, sl);
    offering.visible = false;
    scene.add(offering);
    refs.offerSlab = slab;
    refs.offering = offering;
  }
  {
    // Dere: akan su (cinler akan suyu geçemez) ve tahta köprü
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#0d1a22';
    x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 70; i++) {
      x.strokeStyle = `rgba(150,180,200,${0.05 + Math.random() * 0.12})`;
      x.lineWidth = 1 + Math.random() * 2;
      const px = Math.random() * 64, py = Math.random() * 256;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + (Math.random() - 0.5) * 6, py + 10 + Math.random() * 30);
      x.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 30);
    tex.rotation = Math.PI / 2;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 3.6),
      new THREE.MeshStandardMaterial({ map: tex, color: 0x8aa0b0, roughness: 0.12, metalness: 0.55, emissive: 0x0a1418, emissiveIntensity: 0.4 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.38, STREAM_Z);
    water.receiveShadow = true;
    scene.add(water);
    animated.push((dt) => (tex.offset.y += dt * 0.35));
    // köprü tahtaları
    for (let i = 0; i < 9; i++) {
      const g = boxGeo(9.0, 0.08, 0.36, 1);
      g.rotateY((r() - 0.5) * 0.04);
      g.translate((r() - 0.5) * 0.1, 0.05, STREAM_Z - 1.6 + i * 0.4);
      batch(M.darkWood, g);
    }
    for (const sx of [-4.35, 4.35]) {
      addBox(M.darkWood, 0.1, 0.8, 3.8, sx, 0.45, STREAM_Z, { collide: false, tile: 1 });
      for (const dz of [-1.7, 0, 1.7]) addBox(M.darkWood, 0.12, 1.0, 0.12, sx, 0.45, STREAM_Z + dz, { collide: false, tile: 1 });
    }
    refs.stream = water;
  }
  {
    // Cin düğünü: mezarlığın ortasında süzülen turuncu ışıklar (başta gizli)
    const wedding = new THREE.Group();
    wedding.position.set(-37, 0, 1);
    const lights = [];
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dot, color: 0xff8a3a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.scale.set(0.5, 0.5, 1);
      sp.userData.a = (i / 16) * Math.PI * 2;
      sp.userData.r = 2.5 + (i % 3);
      wedding.add(sp);
      lights.push(sp);
    }
    const pl = new THREE.PointLight(0xff7a2a, 0, 16, 1.6);
    pl.position.y = 1.6;
    wedding.add(pl);
    wedding.visible = false;
    scene.add(wedding);
    animated.push((dt, tt) => {
      if (!wedding.visible) return;
      pl.intensity = 6 + Math.sin(tt * 9) * 1.5 + Math.sin(tt * 23) * 0.8;
      for (const sp of lights) {
        const a = sp.userData.a + tt * 0.6;
        sp.position.set(Math.cos(a) * sp.userData.r, 1.2 + Math.sin(tt * 2.4 + sp.userData.a * 3) * 0.4, Math.sin(a) * sp.userData.r);
      }
    });
    refs.wedding = wedding;
  }
  {
    // Kara kedi: kılık değiştirmiş "bizden iyiler"
    const cat = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur);
    body.scale.set(0.9, 1.2, 1.3);
    body.position.set(0, 0.2, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), fur);
    head.position.set(0, 0.42, 0.08);
    cat.add(body, head);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), fur);
      ear.position.set(sx * 0.055, 0.52, 0.07);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffc23a }));
      eye.position.set(sx * 0.04, 0.44, 0.17);
      cat.add(ear, eye);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 5), fur);
    tail.position.set(0, 0.3, -0.22);
    tail.rotation.x = -0.7;
    cat.add(tail);
    cat.visible = false;
    scene.add(cat);
    refs.cat = cat;
  }

  // Diğer evler ve yıkıntılar
  house({ cx: -24, cz: 8, w: 6, d: 5, door: 'E' });
  yukluk('hide_ev4', -26.2, 8, 'E');
  floorKilim(-23.8, 8, 2, 1.4, Math.PI / 2);
  house({ cx: 22, cz: 10, w: 7, d: 5, door: 'W' });
  house({ cx: -16, cz: -32, w: 6, d: 5, door: 'S', ruin: true });
  house({ cx: 26, cz: -4, w: 5, d: 5, door: 'W', ruin: true, mat: M.stone });
  house({ cx: -30, cz: -14, w: 5, d: 4, door: 'E', ruin: true });
  house({ cx: 14, cz: -36, w: 7, d: 5, door: 'S' });
  yukluk('hide_ev9', 14, -37.85, 'S');
  house({ cx: -12, cz: 22, w: 6, d: 5, door: 'E' });
  house({ cx: 12, cz: 25, w: 6, d: 5, door: 'W', ruin: true });

  // Pencereler (biri arada bir titrer, kimse yokken)
  const winMat = M.window;
  const glowWinMat = new THREE.MeshStandardMaterial({ color: 0x050607, emissive: 0xff8a3a, emissiveIntensity: 0 });
  windows.forEach((g, i) => {
    if (i === 7) {
      const m = new THREE.Mesh(g, glowWinMat);
      scene.add(m);
      animated.push((dt, tt) => {
        const on = Math.sin(tt * 0.21) > 0.75;
        glowWinMat.emissiveIntensity = on ? 0.35 + Math.sin(tt * 13) * 0.1 + Math.sin(tt * 31) * 0.08 : 0;
      });
    } else batch(winMat, g);
  });

  // Saman yığınları (dış saklanma yerleri)
  hay('hide_saman1', 8.5, -20.5);
  hay('hide_saman2', -6, 14);
  hay('hide_saman3', -22, -22);
  hay('hide_saman4', 18, 3.5);
  hay('hide_saman5', 24, -24);
  hay('hide_saman6', -30, 20, 0.9);

  // ---------- Kuyu ----------
  {
    const prof = [
      new THREE.Vector2(1.0, 0),
      new THREE.Vector2(1.25, 0),
      new THREE.Vector2(1.25, 0.85),
      new THREE.Vector2(1.0, 0.85),
      new THREE.Vector2(1.0, -1.2),
    ];
    const ringG = new THREE.LatheGeometry(prof, 28);
    const uv = ringG.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i));
    batch(M.stone, ringG);
    // karanlık su
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 28),
      new THREE.MeshStandardMaterial({ color: 0x020304, roughness: 0.05, metalness: 0.9 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.6;
    scene.add(water);
    refs.wellWater = water;
    // ahşap çıkrık
    addBox(M.darkWood, 0.14, 2.2, 0.14, -1.1, 1.1, 0, { collide: false, tile: 1 });
    addBox(M.darkWood, 0.14, 2.2, 0.14, 1.1, 1.1, 0, { collide: false, tile: 1 });
    const axle = new THREE.CylinderGeometry(0.09, 0.09, 2.3, 10);
    axle.rotateZ(Math.PI / 2);
    axle.translate(0, 1.9, 0);
    batch(M.darkWood, axle);
    const rope = new THREE.CylinderGeometry(0.015, 0.015, 1.6, 5);
    rope.translate(0.2, 1.1, 0);
    batch(M.hay, rope);
    const bucket = new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12, 1, true);
    bucket.translate(0.2, 0.3, 0);
    batch(M.metal, bucket);
    addCollider(0, 0, 2.6, 2.6, 'well');

    // Üç mühür taşı
    const dirs = { north: [0, -1, Math.PI], east: [1, 0, Math.PI / 2], west: [-1, 0, -Math.PI / 2] };
    for (const k of Object.keys(dirs)) {
      const [dx, dz, ry] = dirs[k];
      const mats = [M.stone, M.stone, M.stone, M.stone, new THREE.MeshStandardMaterial({ map: T.motifs.suyolu, roughness: 0.9, bumpMap: T.motifs.suyolu, bumpScale: 3 }), M.stone];
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.4), mats);
      s.position.set(dx * 1.95, 0.45, dz * 1.95);
      s.rotation.y = ry;
      s.castShadow = s.receiveShadow = true;
      s.userData.interactId = 'dial_' + k;
      scene.add(s);
      refs.dials[k] = { mesh: s, faceMat: mats[4], index: 4 };
      addCollider(s.position.x, s.position.z, dx ? 0.4 : 0.75, dx ? 0.75 : 0.4);
    }
  }

  // ---------- Kuru çeşme ----------
  addBox(M.stone, 1.8, 2.0, 0.6, 8, 1.0, 7.2);
  addBox(M.stone, 1.8, 0.5, 0.9, 8, 0.25, 7.95, { tile: 1.5 });
  {
    const spout = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6);
    spout.rotateX(Math.PI / 2);
    spout.translate(8, 1.1, 7.6);
    batch(M.metal, spout);
  }

  // ---------- Mezarlık (batı) ----------
  {
    for (let i = 0; i < 22; i++) {
      const gx = -33 - (i % 5) * 2.0 - r() * 0.6;
      const gz = -6 + Math.floor(i / 5) * 3.4 + r() * 0.8;
      const hh = 0.6 + r() * 0.7;
      const tilt = (r() - 0.5) * 0.25;
      const g = boxGeo(0.45, hh, 0.12, 1);
      g.rotateZ(tilt);
      g.rotateY((r() - 0.5) * 0.3);
      g.translate(gx, hh / 2 - 0.05, gz);
      batch(M.stone, g);
      if (r() < 0.4) {
        // sarıklı başlık
        const tg = new THREE.SphereGeometry(0.16, 8, 6);
        tg.scale(1, 0.7, 1);
        tg.translate(gx, hh, gz);
        batch(M.stone, tg);
      }
      addCollider(gx, gz, 0.5, 0.3);
    }
    // alçak mezarlık duvarı
    addBox(M.stone, 0.5, 0.8, 18, -30.5, 0.4, 2, { tile: 2 });
  }

  // ---------- Köyün taş duvarı ----------
  {
    const segs = 64;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * 50, z = Math.sin(a) * 50;
      if (z > 45 && Math.abs(x) < 5) continue; // yol açıklığı
      const hh = 0.9 + r() * 0.6;
      const g = boxGeo(5.2, hh, 0.7, 2);
      g.rotateY(-a + Math.PI / 2);
      g.translate(x, hh / 2, z);
      batch(M.stone, g);
    }
    // yol kenarı duvarları
    addBox(M.stone, 0.6, 1.0, 26, -4.6, 0.5, 60, { tile: 2 });
    addBox(M.stone, 0.6, 1.0, 26, 4.6, 0.5, 60, { tile: 2 });
  }

  // ---------- Ağaçlar ----------
  function treeGeo(seed, scale = 1) {
    const tr = rng(seed);
    const parts = [];
    function branch(start, dir, len, rad, depth) {
      const end = start.clone().addScaledVector(dir, len);
      const g = new THREE.CylinderGeometry(rad * 0.65, rad, len, 6, 1, true);
      g.translate(0, len / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.applyQuaternion(q);
      g.translate(start.x, start.y, start.z);
      parts.push(g);
      if (depth <= 0) return;
      const n = depth > 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const nd = dir.clone();
        nd.x += (tr() - 0.5) * 1.3;
        nd.z += (tr() - 0.5) * 1.3;
        nd.y += 0.15 + tr() * 0.3;
        nd.normalize();
        branch(end, nd, len * (0.55 + tr() * 0.2), rad * 0.62, depth - 1);
      }
    }
    branch(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3((tr() - 0.5) * 0.2, 1, (tr() - 0.5) * 0.2).normalize(), 3.2 * scale, 0.28 * scale, 4);
    const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
    g.computeVertexNormals();
    return g;
  }
  const barkMat = new THREE.MeshStandardMaterial({ map: T.wood, color: 0x4a4038, roughness: 1 });
  const treeVariants = [treeGeo(3), treeGeo(11), treeGeo(29, 1.2)];
  const treeSpots = [];
  for (let i = 0; i < 140 && treeSpots.length < 46; i++) {
    const a = r() * Math.PI * 2;
    const rad = r() < 0.4 ? 8 + r() * 38 : 54 + r() * 60;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (Math.abs(x) < 7 && z > 30) continue; // yol
    if (blockedNear(x, z, 3)) continue;
    treeSpots.push([x, z]);
  }
  treeVariants.forEach((geo, vi) => {
    const list = treeSpots.filter((_, i) => i % 3 === vi);
    const im = new THREE.InstancedMesh(geo, barkMat, list.length);
    const m4 = new THREE.Matrix4();
    list.forEach(([x, z], i) => {
      const s = 0.8 + r() * 0.7;
      m4.compose(new THREE.Vector3(x, heightAt(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(s, s, s));
      im.setMatrixAt(i, m4);
      if (Math.hypot(x, z) < 50) addCollider(x, z, 0.5, 0.5);
    });
    im.castShadow = true;
    scene.add(im);
  });

  // Dilek ağacı + çaputlar
  {
    const g = treeGeo(7, 1.5);
    const t = new THREE.Mesh(g, barkMat);
    t.position.set(6, 0, -6);
    t.castShadow = true;
    scene.add(t);
    addCollider(6, -6, 0.8, 0.8);
    const pos = g.attributes.position;
    const tips = [];
    for (let i = 0; i < pos.count; i += 7) {
      const y = pos.getY(i);
      if (y > 2.6 && y < 7.5) tips.push(new THREE.Vector3(pos.getX(i) + 6, y, pos.getZ(i) - 6));
    }
    const cloth = new THREE.PlaneGeometry(0.12, 0.6);
    cloth.translate(0, -0.3, 0);
    const N = Math.min(46, tips.length);
    const cols = [0xb02a1e, 0xe8dcc0, 0x2a5a8a, 0xc7a032, 0x3e7a3a, 0xd8d0c0];
    const im = new THREE.InstancedMesh(cloth, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }), N);
    const c = new THREE.Color();
    const base = [];
    for (let i = 0; i < N; i++) {
      const p = tips[Math.floor((i / N) * tips.length)];
      base.push({ p, ph: r() * 6.28, ry: r() * 6.28 });
      im.setColorAt(i, c.setHex(cols[i % cols.length]));
    }
    scene.add(im);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    animated.push((dt, tt) => {
      for (let i = 0; i < N; i++) {
        const b = base[i];
        e.set(Math.sin(tt * 1.8 + b.ph) * 0.35 + 0.1, b.ry, Math.cos(tt * 1.3 + b.ph) * 0.25);
        q.setFromEuler(e);
        m4.compose(b.p, q, one);
        im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    });
  }

  // ---------- Kayalar ----------
  {
    const rg = new THREE.DodecahedronGeometry(1, 1);
    const p = rg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n = 0.8 + r() * 0.35;
      p.setXYZ(i, p.getX(i) * n, p.getY(i) * n * 0.6, p.getZ(i) * n);
    }
    rg.computeVertexNormals();
    const N = 140;
    const im = new THREE.InstancedMesh(rg, M.stone, N);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < 400 && k < N; i++) {
      const a = r() * Math.PI * 2, rad = 6 + r() * 120;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (blockedNear(x, z, 2) || (Math.abs(x) < 6 && z > 30)) continue;
      const s = 0.15 + r() * (rad > 50 ? 1.6 : 0.4);
      m4.compose(new THREE.Vector3(x, heightAt(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 6, r())), new THREE.Vector3(s, s, s));
      im.setMatrixAt(k++, m4);
    }
    im.count = k;
    im.castShadow = im.receiveShadow = true;
    scene.add(im);
  }

  // ---------- Kuru otlar (rüzgârla sallanan) ----------
  const grassUniforms = { uTime: { value: 0 } };
  {
    const blade = new THREE.PlaneGeometry(0.9, 0.7);
    blade.translate(0, 0.35, 0);
    const b2 = blade.clone().rotateY(Math.PI / 2);
    const geo = mergeGeometries([blade, b2]);
    const mat = new THREE.MeshLambertMaterial({ map: T.grass, alphaTest: 0.45, side: THREE.DoubleSide, color: 0x9a8c6a });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = grassUniforms.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float sway = sin(uTime*1.6 + instanceMatrix[3].x*0.35 + instanceMatrix[3].z*0.27) * 0.16 + sin(uTime*3.7 + instanceMatrix[3].x) * 0.04;
         transformed.x += sway * uv.y;
         transformed.z += sway * 0.6 * uv.y;`
      );
    };
    const N = 9000;
    const im = new THREE.InstancedMesh(geo, mat, N);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < N * 3 && k < N; i++) {
      const x = (r() - 0.5) * 150, z = (r() - 0.5) * 150 + 8;
      if (blockedNear(x, z, 0.6) || insideAnyFootprint(x, z)) continue;
      if (Math.abs(x) < 1.6 && z > 3) continue;
      const s = 0.5 + r() * 0.9;
      m4.compose(new THREE.Vector3(x, heightAt(x, z) - 0.02, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(s, s * (0.7 + r() * 0.6), s));
      im.setMatrixAt(k++, m4);
    }
    im.count = k;
    im.receiveShadow = true;
    scene.add(im);
  }

  // ---------- Araba (başlangıç / çıkış) ----------
  const car = new THREE.Group();
  {
    const paint = new THREE.MeshStandardMaterial({ color: 0x9c9583, roughness: 0.55, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.1, metalness: 0.8 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 4.3), paint);
    lower.position.y = 0.6;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 2.1), glass);
    cabin.position.set(0, 1.17, 0.25);
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.06, 1.9), paint);
    roofM.position.set(0, 1.46, 0.25);
    car.add(lower, cabin, roofM);
    for (const [wx, wz] of [[-0.8, -1.35], [0.8, -1.35], [-0.8, 1.35], [0.8, 1.35]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14), rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.32, wz);
      car.add(w);
    }
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffeecc, emissive: 0xffe6b0, emissiveIntensity: 2 });
    for (const sx of [-0.55, 0.55]) {
      const hl = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), hlMat);
      hl.position.set(sx, 0.68, -2.16);
      hl.rotation.y = Math.PI;
      car.add(hl);
      const sp = new THREE.SpotLight(0xffe2b0, 45, 70, 0.36, 0.55, 1.4);
      sp.position.set(sx, 0.7, -2.2);
      sp.target.position.set(sx * 2, 0, -30);
      car.add(sp, sp.target);
    }
    car.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.userData.interactId = 'car';
      }
    });
    car.position.set(2.2, 0, 67);
    scene.add(car);
    addCollider(2.2, 67, 1.9, 4.4, 'car');
  }

  // ---------- Birleştir ----------
  for (const [mat, geos] of batches) {
    const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mat !== M.window && mat !== M.kilim;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // ---------- Toz zerreleri ----------
  const dust = (() => {
    const N = 600;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[i * 3] = (r() - 0.5) * 30;
      p[i * 3 + 1] = r() * 4;
      p[i * 3 + 2] = (r() - 0.5) * 30;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(
      g,
      new THREE.PointsMaterial({ map: T.dot, size: 0.05, color: 0xc8c0b0, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, p, N };
  })();

  // ---------- Navigasyon ızgarası ----------
  const grid = buildGrid(colliders, doorways);

  // ---------- Devriye noktaları ----------
  const waypoints = [
    [0, 8], [-8, -4], [8, -2], [-14, -4], [-20, -18], [-6, -20], [8, -26], [20, -27], [27, -13],
    [30, 5], [14, 17], [0, 30], [-18, 30], [-27, 0], [-12.5, -11], [17, -16], [-38, -10], [-20, 14], [6, -42], [-8, -40], [32, 18], [-14, -6.5],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));

  function insideAnyFootprint(x, z) {
    // ev içlerinde ot çıkmasın
    return HOUSES.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + 0.3 && Math.abs(z - cz) < d / 2 + 0.3);
  }

  function blockedNear(x, z, m) {
    for (const c of colliders) if (x > c.minX - m && x < c.maxX + m && z > c.minZ - m && z < c.maxZ + m) return true;
    return false;
  }

  function inBounds(x, z) {
    if (x * x + z * z < VILLAGE_R * VILLAGE_R) return true;
    if (Math.abs(x) < 3.9 && z > 40 && z < 72) return true;
    return false;
  }

  function update(dt, tt, playerPos) {
    grassUniforms.uTime.value = tt;
    for (const f of animated) f(dt, tt);
    // toz zerreleri oyuncunun çevresinde dolaşır
    const { p, N, pts } = dust;
    pts.position.set(Math.floor(playerPos.x / 30) * 30, 0, Math.floor(playerPos.z / 30) * 30);
    for (let i = 0; i < N; i++) {
      p[i * 3] += Math.sin(tt * 0.3 + i) * 0.003;
      p[i * 3 + 1] += 0.002 + Math.sin(tt + i * 1.7) * 0.002;
      if (p[i * 3 + 1] > 4) p[i * 3 + 1] = 0;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    // zerreler oyuncuya göre sarsın (30m'lik hücre etrafında)
    const ox = playerPos.x - pts.position.x, oz = playerPos.z - pts.position.z;
    for (let i = 0; i < N; i++) {
      let x = p[i * 3], z = p[i * 3 + 2];
      if (x - ox > 15) x -= 30; else if (x - ox < -15) x += 30;
      if (z - oz > 15) z -= 30; else if (z - oz < -15) z += 30;
      p[i * 3] = x; p[i * 3 + 2] = z;
    }
  }

  function removeCollider(c) {
    const i = colliders.indexOf(c);
    if (i >= 0) colliders.splice(i, 1);
    const g = buildGrid(colliders, doorways);
    grid.blocked.set(g.blocked);
    grid.sight.set(g.sight);
  }

  return { colliders, heightAt, inBounds, grid, waypoints, refs, car, update, removeCollider, M };
}

// Ev ayak izleri (cx, cz, w, d) — ot ve navigasyon için
const HOUSES = [
  [-14, -12, 8, 6], [16, -16, 10, 7], [0, -30, 9, 7], [-24, 8, 6, 5], [22, 10, 7, 5],
  [-16, -32, 6, 5], [26, -4, 5, 5], [-30, -14, 5, 4], [14, -36, 7, 5], [-12, 22, 6, 5], [12, 25, 6, 5],
];

// 1 m'lik navigasyon ızgarası: varlığın yol bulması ve görüş hattı için
export function buildGrid(colliders, doorways = []) {
  const minX = -60, minZ = -60, W = 120, H = 140, cell = 1;
  const blocked = new Uint8Array(W * H);
  const inflate = 0.2;
  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      const x = minX + gx + 0.5, z = minZ + gz + 0.5;
      let b = 0;
      const inside = x * x + z * z < VILLAGE_R * VILLAGE_R || (Math.abs(x) < 3.9 && z > 40 && z < 72);
      if (!inside) b = 1;
      blocked[gz * W + gx] = b;
    }
  }
  const sight = new Uint8Array(W * H); // görüşü kesen hücreler (yüksek nesneler)
  for (const c of colliders) {
    const x0 = Math.floor(c.minX - inflate - minX), x1 = Math.floor(c.maxX + inflate - minX);
    const z0 = Math.floor(c.minZ - inflate - minZ), z1 = Math.floor(c.maxZ + inflate - minZ);
    for (let gz = Math.max(0, z0); gz <= Math.min(H - 1, z1); gz++)
      for (let gx = Math.max(0, x0); gx <= Math.min(W - 1, x1); gx++) blocked[gz * W + gx] = 1;
    if (c.maxY === undefined || c.maxY > 1.4) {
      const sx0 = Math.floor(c.minX - minX), sx1 = Math.floor(c.maxX - minX - 0.001);
      const sz0 = Math.floor(c.minZ - minZ), sz1 = Math.floor(c.maxZ - minZ - 0.001);
      for (let gz = Math.max(0, sz0); gz <= Math.min(H - 1, sz1); gz++)
        for (let gx = Math.max(0, sx0); gx <= Math.min(W - 1, sx1); gx++) sight[gz * W + gx] = 1;
    }
  }
  // kapı boşluklarını aç (duvarın iki yanında birer hücre)
  for (const d of doorways) {
    const along = d.w > 1.6 ? [-0.5, 0, 0.5] : [0];
    for (const a of along)
      for (let k = -1.5; k <= 1.5; k += 0.5) {
        const x = d.axis === 'x' ? d.x + a : d.x + k;
        const z = d.axis === 'x' ? d.z + k : d.z + a;
        const gx = Math.floor(x - minX), gz = Math.floor(z - minZ);
        if (gx >= 0 && gz >= 0 && gx < W && gz < H) {
          blocked[gz * W + gx] = 0;
          if (Math.abs(k) < 0.6) sight[gz * W + gx] = 0;
        }
      }
  }
  // kilitli kapı hâlâ yerindeyse yeniden kapat
  for (const c of colliders) {
    if (c.id !== 'muhtarDoor') continue;
    for (let z = c.minZ - 0.6; z <= c.maxZ + 0.6; z += 0.5)
      for (let x = c.minX; x <= c.maxX; x += 0.5) {
        const gx = Math.floor(x - minX), gz = Math.floor(z - minZ);
        if (gx >= 0 && gz >= 0 && gx < W && gz < H) blocked[gz * W + gx] = 1;
      }
  }
  const toCell = (x, z) => [Math.floor(x - minX), Math.floor(z - minZ)];
  const idx = (gx, gz) => gz * W + gx;
  const valid = (gx, gz) => gx >= 0 && gz >= 0 && gx < W && gz < H;
  const isBlocked = (gx, gz) => !valid(gx, gz) || blocked[idx(gx, gz)] === 1;
  const center = (gx, gz) => [minX + gx + 0.5, minZ + gz + 0.5];
  return { minX, minZ, W, H, cell, blocked, sight, toCell, idx, valid, isBlocked, center };
}
