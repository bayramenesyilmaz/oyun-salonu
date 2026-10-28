// İlerleme kaydı (tarayıcı localStorage). Açılmış bölümler, en iyi puanlar, devam noktası, ayarlar.
const KEY = 'karakol-save-v1';

const DEFAULT = {
  unlocked: 1,
  best: {},
  resume: null, // { level, snap }
  settings: { sens: 1, vol: 0.8, music: 0.5, quality: 'high', fov: 72, voice: true, subtitles: true },
};

export function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d) return structuredClone(DEFAULT);
    return { ...structuredClone(DEFAULT), ...d, settings: { ...DEFAULT.settings, ...(d.settings || {}) } };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function writeSave(d) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* gizli mod vb. */
  }
}

export function updateSave(fn) {
  const d = loadSave();
  fn(d);
  writeSave(d);
  return d;
}

export function recordResult(level, result, unlockNext) {
  return updateSave((d) => {
    const prev = d.best[level];
    if (!prev || result.total > prev.total) d.best[level] = { total: result.total, rank: result.rank, civilians: result.civilians, docs: result.docs, date: Date.now() };
    if (unlockNext) d.unlocked = Math.min(5, Math.max(d.unlocked, level + 1));
    if (d.resume && d.resume.level === level) d.resume = null;
  });
}
