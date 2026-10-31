import * as THREE from 'three';
import { glowTex } from './sky.js';

// Kor: çatlaklarından turuncu ışık sızan, nabız gibi atan göktaşı parçası
export function makeKor() {
  const geo = new THREE.IcosahedronGeometry(0.32, 5);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9.1 + 1.3) * Math.cos(v.y * 7.7) * Math.sin(v.z * 8.3 + 2) * 0.06 + Math.sin(v.x * 23 + v.z * 17) * 0.012;
    v.multiplyScalar(1 + n + (v.y > 0 ? -0.1 : 0.05));
    p.setXYZ(i, v.x * 1.15, v.y * 0.85, v.z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, glow: { value: 1 } },
    vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; varying vec3 vN; uniform float t; uniform float glow;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){
        float n = n3(vP*14.0)*0.6 + n3(vP*31.0)*0.4;
        float veins = 1.0 - smoothstep(0.02, 0.09, abs(n3(vP*9.0 + vec3(0,t*0.05,0)) - 0.5));
        vec3 rock = mix(vec3(0.05,0.045,0.04), vec3(0.16,0.13,0.11), n);
        float lit = 0.35 + 0.65*max(dot(vN, normalize(vec3(0.3,1.0,0.5))), 0.0);
        vec3 c = rock * lit + vec3(1.0,0.45,0.12) * veins * glow * 2.2 + vec3(1.0,0.5,0.2)*pow(1.0-abs(vN.z),3.0)*0.15*glow;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.userData.mat = mat;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff8a3a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(1.8, 1.8, 1);
  m.add(halo);
  m.userData.halo = halo;
  return m;
}

// duman / toz parçacıkları
export function makeSmoke(center, { n = 140, rise = 16, drift = 6, alpha = 0.13, color = [0.42, 0.38, 0.36] } = {}) {
  const N = n;
  const pos = new Float32Array(N * 3), life = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    life[i] = Math.random();
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('life', new THREE.BufferAttribute(life, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { map: { value: glowTex() }, a: { value: alpha }, col: { value: new THREE.Vector3(...color) } },
    vertexShader: `attribute float life; varying float vL; varying float vNear; void main(){ vL = life; vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; float d = -mv.z; vNear = smoothstep(2.0, 6.0, d); gl_PointSize = min(150.0, (40.0 + life*260.0) / d * 5.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float a; uniform vec3 col; varying float vL; varying float vNear; void main(){ float al = texture2D(map, gl_PointCoord).a * (1.0-vL) * smoothstep(0.0,0.08,vL) * a * vNear; gl_FragColor = vec4(col*(1.2-vL*0.5), al); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return {
    points: pts,
    mat,
    center,
    update(dt) {
      const c = this.center;
      for (let i = 0; i < N; i++) {
        life[i] += dt * (0.07 + seed[i] * 0.05);
        if (life[i] > 1) life[i] -= 1;
        const L = life[i];
        pos[i * 3] = c.x + 1.2 + Math.sin(seed[i] * 40 + L * 3) * (0.4 + L * 2.5) + L * drift;
        pos[i * 3 + 1] = c.y + 0.8 + L * rise;
        pos[i * 3 + 2] = c.z + Math.cos(seed[i] * 23 + L * 2) * (0.5 + L * 2.5);
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.life.needsUpdate = true;
    },
  };
}

// el feneri ışığı + görünür ışık konisi
export function makeFlashlight(color = 0xfff2d8) {
  const g = new THREE.Group();
  const spot = new THREE.SpotLight(color, 40, 22, THREE.MathUtils.degToRad(22), 0.45, 1.6);
  spot.position.set(0, 0, 0);
  spot.target.position.set(0, 0, -5);
  g.add(spot, spot.target);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 9, 24, 1, true).translate(0, -4.5, 0).rotateX(Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { a: { value: 0.06 } },
      vertexShader: 'varying float vZ; varying float vF; void main(){ vZ = clamp(-position.z/9.0,0.,1.); vec4 mv = modelViewMatrix*vec4(position,1.); vec3 n = normalize(normalMatrix*normal); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float a; varying float vZ; varying float vF; void main(){ float k = (1.0-vZ)*(1.0-vZ)*smoothstep(0.0,0.6,vF)*smoothstep(0.0,0.08,vZ); gl_FragColor = vec4(vec3(1.0,0.95,0.85)*a*k, 1.0); }',
    })
  );
  g.add(cone);
  g.userData = { spot, cone };
  return g;
}

// gece şehir ışıkları dokusu (tuval ile üretilir)
export function cityLightsTexture(size = 2048, seed = 3) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, size, size);
  // mahalle yoğunlukları
  const blobs = [];
  for (let i = 0; i < 18; i++) blobs.push([rnd() * size, rnd() * size, size * (0.05 + rnd() * 0.18)]);
  const dens = (px, py) => {
    let d = 0;
    for (const [bx, by, r] of blobs) d += Math.exp(-((px - bx) ** 2 + (py - by) ** 2) / (r * r));
    return Math.min(1, d);
  };
  // ana yollar
  x.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    x.strokeStyle = `rgba(255,${150 + rnd() * 40},${60 + rnd() * 30},${0.35 + rnd() * 0.3})`;
    x.lineWidth = 1.5 + rnd() * 2.5;
    x.beginPath();
    let px = rnd() * size, py = rnd() * size;
    x.moveTo(px, py);
    for (let k = 0; k < 8; k++) {
      px += (rnd() - 0.5) * size * 0.35;
      py += (rnd() - 0.5) * size * 0.35;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  // pencere ve sokak ışıkları
  for (let i = 0; i < size * 60; i++) {
    const px = rnd() * size, py = rnd() * size;
    if (rnd() > dens(px, py)) continue;
    const w = rnd() < 0.8 ? 1 : 2;
    x.fillStyle = rnd() < 0.7 ? `rgba(255,${170 + rnd() * 60},${90 + rnd() * 60},${0.5 + rnd() * 0.5})` : `rgba(210,225,255,${0.4 + rnd() * 0.5})`;
    x.fillRect(px, py, w, w);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
