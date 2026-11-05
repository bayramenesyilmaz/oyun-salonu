import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Sinematik son işlem: renk derecelendirme, vinyet, film greni,
// hasar (kırmızı kenar), yavaş çekim (renk sapması + soğuk ton), kararma.
const Grade = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uDamage: { value: 0 },
    uSlow: { value: 0 },
    uFade: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uLetterbox: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uDamage, uSlow, uFade, uLetterbox;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 dir = uv - 0.5;
      float ca = 0.0008 + uSlow * 0.006 + uDamage * 0.004;
      vec3 c;
      c.r = texture2D(tDiffuse, uv + dir * ca).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - dir * ca).b;
      // askerî sinematik ton: gölgeler soğuk camgöbeği, ışıklar sıcak
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 shadowTint = vec3(0.86, 0.98, 1.06);
      vec3 hiTint = vec3(1.06, 1.0, 0.9);
      c *= mix(shadowTint, hiTint, smoothstep(0.05, 0.6, l));
      c = mix(vec3(l), c, 0.82 - uSlow * 0.35); // hafif doygunluk düşüşü
      c = (c - 0.5) * 1.06 + 0.5;
      // yavaş çekimde soğuk mavi
      c = mix(c, c * vec3(0.8, 0.95, 1.2), uSlow * 0.5);
      // vinyet
      float v = smoothstep(0.95, 0.25, length(dir) * (1.0 + uSlow * 0.4));
      c *= mix(0.35, 1.0, v);
      // hasar
      float edge = smoothstep(0.25, 0.75, length(dir));
      c = mix(c, vec3(0.45, 0.02, 0.0), edge * uDamage * 0.75);
      // gren
      float n = hash(floor(uv * uRes) + fract(uTime * 17.0) * 77.0) - 0.5;
      c += n * 0.03 * (0.4 + sqrt(max(l, 0.0)));
      // sinematik siyah bantlar
      float bar = uLetterbox * 0.12;
      if (uv.y < bar || uv.y > 1.0 - bar) c = vec3(0.0);
      c *= 1.0 - uFade;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass(Grade);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    composer,
    u: grade.uniforms,
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      grade.uniforms.uRes.value.set(w * pr, h * pr);
    },
  };
}
