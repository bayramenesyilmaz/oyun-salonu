import * as THREE from 'three';

// Gece gökyüzü: degrade kubbe, keskin yıldızlar, Samanyolu şeridi, ara sıra kayan yıldızlar ve büyük göktaşı.
export function makeSky(scene) {
  const g = new THREE.Group();
  const R = 900;
  // kubbe: ufukta şehir ışığının turuncusu, tepede koyu lacivert
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(R, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { flash: { value: 0 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vD; uniform float flash;
        void main(){
          float h = vD.y;
          vec3 top = vec3(0.012,0.02,0.05);
          vec3 mid = vec3(0.03,0.05,0.10);
          vec3 hor = vec3(0.16,0.10,0.07);
          vec3 c = mix(hor, mid, smoothstep(-0.02, 0.18, h));
          c = mix(c, top, smoothstep(0.18, 0.8, h));
          c += vec3(0.55,0.85,0.7) * flash * (0.35 + 0.65*smoothstep(0.0,0.6,h));
          gl_FragColor = vec4(c,1.);
        }`,
    })
  );
  dome.renderOrder = -10;
  g.add(dome);
  // yıldızlar
  const N = 7000;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
  const band = new THREE.Vector3(0.35, 0.8, -0.45).normalize();
  let i = 0;
  while (i < N) {
    const v = new THREE.Vector3().randomDirection();
    if (v.y < -0.02) continue;
    // Samanyolu çevresinde yoğunluk artışı
    const inBand = Math.abs(v.dot(band)) < 0.18;
    if (!inBand && Math.random() < 0.45) continue;
    pos.set([v.x * R * 0.95, v.y * R * 0.95, v.z * R * 0.95], i * 3);
    const m = Math.pow(Math.random(), 6);
    const t = Math.random();
    col.set([0.8 + t * 0.2, 0.85, 1 - t * 0.15 + 0.1], i * 3);
    size[i] = 0.6 + m * 3.2 + (inBand ? 0 : 0.3);
    ph[i] = Math.random() * 6.28;
    i++;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sg.setAttribute('size', new THREE.BufferAttribute(size, 1));
  sg.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, pr: { value: 1 }, dim: { value: 1 } },
    vertexShader: `attribute float size; attribute float ph; attribute vec3 color; varying vec3 vC; varying float vA; uniform float t; uniform float pr; uniform float dim;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
        float tw = 0.75 + 0.25*sin(t*2.3 + ph*7.0);
        float hor = smoothstep(0.0, 0.25, normalize(position).y);
        vA = tw * hor * dim; vC = color; gl_PointSize = size * pr; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = dot(p,p); float a = exp(-d*22.0); gl_FragColor = vec4(vC * a * vA * 1.6, a*vA); }`,
  });
  const stars = new THREE.Points(sg, starMat);
  stars.renderOrder = -9;
  g.add(stars);
  // Samanyolu: yumuşak parlak şerit (çok sönük)
  const mw = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.97, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { band: { value: band }, dim: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vD; uniform vec3 band; uniform float dim;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){ float d = abs(dot(vD, band)); float b = exp(-d*d*60.0);
          float n = n3(vD*6.0)*0.5 + n3(vD*14.0)*0.3 + n3(vD*30.0)*0.2;
          float dust = smoothstep(0.35, 0.7, n3(vD*9.0+3.0));
          float a = b * (0.35 + 0.65*n) * (1.0 - 0.6*dust) * smoothstep(0.0, 0.3, vD.y) * dim;
          gl_FragColor = vec4(vec3(0.55,0.6,0.75) * a * 0.12, 1.); }`,
    })
  );
  mw.renderOrder = -8;
  g.add(mw);
  scene.add(g);

  // kayan yıldızlar (küçük)
  const shootMat = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shoot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shootMat);
  shoot.renderOrder = -7;
  g.add(shoot);
  let shootT = -1, nextShoot = 4, sA = new THREE.Vector3(), sB = new THREE.Vector3();

  // büyük göktaşı
  const met = new THREE.Group();
  const trailMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { a: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vU; uniform float a;
      void main(){ float along = vU.x; float across = abs(vU.y-0.5)*2.0;
        float core = exp(-across*across*9.0) * pow(along, 1.6);
        vec3 c = mix(vec3(0.35,0.9,0.6), vec3(1.0,0.98,0.9), pow(along,4.0));
        gl_FragColor = vec4(c * core * a * 3.0, core*a); }`,
  });
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), trailMat);
  met.add(trail);
  const headMat = new THREE.SpriteMaterial({ map: glowTex(), color: 0xf8fff0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const head = new THREE.Sprite(headMat);
  met.add(head);
  met.visible = false;
  scene.add(met);
  const metState = { t: -1, dur: 6.5, from: new THREE.Vector3(), to: new THREE.Vector3() };

  return {
    group: g,
    starMat,
    dome,
    flash(v) {
      dome.material.uniforms.flash.value = v;
    },
    startMeteor(from, to, dur = 6.5) {
      metState.from.copy(from);
      metState.to.copy(to);
      metState.dur = dur;
      metState.t = 0;
      met.visible = true;
    },
    meteorProgress() {
      return metState.t < 0 ? -1 : metState.t / metState.dur;
    },
    meteorHead: head,
    update(dt, t, camera, pr) {
      starMat.uniforms.t.value = t;
      starMat.uniforms.pr.value = pr;
      g.position.copy(camera.position);
      // küçük kayan yıldızlar
      nextShoot -= dt;
      if (nextShoot < 0 && shootT < 0) {
        nextShoot = 5 + Math.random() * 10;
        shootT = 0;
        const a = Math.random() * Math.PI * 2;
        const el = 0.35 + Math.random() * 0.45;
        sA.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).multiplyScalar(R * 0.9);
        const d = new THREE.Vector3(-Math.sin(a), -0.35, Math.cos(a)).normalize().multiplyScalar(R * (0.08 + Math.random() * 0.1));
        sB.copy(sA).add(d);
      }
      if (shootT >= 0) {
        shootT += dt / 0.7;
        const k = Math.min(1, shootT);
        const p = sA.clone().lerp(sB, k);
        const tail = sA.clone().lerp(sB, Math.max(0, k - 0.35));
        placeStreak(shoot, tail, p, 1.6, camera, g.position);
        shootMat.opacity = Math.sin(Math.PI * k) * 0.9;
        if (shootT >= 1) {
          shootT = -1;
          shootMat.opacity = 0;
        }
      }
      // büyük göktaşı: gökyüzünü boydan boya geçer, sonunda ufkun arkasına düşer
      if (metState.t >= 0) {
        metState.t += dt;
        const k = Math.min(1, metState.t / metState.dur);
        const e = k * k * (3 - 2 * k) * 0.6 + k * 0.4;
        const p = metState.from.clone().lerp(metState.to, e);
        const tl = metState.from.clone().lerp(metState.to, Math.max(0, e - 0.32));
        placeStreak(trail, tl, p, 14 + k * 16, camera, new THREE.Vector3());
        head.position.copy(p);
        const s = 18 + k * 40;
        head.scale.set(s, s, 1);
        const fade = k > 0.97 ? (1 - k) / 0.03 : 1;
        headMat.opacity = Math.min(1, k * 4) * fade;
        trailMat.uniforms.a.value = Math.min(1, k * 3) * fade;
        if (k >= 1) {
          metState.t = -1;
          met.visible = false;
        }
      }
    },
  };
}

// iki nokta arasına kameraya bakan ince bir şerit yerleştir
function placeStreak(mesh, a, b, width, camera, offset) {
  const wa = a.clone().add(offset), wb = b.clone().add(offset);
  const mid = wa.clone().add(wb).multiplyScalar(0.5);
  const dir = wb.clone().sub(wa);
  const len = dir.length();
  dir.normalize();
  const toCam = camera.position.clone().sub(mid).normalize();
  const side = new THREE.Vector3().crossVectors(dir, toCam).normalize();
  const n = new THREE.Vector3().crossVectors(dir, side).normalize();
  const m = new THREE.Matrix4().makeBasis(dir, side, n);
  mesh.position.copy(mid).sub(offset);
  mesh.quaternion.setFromRotationMatrix(m);
  mesh.scale.set(len, width, 1);
}

export function glowTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15, 'rgba(240,255,235,0.9)');
  g.addColorStop(0.4, 'rgba(150,255,200,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
