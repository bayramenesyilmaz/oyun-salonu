import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '@engine/textures.js';
import { CollisionWorld } from '@engine/collision.js';
import { L1, DOCS } from '../story.js';

// BÖLÜM 1 — SESSİZ VADİ
// Koordinatlar (m): kuzey −Z. Karakol güneyde (0,140), çiftlik kuzeyde (12,−92),
// Gözetleme Tepesi batıda (−42,18), ağıl doğudaki dere yatağında (50,−24).

const KARAKOL = { x: 0, z: 140 };
const FARM = { x: 12, z: -92 };
const RIDGE = { x: -42, z: 18 };
const AGIL = { x: 50, z: -24 };

const gauss = (x, z, cx, cz, sx, sz) => Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((z - cz) ** 2) / (2 * sz * sz)));
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const roadX = (z) => (z > 110 ? 0 : 5 * Math.sin((110 - z) / 32));
const riverX = (z) => 50 + 6 * Math.sin(z / 30);

export function heightAt(x, z) {
  // dağ duvarları
  const ax = Math.abs(x);
  let h = smooth(78, 165, ax) * (52 + 18 * Math.sin(z * 0.021 + (x > 0 ? 1.7 : 0.3)) + 10 * Math.sin(z * 0.057 + x * 0.01));
  h += smooth(-140, -230, z) * (60 + 15 * Math.sin(x * 0.03));
  h += smooth(185, 260, z) * (35 + 10 * Math.sin(x * 0.04));
  // yumuşak dalgalar
  h += 1.4 * Math.sin(x * 0.048 + 0.7) * Math.cos(z * 0.041) + 0.7 * Math.sin(x * 0.13 + z * 0.07) + 0.35 * Math.sin(x * 0.31 - z * 0.23);
  // gözetleme sırtı ve küçük tepeler
  h += 11 * gauss(x, z, RIDGE.x, RIDGE.z, 13, 24);
  h += 5 * gauss(x, z, 32, 62, 12, 10) + 4 * gauss(x, z, -28, -64, 10, 12) + 6 * gauss(x, z, -64, 80, 14, 18) + 5 * gauss(x, z, 66, 30, 10, 14);
  // dere yatağı
  if (z > -80 && z < 132) {
    const d = x - riverX(z);
    h -= 2.6 * Math.exp(-(d * d) / (2 * 3.6 * 3.6)) * smooth(132, 118, z) * smooth(-80, -66, z);
  }
  // düzlükler: karakol, çiftlik, ağıl
  const fk = smooth(42, 28, Math.hypot(x - KARAKOL.x, z - KARAKOL.z));
  h = h * (1 - fk) + 0.2 * fk;
  const ff = smooth(36, 24, Math.hypot(x - FARM.x, z - FARM.z));
  h = h * (1 - ff) + 0.4 * ff;
  const fa = smooth(10, 6, Math.hypot(x - AGIL.x, z - AGIL.z));
  h = h * (1 - fa) + -0.6 * fa;
  return h;
}

export function buildLevel1(game) {
  const { scene, T } = game;
  const r = rng(7);
  const world = new CollisionWorld(heightAt);
  const batches = new Map();
  const animated = [];
  const interactables = [];
  const markTargets = [];
  const lights = [];

  const M = {
    stone: new THREE.MeshStandardMaterial({ map: T.stone, roughness: 0.92, bumpMap: T.stone, bumpScale: 0.25 }),
    plaster: new THREE.MeshStandardMaterial({ map: T.plaster, roughness: 0.95, bumpMap: T.plaster, bumpScale: 0.25 }),
    wood: new THREE.MeshStandardMaterial({ map: T.wood, roughness: 0.85 }),
    darkWood: new THREE.MeshStandardMaterial({ map: T.wood, color: 0x6b5a4a, roughness: 0.9 }),
    roof: new THREE.MeshStandardMaterial({ map: T.roof, roughness: 1 }),
    sandbag: new THREE.MeshStandardMaterial({ map: T.sandbag, roughness: 1, bumpMap: T.sandbag, bumpScale: 0.25 }),
    hesco: new THREE.MeshStandardMaterial({ map: T.sandbag, color: 0xb8a684, roughness: 1 }),
    canvas: new THREE.MeshStandardMaterial({ map: T.canvas, roughness: 0.95, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ map: T.metal, roughness: 0.6, metalness: 0.4 }),
    olive: new THREE.MeshStandardMaterial({ map: T.metal, color: 0x7d8a62, roughness: 0.7, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.6, metalness: 0.5 }),
    burnt: new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 1, map: T.metal }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 0.1, metalness: 0.9 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 }),
    window: new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.3, emissive: 0xffa040, emissiveIntensity: 0 }),
    warmWin: new THREE.MeshStandardMaterial({ color: 0x241408, emissive: 0xffa050, emissiveIntensity: 0.9 }),
    target: new THREE.MeshStandardMaterial({ map: T.target, roughness: 0.9, side: THREE.DoubleSide }),
    pole: new THREE.MeshStandardMaterial({ color: 0x5d5a55, roughness: 0.6, metalness: 0.6 }),
    redWhite: new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.6 }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.7 }),
    wool: new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 1 }),
  };

  function boxGeo(w, h, d, tile = 3) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * (dims[f][0] / tile), uv.getY(i) * (dims[f][1] / tile));
      }
    return g;
  }
  function batch(mat, geo) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
  }
  // Kutu: görsel + çarpışma. y0 = taban yüksekliği (arazi için null → zemine oturt)
  function box(mat, w, h, d, x, z, { y0 = null, ry = 0, collide = true, tile = 3, solid = true, bulletProof = true, tag = null } = {}) {
    const base = y0 == null ? heightAt(x, z) - 0.15 : y0;
    const g = boxGeo(w, h, d, tile);
    if (ry) g.rotateY(ry);
    g.translate(x, base + h / 2, z);
    batch(mat, g);
    if (collide) {
      const cw = Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d;
      const cd = Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d;
      return world.addBox(x, z, cw, cd, base, h, { solid, bulletProof, tag });
    }
    return null;
  }
  function cyl(mat, r0, r1, h, x, z, y0 = null, seg = 10) {
    const base = y0 == null ? heightAt(x, z) : y0;
    const g = new THREE.CylinderGeometry(r1, r0, h, seg);
    g.translate(x, base + h / 2, z);
    batch(mat, g);
  }

  // ---------- Gökyüzü ----------
  {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `varying vec3 vP; void main(){
          float h = clamp(vP.y + 0.03, -0.2, 1.0);
          vec3 horizon = vec3(0.13,0.16,0.22);
          vec3 top = vec3(0.012,0.02,0.04);
          vec3 c = mix(horizon, top, smoothstep(0.0, 0.5, h));
          vec3 moonDir = normalize(vec3(0.5, 0.45, -0.75));
          c += vec3(0.09,0.1,0.13) * pow(max(dot(vP, moonDir),0.0), 10.0);
          // doğu ufkunda çok hafif şafak öncesi
          c += vec3(0.05,0.035,0.02) * pow(max(dot(vP, normalize(vec3(1.0,0.05,0.2))),0.0), 6.0) * (1.0 - smoothstep(0.0,0.3,h));
          gl_FragColor = vec4(c,1.0);
        }`,
      })
    );
    sky.renderOrder = -10;
    scene.add(sky);
    const starG = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < 1800; i++) {
      const a = r() * Math.PI * 2, y = 0.1 + r() * 0.9, rad = Math.sqrt(1 - y * y);
      pos.push(Math.cos(a) * rad * 850, y * 850, Math.sin(a) * rad * 850);
    }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ size: 1.2, sizeAttenuation: false, color: 0xc0cce0, fog: false, transparent: true, opacity: 0.8, depthWrite: false })));
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.moon, fog: false, depthWrite: false, transparent: true }));
    moon.scale.set(120, 120, 1);
    moon.position.set(0.62, 0.55, 0.49).normalize().multiplyScalar(820);
    scene.add(moon);
  }

  // ---------- Arazi ----------
  {
    const S = 560, N = 280;
    const g = new THREE.PlaneGeometry(S, S, N, N);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, 20);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const y = heightAt(x, z);
      p.setY(i, y);
      const slope = Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2;
      const rock = smooth(0.45, 0.9, slope);
      const high = smooth(25, 55, y);
      const n = 0.85 + 0.15 * Math.sin(x * 0.21) * Math.cos(z * 0.17);
      c.setRGB(1.0 * n, 0.97 * n, 0.9 * n); // kuru ot / toprak
      c.lerp(new THREE.Color(0.78, 0.8, 0.84), rock * 0.85);
      c.lerp(new THREE.Color(1.3, 1.35, 1.45), high * 0.5); // yüksekte kırağı
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    T.terrain.repeat.set(110, 110);
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: T.terrain, vertexColors: true, roughness: 1, color: new THREE.Color(2.6, 2.6, 2.6) }));
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // ---------- Toprak yol ----------
  {
    const pts = [];
    for (let z = 124; z >= -78; z -= 2) pts.push(z);
    const verts = [], uvs = [], idx = [];
    const W = 2.4;
    pts.forEach((z, i) => {
      const x = roadX(z);
      const dx = (roadX(z - 1) - roadX(z + 1)) / 2;
      const nx = 1, nz = dx; // dik yön (yaklaşık)
      const nl = Math.hypot(nx, nz);
      for (const s of [-1, 1]) {
        const vx = x + (s * W * nx) / nl, vz = z + (s * W * nz) / nl;
        verts.push(vx, heightAt(vx, vz) + 0.04, vz);
        uvs.push(s < 0 ? 0 : 1, i * 0.35);
      }
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: T.road, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    road.receiveShadow = true;
    scene.add(road);
  }

  // ---------- KARAKOL ----------
  const K = KARAKOL;
  {
    const y0 = 0.05;
    const H = 2.3, Tk = 1.1;
    // HESCO duvarları
    const wall = (x, z, w, d) => box(M.hesco, w, H, d, x, z, { y0, tile: 1.2 });
    wall(-12.25, 124, 17.5, Tk);
    wall(12.25, 124, 17.5, Tk);
    wall(0, 157, 43.6, Tk);
    wall(-21.3, 140.5, Tk, 32);
    wall(21.3, 140.5, Tk, 32);
    // HESCO tel kafes çizgileri
    for (let x = -21; x <= 21; x += 1.1) {
      if (Math.abs(x) < 3.4) continue;
      box(M.pole, 0.03, H + 0.02, 0.03, x, 123.44, { y0, collide: false });
    }
    // kapı direkleri ve bariyer
    box(M.sandbag, 1.4, 1.2, 1.4, -4.2, 122.5, { y0, tile: 1.2 });
    box(M.sandbag, 1.4, 1.2, 1.4, 4.2, 122.5, { y0, tile: 1.2 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 0.12), new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: 0.6 }));
    bar.position.set(0, 1.05, 122.5);
    scene.add(bar);
    game.gateBar = { mesh: bar, collider: world.addBox(0, 122.5, 7, 0.4, 0, 2.4, { bulletProof: false, tag: 'gate' }) };

    // gözetleme kulesi
    const tx = 17.5, tz = 127.5;
    for (const [lx, lz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) box(M.darkWood, 0.22, 5.2, 0.22, tx + lx, tz + lz, { y0, tile: 1 });
    box(M.wood, 3.2, 0.15, 3.2, tx, tz, { y0: 5.2, tile: 1.5, collide: false });
    for (const [w, d, ox, oz] of [[3.2, 0.5, 0, -1.35], [3.2, 0.5, 0, 1.35], [0.5, 2.2, -1.35, 0], [0.5, 2.2, 1.35, 0]]) box(M.sandbag, w, 0.9, d, tx + ox, tz + oz, { y0: 5.35, tile: 1, collide: false });
    box(M.canvas, 3.6, 0.1, 3.6, tx, tz, { y0: 7.4, tile: 2, collide: false });
    for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) box(M.darkWood, 0.1, 2.1, 0.1, tx + lx, tz + lz, { y0: 5.3, tile: 1, collide: false });
    const tower = new THREE.SpotLight(0xe8f0ff, 400, 160, 0.13, 0.4, 1.1);
    tower.position.set(tx, 6.6, tz - 1.5);
    tower.target.position.set(0, 0, 60);
    scene.add(tower, tower.target);
    const towerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xe8f0ff, emissiveIntensity: 0.5 }));
    towerHead.position.copy(tower.position);
    towerHead.rotation.x = Math.PI / 2;
    scene.add(towerHead);
    lights.push(tower);
    animated.push((dt, t) => {
      const a = Math.sin(t * 0.18) * 0.55;
      tower.target.position.set(tx + Math.sin(Math.PI + a) * 80, 0, tz - Math.cos(a) * 80);
      towerHead.lookAt(tower.target.position);
      towerHead.rotateX(Math.PI / 2);
    });

    // komuta çadırı
    const cx = -10, cz = 148;
    tent(cx, cz, 7, 5, 2.6);
    box(M.darkWood, 2.2, 0.08, 1.1, cx + 1, cz + 0.6, { y0: 0.85, collide: false, tile: 1 });
    for (const [lx, lz] of [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]]) box(M.darkWood, 0.06, 0.85, 0.06, cx + 1 + lx, cz + 0.6 + lz, { y0, collide: false, tile: 1 });
    world.addBox(cx + 1, cz + 0.6, 2.2, 1.1, 0, 0.9);
    const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshStandardMaterial({ map: mapTex(), roughness: 0.9 }));
    mapPlane.rotation.x = -Math.PI / 2;
    mapPlane.position.set(cx + 1, 0.95, cz + 0.6);
    scene.add(mapPlane);
    const tentLamp = new THREE.PointLight(0xffc27a, 6, 9, 1.6);
    tentLamp.position.set(cx, 2.2, cz);
    scene.add(tentLamp);
    lights.push(tentLamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd8a0 }));
    bulb.position.copy(tentLamp.position);
    scene.add(bulb);
    game.selimPos = new THREE.Vector3(cx - 0.6, 0, cz - 0.2);

    // teçhizat sandığı
    const gx = 7, gz = 146.5;
    box(M.olive, 1.4, 0.6, 0.8, gx, gz, { y0, tile: 1 });
    const lid = new THREE.Mesh(boxGeo(1.44, 0.08, 0.84, 1), M.olive);
    lid.position.set(gx, 0.69, gz);
    scene.add(lid);
    game.gearLid = lid;
    box(M.metal, 6, 2.6, 2.4, gx + 4.5, gz + 3.5, { y0, tile: 2 }); // konteyner
    box(M.olive, 0.5, 0.35, 0.3, gx - 1.2, gz + 0.6, { y0, tile: 0.5 }); // cephane kutuları
    box(M.olive, 0.5, 0.35, 0.3, gx - 1.15, gz + 0.6, { y0: 0.4, tile: 0.5, collide: false });

    // atış alanı
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshStandardMaterial({ color: 0x3b4030, roughness: 1 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(-12, 0.06, 145);
    scene.add(mat);
    box(M.sandbag, 3, 0.8, 0.7, -12, 143.3, { y0, tile: 1 });
    game.rangeTargets = [];
    [[-16.5, 129.5], [-12, 131], [-7.5, 128.8]].forEach(([x, z], i) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.5, z);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.1), M.target);
      plate.position.y = 0.55;
      pivot.add(plate);
      box(M.darkWood, 0.08, 0.5, 0.08, x - 0.22, z, { y0, collide: false, tile: 1 });
      box(M.darkWood, 0.08, 0.5, 0.08, x + 0.22, z, { y0, collide: false, tile: 1 });
      scene.add(pivot);
      const col = world.addBox(x, z, 0.6, 0.12, 0.5, 1.1, { solid: false, tag: 'target:' + i });
      game.rangeTargets.push({ pivot, col, down: false, fall: 0 });
    });

    // zırhlı araç
    vehicle(12.5, 150.5, 0, M.olive, true);
    // aydınlatma direkleri
    for (const [lx, lz] of [[-16, 136], [13, 138], [0, 154]]) {
      cyl(M.pole, 0.06, 0.05, 4.5, lx, lz, y0);
      const L = new THREE.PointLight(0xffbf80, 14, 18, 1.5);
      L.position.set(lx, 4.4, lz);
      scene.add(L);
      lights.push(L);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0b0 }));
      b.position.copy(L.position);
      scene.add(b);
    }
    // jeneratör, variller, bank
    box(M.olive, 1.6, 1.1, 0.9, -17.5, 154.5, { y0, tile: 1 });
    for (let i = 0; i < 3; i++) cyl(M.olive, 0.3, 0.3, 0.9, -18.8 + i * 0.65, 151.6, y0, 12);
    world.addBox(-18.2, 151.6, 2, 0.7, 0, 0.9);
    box(M.darkWood, 2, 0.45, 0.5, -3.5, 153.8, { y0, tile: 1 });
    // bayrak direği ve bayrak
    cyl(M.pole, 0.06, 0.04, 9, -3, 130, y0);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.4, 16, 8), new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.8 }));
    flag.position.set(-1.9, 8.2, 130);
    scene.add(flag);
    const fp = flag.geometry.attributes.position;
    const fbase = fp.array.slice();
    animated.push((dt, t) => {
      for (let i = 0; i < fp.count; i++) {
        const x = fbase[i * 3] + 1.05;
        fp.setZ(i, Math.sin(x * 2.4 - t * 3.2) * 0.12 * x + Math.sin(x * 5 - t * 5) * 0.02 * x);
        fp.setY(i, fbase[i * 3 + 1] - x * x * 0.02);
      }
      fp.needsUpdate = true;
      flag.geometry.computeVertexNormals();
    });
    // nöbet kum torbası mevzileri
    sandbagRing(-17, 127, 2.2);
  }

  // ---------- ÇİFTLİK (örgüt) ----------
  {
    // ana ev
    house(0, -98, 8, 6, 3, 'S', M.stone, true);
    // harabe ev
    house(27, -84, 7, 5, 2.6, 'W', M.plaster, false, true);
    // ambar
    const ax = 24, az = -104;
    barn(ax, az);
    // nöbet kulübesi + projektör
    const hx = 6, hz = -77.5;
    box(M.darkWood, 2.6, 2.4, 0.15, hx, hz - 1.25, { tile: 1.2 });
    box(M.darkWood, 0.15, 2.4, 2.6, hx - 1.25, hz, { tile: 1.2 });
    box(M.darkWood, 0.15, 2.4, 2.6, hx + 1.25, hz, { tile: 1.2 });
    box(M.darkWood, 2.6, 1.0, 0.15, hx, hz + 1.25, { tile: 1.2 });
    box(M.metal, 3, 0.1, 3, hx, hz, { y0: heightAt(hx, hz) + 2.4, collide: false, tile: 1.5 });
    const hl = new THREE.PointLight(0xffb070, 3, 6, 1.6);
    hl.position.set(hx, heightAt(hx, hz) + 2, hz);
    scene.add(hl);
    lights.push(hl);
    const py = heightAt(hx + 2, hz + 1);
    cyl(M.pole, 0.07, 0.06, 6, hx + 2, hz + 1);
    const flood = new THREE.SpotLight(0xfff0d0, 520, 120, 0.2, 0.45, 1.1);
    flood.position.set(hx + 2, py + 6, hz + 1);
    scene.add(flood, flood.target);
    lights.push(flood);
    const fh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff0d0, emissiveIntensity: 0.8 }));
    fh.position.copy(flood.position);
    scene.add(fh);
    animated.push((dt, t) => {
      const a = Math.sin(t * 0.22 + 1) * 0.7;
      flood.target.position.set(hx + Math.sin(a) * 50, 0, hz + Math.cos(a) * 50);
      fh.lookAt(flood.target.position);
    });
    game.floodlight = flood;
    // kamyon
    truck(14, -90, 0.15);
    // ateş varili
    fireBarrel(10, -84);
    // çevre taş duvarı (parçalı)
    for (const [x, z, w, d] of [[-8, -80, 0.6, 22], [-2, -70.5, 12, 0.6], [22, -70.5, 16, 0.6], [32, -86, 0.6, 30], [12, -112, 40, 0.6], [-8, -104, 0.6, 16]]) {
      lowWall(x, z, w, d);
    }
    // variller, sandıklar (siper)
    for (const [x, z] of [[18, -83], [19, -83.6], [3, -88], [28, -97], [-3, -90]]) cyl(M.metal, 0.3, 0.3, 0.9, x, z, null, 12), world.addBox(x, z, 0.62, 0.62, heightAt(x, z), 0.9);
    box(M.darkWood, 1.2, 0.9, 1.2, 8, -94, { tile: 1 });
    box(M.darkWood, 1.2, 0.9, 1.2, 9.3, -94.2, { tile: 1 });

    markTargets.push(
      { id: 'kulube', label: 'Nöbet kulübesi', pos: new THREE.Vector3(hx, heightAt(hx, hz) + 1.4, hz + 1.4) },
      { id: 'arac', label: 'Araç', pos: new THREE.Vector3(14, heightAt(14, -90) + 3.5, -89.5) },
      { id: 'ambar', label: 'Kilitli ambar', pos: new THREE.Vector3(ax - 5.3, heightAt(ax, az) + 2, az) }
    );
  }

  // ---------- Vadi: yanık araç, terk edilmiş ev, ağıl, kayalar ----------
  {
    // yanık araç
    vehicle(-14, -22, 0.6, M.burnt, false);
    const smokeAt = new THREE.Vector3(-14, heightAt(-14, -22) + 1.4, -22);
    animated.push((dt, t) => {
      if (Math.random() < dt * 2.5 && game.player.pos.distanceTo(smokeAt) < 80) game.effects.dust(smokeAt, 1, 0.8);
    });
    // terk edilmiş ev
    house(-36, -48, 6, 5, 2.6, 'E', M.plaster, false, true);
    // ağıl
    const { x: ax, z: az } = AGIL;
    for (const [x, z, w, d] of [[ax, az - 5, 12, 0.6], [ax - 6, az, 0.6, 10], [ax + 6, az + 1.5, 0.6, 7], [ax + 2, az + 5, 8, 0.6]]) lowWall(x, z, w, d, 1.1);
    // kulübe (Hasan'ın saklandığı yer)
    const sx = ax + 3.5, sz = az - 2.5;
    box(M.stone, 3.4, 2.2, 0.4, sx, sz - 1.5, { tile: 1.5 });
    box(M.stone, 0.4, 2.2, 3.4, sx + 1.5, sz, { tile: 1.5 });
    box(M.stone, 0.4, 2.2, 1.2, sx - 1.5, sz - 0.9, { tile: 1.5 });
    box(M.roof, 3.8, 0.25, 3.8, sx, sz, { y0: heightAt(sx, sz) + 2.1, collide: false, tile: 2 });
    box(M.darkWood, 0.6, 0.5, 0.5, sx + 0.8, sz - 0.9, { tile: 0.6 });
    game.hasanSpot = { x: sx - 0.1, z: sz - 0.2 };
    game.defterPos = new THREE.Vector3(sx + 0.8, heightAt(sx, sz) + 0.38, sz - 0.9);
    // koyunlar
    sheep(ax, az, 9);
    // kayalar (siper)
    const rocks = [[-47, 24, 1.3], [-37, 27, 1.2], [-6, 40, 1.4], [8, 20, 1.2], [-10, -2, 1.5], [6, -40, 1.3], [-4, -60, 1.6], [20, -56, 1.4], [36, 4, 1.2], [44, -48, 1.3], [-24, 70, 1.6], [16, 88, 1.3], [-20, -30, 1.2], [26, -30, 1.4], [40, 60, 1.5]];
    for (const [x, z, s] of rocks) boulder(x, z, s);
  }

  // ---------- Bitki örtüsü ----------
  {
    // çam ağaçları (yamaçlarda) ve ardıçlar (vadide)
    const pine = (() => {
      const parts = [];
      const trunk = new THREE.CylinderGeometry(0.12, 0.2, 2.4, 6);
      trunk.translate(0, 1.2, 0);
      parts.push(trunk);
      for (let i = 0; i < 4; i++) {
        const c = new THREE.ConeGeometry(1.5 - i * 0.3, 2.2, 7);
        c.translate(0, 2.2 + i * 1.2, 0);
        parts.push(c);
      }
      return mergeGeometries(parts.map((p) => p.toNonIndexed()));
    })();
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x2b3424, roughness: 1, flatShading: true });
    const spots = [];
    for (let i = 0; i < 4000 && spots.length < 520; i++) {
      const x = (r() - 0.5) * 520, z = (r() - 0.5) * 520 + 20;
      const h = heightAt(x, z);
      const ax = Math.abs(x);
      const onSlope = ax > 70 || z < -125 || z > 175;
      if (!onSlope && r() > 0.04) continue;
      if (h > 58) continue;
      if (Math.hypot(x - K.x, z - K.z) < 32 || Math.hypot(x - FARM.x, z - FARM.z) < 34) continue;
      if (Math.abs(x - roadX(z)) < 5 && z < 125 && z > -80) continue;
      // gözetleme hattını kapatma
      if (x > -48 && x < 30 && z < 24 && z > -100) continue;
      spots.push([x, h, z]);
    }
    const im = new THREE.InstancedMesh(pine, pineMat, spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, h, z], i) => {
      const s = 0.8 + r() * 1.1;
      m4.compose(new THREE.Vector3(x, h - 0.2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s * (0.9 + r() * 0.4), s));
      im.setMatrixAt(i, m4);
      if (Math.abs(x) < 120 && z > -150 && z < 190) world.addBox(x, z, 0.4 * s, 0.4 * s, h - 0.2, 5 * s, { tag: 'tree' });
    });
    im.castShadow = true;
    im.receiveShadow = true;
    scene.add(im);

    // kuru ot öbekleri (rüzgârla sallanır)
    const grassU = { uTime: { value: 0 } };
    const blade = new THREE.PlaneGeometry(0.8, 0.6);
    blade.translate(0, 0.3, 0);
    const gg = mergeGeometries([blade, blade.clone().rotateY(Math.PI / 2)]);
    const gm = new THREE.MeshLambertMaterial({ map: T.grass, alphaTest: 0.45, side: THREE.DoubleSide, color: 0xa69a74 });
    gm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = grassU.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float sw = sin(uTime*1.7 + instanceMatrix[3].x*0.3 + instanceMatrix[3].z*0.25)*0.12;
         transformed.x += sw * uv.y; transformed.z += sw*0.5*uv.y;`
      );
    };
    const NG = game.quality === 'low' ? 5000 : 11000;
    const gim = new THREE.InstancedMesh(gg, gm, NG);
    let k = 0;
    for (let i = 0; i < NG * 3 && k < NG; i++) {
      const x = (r() - 0.5) * 190, z = -120 + r() * 300;
      if (Math.hypot(x - K.x, z - K.z) < 24 || Math.abs(x - roadX(z)) < 2.8) continue;
      if (Math.hypot(x - FARM.x, z - FARM.z) < 22) continue;
      const s = 0.5 + r() * 0.9;
      m4.compose(new THREE.Vector3(x, heightAt(x, z) - 0.03, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s * (0.7 + r() * 0.6), s));
      gim.setMatrixAt(k++, m4);
    }
    gim.count = k;
    gim.receiveShadow = true;
    scene.add(gim);
    animated.push((dt, t) => (grassU.uTime.value = t));

    // küçük taşlar
    const rg = new THREE.DodecahedronGeometry(1, 0);
    const rim = new THREE.InstancedMesh(rg, M.stone, 300);
    let j = 0;
    for (let i = 0; i < 1200 && j < 300; i++) {
      const x = (r() - 0.5) * 300, z = -150 + r() * 330;
      if (Math.hypot(x - K.x, z - K.z) < 26 || Math.abs(x - roadX(z)) < 3) continue;
      const s = 0.12 + r() * (Math.abs(x) > 80 ? 1.6 : 0.35);
      m4.compose(new THREE.Vector3(x, heightAt(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r(), r() * 6, r())), new THREE.Vector3(s, s * 0.6, s));
      rim.setMatrixAt(j++, m4);
    }
    rim.count = j;
    rim.castShadow = rim.receiveShadow = true;
    scene.add(rim);
  }

  // ---------- Toz zerreleri ve uzaktaki köy ışıkları ----------
  {
    const N = 500;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[i * 3] = (r() - 0.5) * 40;
      p[i * 3 + 1] = r() * 6;
      p[i * 3 + 2] = (r() - 0.5) * 40;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({ map: T.dot, size: 0.05, color: 0xd0c8b8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    dust.frustumCulled = false;
    scene.add(dust);
    animated.push((dt, t, P) => {
      dust.position.set(Math.round(P.x / 40) * 40, 0, Math.round(P.z / 40) * 40);
      for (let i = 0; i < N; i++) {
        p[i * 3] += 0.4 * dt + Math.sin(t + i) * 0.002;
        p[i * 3 + 1] += Math.sin(t * 0.7 + i * 1.3) * 0.003;
        if (p[i * 3] > 20) p[i * 3] -= 40;
      }
      g.attributes.position.needsUpdate = true;
    });
    // uzak köy ışıkları (dağ yamacında)
    const vl = [];
    for (let i = 0; i < 14; i++) vl.push(-150 - r() * 60, 30 + r() * 20, -60 + r() * 80);
    const vg = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute(vl, 3));
    scene.add(new THREE.Points(vg, new THREE.PointsMaterial({ color: 0xffb060, size: 3, sizeAttenuation: false, fog: false })));
  }

  // ---------- Birleştir ----------
  for (const [mat, geos] of batches) {
    const merged = mergeGeometries(geos);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = mat !== M.window && mat !== M.warmWin;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // ---------- Siper noktaları (otomatik) ----------
  const coverPoints = [];
  for (const b of world.boxes) {
    const h = b.maxY - b.minY;
    if (!b.solid || h < 0.8 || h > 3.5 || b.tag === 'gate') continue;
    const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
    if (w > 25 || d > 25) continue;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    for (const [px, pz] of [[b.minX - 0.7, cz], [b.maxX + 0.7, cz], [cx, b.minZ - 0.7], [cx, b.maxZ + 0.7]]) {
      if (world.near(px, pz, 0.2).size && [...world.near(px, pz, 0.4)].some((o) => o.solid && px > o.minX - 0.3 && px < o.maxX + 0.3 && pz > o.minZ - 0.3 && pz < o.maxZ + 0.3)) continue;
      coverPoints.push({ p: new THREE.Vector3(px, heightAt(px, pz), pz), box: b, c: new THREE.Vector3(cx, 0, cz), low: h < 1.6 });
    }
  }

  // ===================================================================
  // Yardımcı yapı üreticileri
  // ===================================================================
  function tent(x, z, w, d, h) {
    const y0 = heightAt(x, z);
    const g = new THREE.BufferGeometry();
    const hw = w / 2, hd = d / 2, wall = h * 0.55;
    const v = [
      // çatı iki eğim
      -hw, wall, -hd, hw, wall, -hd, hw, h, 0, -hw, wall, -hd, hw, h, 0, -hw, h, 0,
      -hw, h, 0, hw, h, 0, hw, wall, hd, -hw, h, 0, hw, wall, hd, -hw, wall, hd,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    const uv = [];
    for (let i = 0; i < v.length; i += 3) uv.push(v[i] * 0.4, (v[i + 1] + v[i + 2]) * 0.4);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.translate(x, y0, z);
    const roof = new THREE.Mesh(g, M.canvas);
    roof.castShadow = true;
    scene.add(roof);
    // yan duvarlar (girişi güneyde açık, batı tarafı)
    box(M.canvas, w, wall, 0.06, x, z - hd, { y0, tile: 2 });
    box(M.canvas, 0.06, wall, d, x - hw, z, { y0, tile: 2 });
    box(M.canvas, 0.06, wall, d, x + hw, z, { y0, tile: 2 });
    box(M.canvas, w * 0.3, wall, 0.06, x - w * 0.35, z + hd, { y0, tile: 2 });
    box(M.canvas, w * 0.3, wall, 0.06, x + w * 0.35, z + hd, { y0, tile: 2 });
    // üçgen alınlıklar
    for (const s of [-1, 1]) {
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.Float32BufferAttribute([s * hw, wall, -hd, s * hw, h, 0, s * hw, wall, hd], 3));
      tg.computeVertexNormals();
      tg.translate(x, y0, z);
      const m = new THREE.Mesh(tg, M.canvas);
      scene.add(m);
    }
  }

  function house(x, z, w, d, h, door, mat, intact, ruin = false) {
    const t = 0.45, y0 = heightAt(x, z) - 0.2;
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const sides = { N: ['x', z0 + t / 2, x0, x1], S: ['x', z1 - t / 2, x0, x1], W: ['z', x0 + t / 2, z0 + t, z1 - t], E: ['z', x1 - t / 2, z0 + t, z1 - t] };
    for (const k of Object.keys(sides)) {
      const [axis, fixed, from, to] = sides[k];
      const segs = [];
      if (k === door) {
        const mid = (from + to) / 2;
        segs.push([from, mid - 0.6], [mid + 0.6, to]);
        // lento
        const hh = h - 2.1;
        if (!ruin) axis === 'x' ? box(mat, 1.2, hh, t, mid, fixed, { y0: y0 + 2.1, collide: false, tile: 2 }) : box(mat, t, hh, 1.2, fixed, mid, { y0: y0 + 2.1, collide: false, tile: 2 });
      } else segs.push([from, to]);
      for (const [a, b] of segs) {
        let s = a;
        while (s < b - 0.05) {
          const len = ruin ? Math.min(b - s, 0.9 + r() * 1.8) : b - s;
          const hh = ruin ? h * (0.3 + r() * 0.7) : h;
          if (!ruin || r() < 0.8) {
            const c = s + len / 2;
            axis === 'x' ? box(mat, len, hh, t, c, fixed, { y0, tile: 2 }) : box(mat, t, hh, len, fixed, c, { y0, tile: 2 });
          }
          s += len;
        }
      }
    }
    if (!ruin) {
      box(M.roof, w + 0.6, 0.3, d + 0.6, x, z, { y0: y0 + h, collide: false, tile: 3 });
      box(M.darkWood, w + 0.7, 0.12, d + 0.7, x, z, { y0: y0 + h - 0.05, collide: false, tile: 2 });
      // ışıklı pencere
      if (intact) {
        const wg = new THREE.PlaneGeometry(0.7, 0.55);
        wg.translate(x + w * 0.25, y0 + 1.6, z1 + 0.01);
        batch(M.warmWin, wg);
        const L = new THREE.PointLight(0xffa050, 3, 8, 1.8);
        L.position.set(x + w * 0.25, y0 + 1.6, z);
        scene.add(L);
        lights.push(L);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const s = 0.25 + r() * 0.4;
        const rg = new THREE.DodecahedronGeometry(s, 0);
        rg.scale(1, 0.6, 1);
        const px = x0 + r() * w, pz = z0 + r() * d;
        rg.translate(px, heightAt(px, pz), pz);
        batch(M.stone, rg);
      }
    }
  }

  function barn(x, z) {
    const w = 10, d = 7, h = 4.2, y0 = heightAt(x, z) - 0.2, t = 0.3;
    box(M.wood, w, h, t, x, z - d / 2, { y0, tile: 2 });
    box(M.wood, w, h, t, x, z + d / 2, { y0, tile: 2 });
    box(M.wood, t, h, d, x + w / 2, z, { y0, tile: 2 });
    // batı yüzü: çift kanat kapı (zincirli)
    box(M.wood, t, h, 1.8, x - w / 2, z - d / 2 + 0.9, { y0, tile: 2 });
    box(M.wood, t, h, 1.8, x - w / 2, z + d / 2 - 0.9, { y0, tile: 2 });
    box(M.darkWood, 0.2, 3.2, 3.4, x - w / 2 - 0.05, z, { y0, tile: 1.5 });
    box(M.wood, t, h - 3.2, 3.4, x - w / 2, z, { y0: y0 + 3.2, collide: false, tile: 2 });
    // zincir
    for (let i = 0; i < 6; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 10), M.pole);
      link.position.set(x - w / 2 - 0.2, y0 + 1.3 - i * 0.07, z + (i % 2 ? 0.02 : -0.02));
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
      scene.add(link);
    }
    // çatı (beşik)
    for (const s of [-1, 1]) {
      const g = boxGeo(w + 0.8, 0.12, d / 2 + 0.8, 3);
      g.rotateX(s * 0.42);
      g.translate(x, y0 + h + 0.75, z + s * (d / 4 + 0.1));
      batch(M.metal, g);
    }
    // içerideki ışık (aralıklardan sızar)
    const L = new THREE.PointLight(0xffa060, 5, 9, 1.8);
    L.position.set(x, y0 + 2.5, z);
    scene.add(L);
    lights.push(L);
    const gap = new THREE.PlaneGeometry(0.04, 3);
    for (let i = 0; i < 3; i++) {
      const gg = gap.clone();
      gg.rotateY(-Math.PI / 2);
      gg.translate(x - w / 2 - 0.16, y0 + 1.6, z - 1.2 + i * 1.2);
      batch(M.warmWin, gg);
    }
  }

  function vehicle(x, z, ry, mat, armored) {
    const g = new THREE.Group();
    const y0 = heightAt(x, z);
    const add = (geo, m, px, py, pz) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(px, py, pz);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
    };
    if (armored) {
      add(boxGeo(2.4, 1.3, 5.2, 2), mat, 0, 1.25, 0);
      add(boxGeo(2.2, 0.8, 2.6, 2), mat, 0, 2.3, -0.6);
      add(new THREE.BoxGeometry(1.8, 0.35, 0.05), M.glass, 0, 2.35, 0.71);
      add(new THREE.CylinderGeometry(0.35, 0.4, 0.4, 10), mat, 0, 2.9, -0.8);
      add(new THREE.BoxGeometry(0.08, 0.08, 1), M.dark, 0, 3.0, -0.2);
    } else {
      add(boxGeo(1.8, 0.7, 4.2, 2), mat, 0, 0.7, 0);
      add(boxGeo(1.6, 0.6, 2, 2), mat, 0, 1.35, -0.2);
    }
    const wy = armored ? 0.55 : 0.35, wx = armored ? 1.2 : 0.85, wz = armored ? 1.8 : 1.35, wr = armored ? 0.55 : 0.35;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, 0.4, 14), M.tire);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * wx, wy, sz * wz);
      g.add(w);
    }
    g.position.set(x, y0, z);
    g.rotation.y = ry;
    scene.add(g);
    const cw = Math.abs(Math.cos(ry)) * (armored ? 2.6 : 2) + Math.abs(Math.sin(ry)) * (armored ? 5.2 : 4.2);
    const cd = Math.abs(Math.sin(ry)) * (armored ? 2.6 : 2) + Math.abs(Math.cos(ry)) * (armored ? 5.2 : 4.2);
    world.addBox(x, z, cw, cd, y0, armored ? 2.9 : 1.6, { tag: 'vehicle' });
  }

  function truck(x, z, ry) {
    const g = new THREE.Group();
    const y0 = heightAt(x, z);
    if (game.models.truck) {
      // GLB kamyon: 7 m boya ölçekle
      const m = game.models.truck.scene.clone();
      const bb = new THREE.Box3().setFromObject(m);
      const len = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 7;
      m.scale.setScalar(7 / len);
      m.position.y = -bb.min.y * (7 / len);
      m.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
      g.add(m);
      g.position.set(x, y0, z);
      g.rotation.y = ry;
      scene.add(g);
      world.addBox(x, z, 2.6, 7, y0, 2.8, { tag: 'vehicle' });
      return;
    }
    const add = (geo, m, px, py, pz) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(px, py, pz);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };
    add(boxGeo(2.3, 1.6, 2, 2), M.metal, 0, 1.5, 2.4); // kabin
    add(new THREE.BoxGeometry(2.0, 0.6, 0.05), M.glass, 0, 1.9, 3.41);
    add(boxGeo(2.4, 0.3, 4.6, 2), M.dark, 0, 0.95, -0.9); // şasi
    add(boxGeo(2.4, 1.6, 4.4, 2), M.canvas, 0, 1.95, -0.9); // branda
    for (const [sx, sz] of [[-1, 2.5], [1, 2.5], [-1, -0.6], [1, -0.6], [-1, -2.2], [1, -2.2]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14), M.tire);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 1.1, 0.5, sz);
      g.add(w);
    }
    g.position.set(x, y0, z);
    g.rotation.y = ry;
    scene.add(g);
    world.addBox(x, z, 2.6, 7, y0, 2.8, { tag: 'vehicle' });
  }

  function fireBarrel(x, z) {
    const y0 = heightAt(x, z);
    cyl(M.burnt, 0.3, 0.3, 0.9, x, z, y0, 12);
    world.addBox(x, z, 0.62, 0.62, y0, 0.9);
    const L = new THREE.PointLight(0xff8a30, 8, 14, 1.6);
    L.position.set(x, y0 + 1.3, z);
    scene.add(L);
    lights.push(L);
    const flames = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.flash, color: 0xff9040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(x, y0 + 1.05, z);
      scene.add(s);
      flames.push(s);
    }
    animated.push((dt, t) => {
      L.intensity = 6 + Math.sin(t * 13) * 1.5 + Math.sin(t * 29) * 1 + Math.random();
      flames.forEach((s, i) => {
        const k = (t * 1.6 + i / 4) % 1;
        s.position.y = y0 + 0.95 + k * 0.7;
        s.position.x = x + Math.sin(t * 3 + i) * 0.08;
        s.scale.setScalar(0.6 * (1 - k) + 0.15);
        s.material.opacity = 1 - k;
      });
    });
  }

  function lowWall(x, z, w, d, h = 1.0) {
    box(M.stone, w, h, d, x, z, { tile: 1.5 });
  }

  function boulder(x, z, s) {
    const g = new THREE.DodecahedronGeometry(s, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n = 0.8 + Math.random() * 0.3;
      p.setXYZ(i, p.getX(i) * n * 1.2, p.getY(i) * n * 0.75, p.getZ(i) * n);
    }
    g.computeVertexNormals();
    const y0 = heightAt(x, z);
    g.translate(x, y0 + s * 0.35, z);
    batch(M.stone, g);
    world.addBox(x, z, s * 2, s * 1.7, y0 - 0.3, s * 1.1);
  }

  function sandbagRing(x, z, rad) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (i === 2) continue;
      box(M.sandbag, 1.6, 0.9, 0.6, x + Math.cos(a) * rad, z + Math.sin(a) * rad, { ry: -a + Math.PI / 2, y0: 0.05, tile: 1 });
    }
  }

  function sheep(cx, cz, n) {
    const bodyG = new THREE.SphereGeometry(0.42, 10, 8);
    bodyG.scale(0.75, 0.62, 1.15);
    const headG = new THREE.SphereGeometry(0.15, 8, 6);
    headG.scale(0.8, 0.9, 1.3);
    const headM = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1 });
    const flock = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Group();
      const b = new THREE.Mesh(bodyG, M.wool);
      b.position.y = 0.42;
      const h = new THREE.Mesh(headG, headM);
      h.position.set(0, 0.55, 0.5);
      s.add(b, h);
      for (const [lx, lz] of [[-0.15, -0.3], [0.15, -0.3], [-0.15, 0.3], [0.15, 0.3]]) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), headM);
        l.position.set(lx, 0.15, lz);
        s.add(l);
      }
      const px = cx - 4 + r() * 6, pz = cz - 3 + r() * 6;
      s.position.set(px, heightAt(px, pz), pz);
      s.rotation.y = r() * 6;
      s.traverse((o) => o.isMesh && (o.castShadow = true));
      scene.add(s);
      flock.push({ s, h, ph: r() * 6 });
    }
    animated.push((dt, t) => {
      for (const f of flock) {
        f.h.position.y = 0.5 + Math.sin(t * 0.8 + f.ph) * 0.06;
        f.h.rotation.x = Math.max(0, Math.sin(t * 0.3 + f.ph)) * 0.6;
      }
    });
  }

  function stripeTex() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 8;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      x.fillStyle = i % 2 ? '#d8d4c8' : '#b8281c';
      x.fillRect(i * 16, 0, 16, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function flagTex() {
    const c = document.createElement('canvas');
    c.width = 300;
    c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = '#c8102e';
    x.fillRect(0, 0, 300, 200);
    // hilal
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(110, 100, 50, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#c8102e';
    x.beginPath();
    x.arc(122.5, 100, 40, 0, Math.PI * 2);
    x.fill();
    // yıldız
    x.fillStyle = '#fff';
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + Math.PI / 2;
      const rr = i % 2 ? 9.6 : 25;
      x.lineTo(176 + Math.cos(a) * rr, 100 + Math.sin(a) * rr);
    }
    x.closePath();
    x.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function mapTex() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 144;
    const x = c.getContext('2d');
    x.fillStyle = '#d9cfae';
    x.fillRect(0, 0, 256, 144);
    x.strokeStyle = 'rgba(80,60,30,0.5)';
    for (let i = 0; i < 9; i++) {
      x.beginPath();
      for (let k = 0; k <= 256; k += 8) x.lineTo(k, 20 + i * 14 + Math.sin(k * 0.04 + i) * 8);
      x.stroke();
    }
    x.strokeStyle = '#7a2a1a';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(20, 120);
    x.quadraticCurveTo(120, 90, 220, 30);
    x.stroke();
    x.fillStyle = '#7a2a1a';
    x.font = 'bold 14px serif';
    x.fillText('X', 214, 30);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ===================================================================
  // Etkileşimler, karakter tanımları, senaryo
  // ===================================================================
  const enemies = [
    { id: 'g1', x: 7, z: -75.2, yaw: 0.2 },
    { id: 'g2', x: 10, z: -86, yaw: 0, route: [[10, -86], [18.5, -86], [18.5, -95], [10, -96.5]] },
    { id: 'g3', x: 18, z: -101.5, yaw: -Math.PI / 2 },
    { id: 'p1', x: 2, z: -66, route: [[2, -66], [-2, -40], [-5, -12], [0, 16], [-5, -12], [-2, -40]] },
    { id: 'p2', x: 3, z: -69, route: [[3, -69], [-1, -43], [-4, -15], [1, 13], [-4, -15], [-1, -43]] },
    { id: 'e1', x: 46, z: -62, route: [[46, -62], [56, -52], [48, -70], [36, -68]] },
  ];

  const level = {
    id: 1,
    night: true,
    heightAt,
    world,
    bounds: { minX: -100, maxX: 100, minZ: -132, maxZ: 168 },
    spawn: { x: 2, z: 131, yaw: Math.PI },
    coverPoints,
    markTargets,
    interactables,
    lights,
    enemies,
    squad: { x: 4.5, z: 134, yaw: Math.PI },
    civilians: [{ id: 'hasan', name: 'Hasan Dayı', x: game.hasanSpot.x, z: game.hasanSpot.z, yaw: 0, safeSpot: [-3.5, 0, 153] }],
    selim: { x: game.selimPos.x, z: game.selimPos.z, yaw: Math.PI / 2 },
    docsTotal: 3,
    objectives: [
      { id: 'talk', text: 'Yüzbaşı Selim Er ile konuş', at: () => game.selimPos },
      { id: 'gear', text: 'Teçhizat sandığından ekipmanını al', hidden: true, at: () => new THREE.Vector3(7, 0.8, 146.5) },
      { id: 'range', text: 'Atış alanında hedefleri vur', total: 3, hidden: true, at: () => new THREE.Vector3(-12, 0.5, 145) },
      { id: 'reload', text: 'Şarjör değiştir (R)', hidden: true },
      { id: 'ridge', text: 'Gözetleme Tepesi\'ne ulaş', hidden: true, at: () => new THREE.Vector3(RIDGE.x, heightAt(RIDGE.x, RIDGE.z) + 1, RIDGE.z) },
      { id: 'mark', text: 'Çiftlikteki hedefleri dürbünle doğrula', total: 3, hidden: true },
      { id: 'return', text: 'Ekibinle karakola dön', hidden: true, at: () => new THREE.Vector3(0, 1, 125) },
      { id: 'hasan', text: 'Hasan Dayı\'yı bul (ağıl, doğu)', optional: true, hidden: true, at: () => new THREE.Vector3(AGIL.x, heightAt(AGIL.x, AGIL.z) + 1, AGIL.z) },
      { id: 'hasanSafe', text: 'Hasan Dayı\'yı karakola getir', optional: true, hidden: true },
      { id: 'docs', text: 'Hikâye belgeleri', optional: true, hidden: true, total: 3, noScore: true },
    ],
    // Karakol duvarının iç/dış tarafları arasında geçiş kapıdan yapılır
    navVia(from, to) {
      const inside = (p) => p.z > 123.3 && p.z < 157 && Math.abs(p.x) < 21;
      const a = inside(from), b = inside(to);
      if (a === b) return null;
      const gateIn = new THREE.Vector3(0, 0, 127), gateOut = new THREE.Vector3(0, 0, 119.5);
      if (a) return Math.abs(from.x) < 2.2 && from.z < 128.5 ? gateOut : gateIn;
      return Math.abs(from.x) < 2.2 && from.z > 118.5 ? gateIn : gateOut;
    },
    safeZone: (p) => p.z > 125.6 && p.z < 156.5 && Math.abs(p.x) < 20.7,
    update(dt, t) {
      for (const f of animated) f(dt, t, game.player.pos);
      // devrilen atış hedefleri
      for (const tg of game.rangeTargets) {
        if (tg.down && tg.fall < 1) {
          tg.fall = Math.min(1, tg.fall + dt * 4);
          tg.pivot.rotation.x = -tg.fall * 1.45;
        }
      }
    },
  };

  // Belgeler
  const docSpots = [
    { id: 'defter', pos: game.defterPos },
    { id: 'telsiz', pos: new THREE.Vector3(-12.8, heightAt(-12.8, -21) + 0.75, -21) },
    { id: 'cizim', pos: new THREE.Vector3(-35.5, heightAt(-35.5, -48.5) + 0.05, -48.5) },
  ];
  const docMeshes = {};
  for (const d of docSpots) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshStandardMaterial({ map: T.paper, emissive: 0x8a7a50, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.random();
    m.position.copy(d.pos).add(new THREE.Vector3(0, 0.01, 0));
    scene.add(m);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dot, color: 0xd8c08a, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.8);
    glow.position.copy(d.pos).add(new THREE.Vector3(0, 0.1, 0));
    scene.add(glow);
    docMeshes[d.id] = { m, glow };
    interactables.push({
      id: 'doc_' + d.id,
      pos: d.pos,
      radius: 2.2,
      enabled: () => !game.docsFound.has(d.id),
      prompt: () => 'Belgeyi oku',
      use: () => {
        game.docsFound.add(d.id);
        m.visible = glow.visible = false;
        game.mission.stats.docs = game.docsFound.size;
        game.mission.activate('docs');
        game.mission.progress('docs', game.docsFound.size);
        game.showDocument(DOCS[d.id]);
      },
    });
  }
  level.syncDocs = () => {
    for (const id of Object.keys(docMeshes)) docMeshes[id].m.visible = docMeshes[id].glow.visible = !game.docsFound.has(id);
  };

  interactables.push(
    {
      id: 'selim',
      pos: new THREE.Vector3(game.selimPos.x, 1.4, game.selimPos.z),
      radius: 2.6,
      enabled: () => !game.mission.isDone('talk'),
      prompt: () => 'Yüzbaşı Selim Er ile konuş',
      use: () => script.talk(),
    },
    {
      id: 'gear',
      pos: new THREE.Vector3(7, 0.7, 146.5),
      radius: 2.2,
      enabled: () => game.mission.get('gear').active && !game.mission.isDone('gear'),
      prompt: () => 'Teçhizatı al (tüfek, dürbün, fener)',
      use: () => script.gear(),
    },
    {
      id: 'hasan',
      pos: () => game.civilians[0].pos.clone().setY(game.civilians[0].pos.y + 1),
      radius: 2.6,
      enabled: () => {
        const h = game.civilians[0];
        return h.alive && h.state !== 'safe' && (h.state === 'hiding' || h.state === 'wait' || h.state === 'follow' || h.state === 'cover');
      },
      prompt: () => {
        const h = game.civilians[0];
        return h.state === 'hiding' ? 'Hasan Dayı ile konuş' : h.state === 'wait' ? 'Hasan Dayı: benimle gel' : 'Hasan Dayı: burada bekle';
      },
      use: () => script.hasan(),
    },
    {
      id: 'kemal',
      pos: () => game.squad.pos.clone().setY(game.squad.pos.y + 0.5),
      radius: 2.4,
      enabled: () => game.squad.down,
      prompt: () => 'Kemal\'e ilk yardım yap',
      use: () => game.reviveSquad(),
    }
  );

  // ---------- Senaryo ----------
  const script = {
    flags: { gateOpen: false, ridgeNear: false, warnedKemal: false, ended: false, ridgeTop: false, kemalJoined: false, hints: {} },
    start() {
      game.say(L1.intro.slice(2));
      game.hint(game.touch ? 'Sol: yürü · Sağ: bak · E: etkileşim' : 'WASD yürü · Fare bak · E etkileşim', 6);
    },
    talk() {
      game.mission.complete('talk');
      game.say(L1.briefing, () => {
        game.mission.activate('gear');
        game.mission.activate('hasan');
        game.hint('Teçhizat sandığı çadırın doğusunda', 5);
      });
    },
    gear() {
      game.mission.complete('gear');
      game.giveGear();
      if (game.gearLid) game.gearLid.rotation.x = -1.2, game.gearLid.position.z -= 0.35, game.gearLid.position.y += 0.3;
      game.audio.ui('ok');
      game.say(L1.gear);
      game.mission.activate('range');
      game.hint(game.touch ? 'ATEŞ: basılı tut · NİŞAN: nişan al' : 'Sol tık: ateş · Sağ tık: nişan al', 6);
    },
    targetHit(i) {
      const tg = game.rangeTargets[i];
      if (tg.down) return;
      tg.down = true;
      game.audio.impact(tg.pivot.position, 'hard');
      const n = game.rangeTargets.filter((t) => t.down).length;
      if (!game.mission.get('range').active) return;
      game.mission.progress('range', n);
      if (n === 1) game.say(L1.range);
      if (n === 3) {
        game.mission.activate('reload');
        game.say(L1.rangeDone);
        game.hint(game.touch ? 'R butonu: şarjör değiştir' : 'R: şarjör değiştir', 5);
      }
    },
    reloaded() {
      if (game.mission.get('reload').active && !game.mission.isDone('reload')) {
        game.mission.complete('reload');
        game.say(L1.rangeReload);
        this.openGate();
      }
    },
    openGate() {
      if (this.flags.gateOpen) return;
      this.flags.gateOpen = true;
      game.mission.activate('ridge');
      game.squad.active = true;
      const bar = game.gateBar;
      world.remove(bar.collider);
      game.tween(1.2, (k) => (bar.mesh.rotation.z = k * 1.45));
      bar.mesh.position.x = -3.5;
      bar.mesh.geometry.translate(3.5, 0, 0);
      game.hint(game.touch ? 'Alt sıra: Kemal komutları · ÇÖMEL: sessiz ilerle' : 'G: Kemal takip/bekle · T: ateş serbest/kes · C: çömel', 7);
    },
    hasan() {
      const h = game.civilians[0];
      if (h.state === 'hiding') {
        h.join();
        game.mission.complete('hasan');
        game.mission.activate('hasanSafe');
        game.say(L1.hasanFound);
        game.checkpoint('hasan');
        game.hint('Hasan Dayı seni takip ediyor. E: bekle / gel', 6);
      } else {
        const res = h.toggleWait();
        if (res === 'wait') game.say(L1.hasanWait);
        else if (res === 'follow') game.say(L1.hasanFollow);
      }
    },
    marked(id, count) {
      if (!game.mission.isDone('ridge')) game.mission.complete('ridge');
      game.mission.progress('mark', count);
      game.say(L1.mark[id]);
      if (count === 3) {
        const withHasan = game.civilians[0].state === 'follow' || game.civilians[0].state === 'wait' || game.civilians[0].state === 'cover';
        game.say(withHasan ? L1.allMarkedHasan : L1.allMarked);
        game.mission.activate('return');
        game.checkpoint('marks');
      }
    },
    update(dt) {
      const P = game.player.pos;
      const m = game.mission;
      if (this.flags.gateOpen && !this.flags.leftGate && P.z < 121) {
        this.flags.leftGate = true;
        game.say(L1.gate);
        game.checkpoint('gate');
        game.hint(game.touch ? 'DÜRBÜN · ODAK (yavaş çekim) · FENER: alt sıradaki butonlar' : '2: dürbün · V: Odak (yavaş çekim) · F: fener', 7);
      }
      // tepeye yaklaşınca
      const dRidge = Math.hypot(P.x - RIDGE.x, P.z - RIDGE.z);
      if (m.get('ridge').active && !this.flags.ridgeNear && dRidge < 40) {
        this.flags.ridgeNear = true;
        game.say(L1.ridgeNear);
      }
      if (m.get('ridge').active && !m.isDone('ridge') && dRidge < 9) {
        m.complete('ridge');
        m.activate('mark');
        game.say(L1.ridgeTop);
        game.hint(game.touch ? 'DÜRBÜN → YAKINLAŞ · hedefi ortada tut' : '2: dürbün · Sağ tık: yakınlaştır · hedefi ortada tut', 7);
      }
      if (m.isDone('ridge') && !m.get('mark').active) m.activate('mark');
      // sivil güvende
      const h = game.civilians[0];
      if (h.alive && (h.state === 'follow' || h.state === 'cover') && level.safeZone(h.pos)) {
        h.state = 'safe';
        m.stats.civiliansSaved = 1;
        m.complete('hasanSafe');
        game.say(L1.hasanSafe);
      }
      // dönüş / bitiş
      if (m.isDone('mark') && !this.flags.ended && level.safeZone(P) && P.z > 127) {
        if (game.squad.down) {
          if (!this.flags.warnedKemal) {
            this.flags.warnedKemal = true;
            game.say(L1.kemalNeeded);
          }
          return;
        }
        // Hasan seni takip ediyorsa, o da içeri girmeden görev bitmez
        if (h.alive && (h.state === 'follow' || h.state === 'cover')) {
          if (!this.flags.waitHasan) {
            this.flags.waitHasan = true;
            game.hint('Hasan Dayı geliyor — karakolun içine girmesini bekle', 5);
          }
          return;
        }
        this.flags.ended = true;
        m.complete('return');
        game.endLevel(h.state === 'safe' ? L1.ending : L1.endingNoHasan);
      } else if (!m.isDone('mark') && m.isDone('reload') && this.flags.leftGate && level.safeZone(P) && P.z > 128 && !this.flags.toldGoBack) {
        this.flags.toldGoBack = true;
        game.say(L1.extractNoMarks);
      }
    },
    snapshot() {
      return JSON.parse(JSON.stringify(this.flags));
    },
    restore(f) {
      this.flags = f;
    },
  };
  level.script = script;

  // Sinematik kamera yolları
  level.cutscenes = {
    intro: [
      { dur: 7, from: [-30, 55, 235], to: [-8, 34, 178], look0: [0, 0, 120], look1: [6, 0, -10] },
      { dur: 6, from: [70, 26, -40], to: [45, 18, -62], look0: [14, 2, -92], look1: [16, 2, -96] },
      { dur: 6, from: [26, 14, 104], to: [6, 4, 118], look0: [0, 2, 140], look1: [2, 1.6, 131] },
    ],
    outro: [{ dur: 9, from: [3, 3, 130], to: [-25, 28, 175], look0: [-3, 1, 150], look1: [0, 0, 60] }],
  };
  level.wireTargetHit = (tag) => {
    if (tag && tag.startsWith('target:')) script.targetHit(+tag.split(':')[1]);
  };

  return level;
}
