import * as THREE from 'three';
import { glowTex } from './sky.js';

// Uzay: gerçek ölçekli (km) Dünya–Ay sistemi, açısal büyüklüğü koruyarak sahneye yansıtılır.
// Gemi sahnede başlangıçtadır; gök cisimleri yönlerine ve uzaklıklarına göre "uzak kubbeye" yerleştirilir.
export const RE = 6371, RM = 1737, MOON_DIST = 384400;
const RR = 40000; // gök cisimlerinin çizildiği uzaklık (sahne birimi)

export function makeSpace(g, { sunDir = new THREE.Vector3(0.6, 0.25, 0.75).normalize() } = {}) {
  const scene = g.scene;
  scene.background = new THREE.Color(0x000000);
  g.camera.near = 0.1;
  g.camera.far = 400000;
  g.camera.updateProjectionMatrix();
  const sun = new THREE.DirectionalLight(0xfff2e0, 3.0);
  sun.position.copy(sunDir).multiplyScalar(100);
  scene.add(sun, sun.target);
  const amb = new THREE.HemisphereLight(0x223355, 0x000000, 0.12);
  scene.add(amb);
  g.hemi = amb;
  g.hemiBase = 0.12;

  const day = g.tex('space/earth.jpg');
  const night = g.tex('space/lights.jpg', false);
  const clouds = g.tex('space/clouds.jpg', false);
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { day: { value: day }, night: { value: night }, clouds: { value: clouds }, sun: { value: sunDir } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform sampler2D day; uniform sampler2D night; uniform sampler2D clouds; uniform vec3 sun; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 n=normalize(vN); float d=dot(n,sun);
        vec3 dc=texture2D(day,vUv).rgb; float cl=texture2D(clouds,vUv).r; vec3 nt=texture2D(night,vUv).rgb; float nl=clamp((nt.r-nt.b*0.6)*1.6,0.,1.);
        float lit=smoothstep(-0.1,0.2,d);
        vec3 col=mix(dc, vec3(1.0), cl*0.85)*(max(d,0.)*1.4+0.01)*lit;
        col+=vec3(1.0,0.7,0.36)*pow(nl,1.5)*(1.0-smoothstep(-0.15,0.05,d))*1.6*(1.0-cl*0.7);
        vec3 v=normalize(cameraPosition-vW); float rim=pow(1.-max(dot(n,v),0.),5.);
        col=mix(col, vec3(0.35,0.6,1.0)*1.3, rim*smoothstep(-0.3,0.3,d)*0.8);
        gl_FragColor=vec4(col,1.); }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), earthMat);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.015, 96, 64),
    new THREE.ShaderMaterial({
      uniforms: { sun: { value: sunDir } },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 sun; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); vec3 n=-normalize(vN);
        float f=pow(1.-abs(dot(n,v)),3.0); float day=smoothstep(-0.35,0.35,dot(n,sun));
        vec3 c=mix(vec3(1.0,0.45,0.18), vec3(0.3,0.6,1.0), smoothstep(-0.05,0.35,dot(n,sun)));
        gl_FragColor=vec4(c*f*day*1.8, f*day); }`,
    })
  );
  earth.add(atmo);
  earth.rotation.set(0.4, 2.2, 0);
  scene.add(earth);
  const moonTex = g.tex('space/moon.jpg');
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: moonTex, bumpScale: 2, roughness: 1, metalness: 0 }));
  scene.add(moon);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff4e0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sunSprite.scale.setScalar(9000);
  scene.add(sunSprite);
  const N = 7000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(300000);
    pos.set([v.x, v.y, v.z], i * 3);
    const k = 0.5 + Math.random() * 0.5, w = Math.random();
    col.set([k * (0.9 + w * 0.1), k * 0.95, k * (1.0 - w * 0.15)], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
  scene.add(stars);

  const tmp = new THREE.Vector3();
  const place = (mesh, rel, R) => {
    // rel: gemiden gök cismine (km). Açısal büyüklüğü koru.
    const d = rel.length();
    const rr = Math.min(RR, d * 1000);
    tmp.copy(rel).multiplyScalar(rr / d);
    mesh.position.copy(tmp);
    mesh.scale.setScalar((R / d) * rr);
  };
  return {
    earth,
    moon,
    sun,
    sunDir,
    stars,
    // shipKm: geminin Dünya merkezli konumu (km); moonKm: Ay'ın konumu
    update(shipKm, moonKm, camera, shipPos = new THREE.Vector3()) {
      place(earth, new THREE.Vector3().copy(shipKm).negate(), RE);
      place(moon, new THREE.Vector3().copy(moonKm).sub(shipKm), RM);
      earth.position.add(shipPos);
      moon.position.add(shipPos);
      sunSprite.position.copy(sunDir).multiplyScalar(RR * 4).add(camera.position);
      stars.position.copy(camera.position);
    },
  };
}
