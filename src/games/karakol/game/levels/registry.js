import { buildLevel1 } from './level1.js';
import { buildLevel2 } from './level2.js';
import { buildLevel3 } from './level3.js';
import { buildLevel4 } from './level4.js';
import { buildLevel5 } from './level5.js';

const BUILDERS = { 1: buildLevel1, 2: buildLevel2, 3: buildLevel3, 4: buildLevel4, 5: buildLevel5 };

export function buildLevel(n, game) {
  return (BUILDERS[n] || buildLevel1)(game);
}
