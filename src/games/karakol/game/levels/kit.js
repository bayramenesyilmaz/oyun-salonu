import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '@engine/textures.js';
import { CollisionWorld } from '@engine/collision.js';

// Bölüm yapım takımı: Bölüm 1'deki yapı üreticilerinin ortak hâli (Bölüm 2–5 kullanır).
// makeKit(game, heightAt, opts) → { M, world, box, cyl, batch, house, barn, ... , finalize }

export const gauss = (x, z, cx, cz, sx, sz) => Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((z - cz) ** 2) / (2 * sz * sz)));
export const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function makeKit(game, heightAt, opts = {}) {
  const { scene, T } = game;
  const r = rng(opts.seed || 11);
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

  function buildSky(kind = 'night') {
    const cols = {
      night: ['vec3(0.13,0.16,0.22)', 'vec3(0.012,0.02,0.04)', 'vec3(0.05,0.035,0.02)'],
      dark: ['vec3(0.06,0.07,0.1)', 'vec3(0.005,0.008,0.015)', 'vec3(0.0,0.0,0.0)'],
      dawn: ['vec3(0.62,0.48,0.42)', 'vec3(0.16,0.22,0.36)', 'vec3(0.9,0.5,0.25)'],
      morning: ['vec3(0.72,0.78,0.84)', 'vec3(0.3,0.48,0.72)', 'vec3(0.6,0.45,0.3)'],
    }[kind];
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `varying vec3 vP; void main(){
          float h = clamp(vP.y + 0.03, -0.2, 1.0);
          vec3 c = mix(${cols[0]}, ${cols[1]}, smoothstep(0.0, 0.5, h));
          vec3 moonDir = normalize(vec3(0.5, 0.45, -0.75));
          c += vec3(0.09,0.1,0.13) * pow(max(dot(vP, moonDir),0.0), 10.0);
          c += ${cols[2]} * pow(max(dot(vP, normalize(vec3(1.0,0.05,0.2))),0.0), 6.0) * (1.0 - smoothstep(0.0,0.3,h));
          gl_FragColor = vec4(c,1.0);
        }`,
      })
    );
    sky.renderOrder = -10;
    scene.add(sky);
    if (kind === 'night' || kind === 'dark') {
      const starG = new THREE.BufferGeometry();
      const pos = [];
      for (let i = 0; i < 1800; i++) {
        const a = r() * Math.PI * 2, y = 0.1 + r() * 0.9, rad = Math.sqrt(1 - y * y);
        pos.push(Math.cos(a) * rad * 850, y * 850, Math.sin(a) * rad * 850);
      }
      starG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ size: 1.2, sizeAttenuation: false, color: 0xc0cce0, fog: false, transparent: true, opacity: kind === 'dark' ? 0.4 : 0.8, depthWrite: false })));
    }
    if (kind === 'night') {
      const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.moon, fog: false, depthWrite: false, transparent: true }));
      moon.scale.set(120, 120, 1);
      moon.position.set(0.62, 0.55, 0.49).normalize().multiplyScalar(820);
      scene.add(moon);
    }
  }

  function buildTerrain(S = 560, N = 280, cz = 20, cx = 0) {
    const g = new THREE.PlaneGeometry(S, S, N, N);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0, cz);
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
      c.setRGB(1.0 * n, 0.97 * n, 0.9 * n);
      c.lerp(new THREE.Color(0.78, 0.8, 0.84), rock * 0.85);
      c.lerp(new THREE.Color(1.3, 1.35, 1.45), high * 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    T.terrain.repeat.set(S / 5, S / 5);
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: T.terrain, vertexColors: true, roughness: 1, color: new THREE.Color(2.6, 2.6, 2.6) }));
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // Yol şeridi: pts = [[x,z], ...]
  function buildRoad(pts, W = 2.4) {
    const verts = [], uvs = [], idx = [];
    pts.forEach(([x, z], i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      for (const s of [-1, 1]) {
        const vx = x + s * W * tz, vz = z - s * W * tx;
        verts.push(vx, heightAt(vx, vz) + 0.04, vz);
        uvs.push(s < 0 ? 0 : 1, i * 0.35);
      }
      if (i > 0) {
        const k = (i - 1) * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
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

  // Bitki örtüsü: allow(x,z,kind) → yerleştirilebilir mi (kind: 'pine' | 'grass' | 'rock')
  function buildVegetation({ allow, pines = 400, grass = 9000, area = [-260, 260, -240, 280], grassArea = null }) {
    const [ax0, ax1, az0, az1] = area;
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
    for (let i = 0; i < pines * 10 && spots.length < pines; i++) {
      const x = ax0 + r() * (ax1 - ax0), z = az0 + r() * (az1 - az0);
      const h = heightAt(x, z);
      if (h > 58 || !allow(x, z, 'pine')) continue;
      spots.push([x, h, z]);
    }
    const m4 = new THREE.Matrix4();
    if (spots.length) {
      const im = new THREE.InstancedMesh(pine, pineMat, spots.length);
      spots.forEach(([x, h, z], i) => {
        const s = 0.8 + r() * 1.1;
        m4.compose(new THREE.Vector3(x, h - 0.2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s * (0.9 + r() * 0.4), s));
        im.setMatrixAt(i, m4);
        world.addBox(x, z, 0.4 * s, 0.4 * s, h - 0.2, 5 * s, { tag: 'tree' });
      });
      im.castShadow = true;
      im.receiveShadow = true;
      scene.add(im);
    }
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
    const NG = game.quality === 'low' ? Math.round(grass * 0.45) : grass;
    const [gx0, gx1, gz0, gz1] = grassArea || [-95, 95, -110, 110];
    const gim = new THREE.InstancedMesh(gg, gm, NG);
    let k = 0;
    for (let i = 0; i < NG * 3 && k < NG; i++) {
      const x = gx0 + r() * (gx1 - gx0), z = gz0 + r() * (gz1 - gz0);
      if (!allow(x, z, 'grass')) continue;
      const s = 0.5 + r() * 0.9;
      m4.compose(new THREE.Vector3(x, heightAt(x, z) - 0.03, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s * (0.7 + r() * 0.6), s));
      gim.setMatrixAt(k++, m4);
    }
    gim.count = k;
    gim.receiveShadow = true;
    scene.add(gim);
    animated.push((dt, t) => (grassU.uTime.value = t));
  }

  function buildDust(color = 0xd0c8b8) {
    const N = 500;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[i * 3] = (r() - 0.5) * 40;
      p[i * 3 + 1] = r() * 6;
      p[i * 3 + 2] = (r() - 0.5) * 40;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({ map: T.dot, size: 0.05, color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
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
  }

  // Lamba direği / ışık
  function lamp(x, z, color = 0xffbf80, intensity = 14, dist = 18, h = 4.5) {
    const y0 = heightAt(x, z);
    cyl(M.pole, 0.06, 0.05, h, x, z, y0);
    const L = new THREE.PointLight(color, intensity, dist, 1.5);
    L.position.set(x, y0 + h - 0.1, z);
    scene.add(L);
    lights.push(L);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0b0 }));
    b.position.copy(L.position);
    scene.add(b);
    return { light: L, bulb: b, base: intensity };
  }

  // Belge noktaları (DOCS anahtarlarıyla)
  function docs(spots, DOCS, level) {
    const docMeshes = {};
    for (const d of spots) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshStandardMaterial({ map: T.paper, emissive: 0x8a7a50, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = r();
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
  }

  function finalize() {
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
    return coverPoints;
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


  return {
    r, M, world, batches, animated, interactables, markTargets, lights,
    boxGeo, batch, box, cyl, buildSky, buildTerrain, buildRoad, buildVegetation, buildDust, lamp, docs, finalize,
    tent, house, barn, vehicle, truck, fireBarrel, lowWall, boulder, sandbagRing, sheep, stripeTex, flagTex, mapTex,
  };
}
