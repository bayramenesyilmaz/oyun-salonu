import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Korku yoğunluğuna göre: renk sapması, dalgalanma, vinyet, film greni
const FearShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFear: { value: 0 },
    uFlash: { value: 0 },
    uFade: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uFear, uFlash, uFade;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float f2 = uFear * uFear;
      uv.x += sin(uv.y * 38.0 + uTime * 7.0) * 0.003 * f2;
      uv.y += sin(uv.x * 23.0 - uTime * 5.0) * 0.0015 * f2;
      vec2 dir = uv - 0.5;
      float ca = 0.0015 + uFear * 0.011;
      vec3 c;
      c.r = texture2D(tDiffuse, uv + dir * ca).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - dir * ca).b;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c, vec3(l) * vec3(0.88, 0.97, 1.12), 0.22 + uFear * 0.35);
      float v = smoothstep(0.92, 0.18, length(dir) * (1.0 + uFear * 0.7));
      c *= mix(0.2, 1.0, v);
      float n = hash(floor(uv * uRes) + fract(uTime * 13.7) * 91.0) - 0.5;
      c += n * (0.018 + uFear * 0.05) * (0.25 + sqrt(max(l, 0.0)));
      float line = step(0.985 - uFear * 0.03, hash(vec2(floor(uv.y * 90.0), floor(uTime * 24.0))));
      c *= 1.0 - line * uFear * 0.35;
      c = mix(c, vec3(0.5, 0.02, 0.01), uFlash * 0.55);
      c *= (1.0 - uFade);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }
  `,
};

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const fear = new ShaderPass(FearShader);
  composer.addPass(fear);
  composer.addPass(new OutputPass());
  return {
    composer,
    u: fear.uniforms,
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      fear.uniforms.uRes.value.set(w * pr, h * pr);
    },
  };
}
