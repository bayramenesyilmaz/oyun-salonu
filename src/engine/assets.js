import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

// İsteğe bağlı GLB/GLTF modelleri.
// public/models/models.json dosyasında listelenen yuvalar yüklenir, ör.:
//   { "rifle": "rifle.glb", "soldier": "asker.glb" }
// Liste boşsa, dosya yoksa ya da bozuksa oyun sessizce yerleşik (kodla üretilen) modellere döner.
export const MODEL_SLOTS = ['rifle', 'binoculars', 'soldier', 'enemy', 'civilian', 'truck'];

const loader = new GLTFLoader();

function loadUrl(url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (g) => resolve(g),
      undefined,
      (err) => {
        console.warn(`[varlık] ${url} yüklenemedi, yerleşik model kullanılacak.`, err?.message || err);
        resolve(null);
      }
    );
  });
}

// Sonuç: { slot: gltf|null }
export async function preloadAll(timeoutMs = 6000, dir = 'karakol/models/') {
  const out = {};
  if (typeof location !== 'undefined' && location.protocol === 'file:') return out;
  const base = (import.meta.env?.BASE_URL || '/') + dir;
  let list = {};
  try {
    const r = await fetch(base + 'models.json', { cache: 'no-cache' });
    if (r.ok) list = await r.json();
  } catch {
    list = {};
  }
  await Promise.all(
    MODEL_SLOTS.filter((k) => typeof list[k] === 'string' && list[k]).map((k) =>
      Promise.race([loadUrl(base + list[k]), new Promise((r) => setTimeout(() => r(null), timeoutMs))]).then((g) => (out[k] = g))
    )
  );
  return out;
}

export function cloneModel(gltf) {
  return cloneSkinned(gltf.scene);
}

// Animasyon kliplerini ada göre bul (idle/walk/run/aim/die)
export function findClip(gltf, re) {
  return gltf.animations.find((a) => re.test(a.name)) || null;
}
