import * as THREE from 'three';
import { V3 } from '../util.js';

// Vinç deposu: 3., 4. ve 5. bölümlerin ortak iç mekânı
export async function loadDepo(g, { stages = 0, items = [], label = 'Depo' } = {}) {
  g.clearLevel();
  g.surface = 'concrete';
  await g.loadEnv();
  g.progress(0.1, label);
  const meta = await g.json('depo.json');
  const gl = await g.gltf('depo.glb');
  g.progress(0.55, label);
  g.scene.add(gl.scene);
  g.scene.background = new THREE.Color(0x05070b);
  g.tuneMaterials(gl.scene);
  g.setupLights({ shadowCenter: V3(meta.ship.p), moon: 0.0, hemi: 0.35, env: 0.45 });
  g.hemi.color.set(0x8090a8);
  g.hemi.groundColor.set(0x2a2018);
  // floresanlar (yalnızca bir kısmı gerçek ışık)
  const tubes = meta.tubes.map(V3);
  tubes.slice(0, g.low ? 3 : 6).forEach((p) => {
    const l = new THREE.PointLight(0xd8e8ff, 26, 16, 1.6);
    l.position.copy(p);
    g.scene.add(l);
  });
  // iş lambaları Leylek'e tutulmuş
  meta.worklights.forEach((w, i) => {
    const s = new THREE.SpotLight(0xffdcae, 160, 30, THREE.MathUtils.degToRad(30), 0.5, 1.5);
    s.position.copy(V3(w.p));
    s.target.position.copy(V3(w.t));
    s.castShadow = i === 0 && !g.low;
    if (s.castShadow) s.shadow.mapSize.set(1024, 1024);
    g.scene.add(s, s.target);
  });
  // gruplar
  const grp = (prefix) => g.groupNodes(gl.scene, prefix);
  const stage = {};
  for (let i = 0; i <= 5; i++) stage[i] = grp(`L${i}__`);
  const setStage = (n) => {
    for (let i = 0; i <= 5; i++) for (const o of stage[i]) o.visible = i <= n;
  };
  setStage(stages);
  const itemNodes = {};
  for (const k of Object.keys(meta.items)) {
    itemNodes[k] = grp(`item_${k}__`);
    const show = items === 'all' || items.includes(k);
    for (const o of itemNodes[k]) o.visible = show;
  }
  const roof = { A: grp('roofA__'), B: grp('roofB__'), M: grp('roofM__') };
  const ladder = grp('ladder__');
  // yer: düz beton
  g.player.groundFn = null;
  g.player.floorY = 0;
  g.player.colliders = meta.colliders;
  return { meta, gl, stage, setStage, itemNodes, roof, ladder };
}

// Kor nesnesini bir noktaya koy ve ışığını bağla
export function placeKor(g, kor, p) {
  kor.position.copy(p);
  g.scene.add(kor);
  g.korLight = new THREE.PointLight(0xff8a30, 10, 10, 2);
  g.korLight.position.copy(p).add(new THREE.Vector3(0, 0.5, 0));
  g.scene.add(g.korLight);
}
