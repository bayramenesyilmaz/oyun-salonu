import { Roof, Stairs, Street, Arsa } from './scenes.js';
import { Gece } from './gece.js';
import { Depo, Hurdalik, Cati2 } from './depo.js';
import { Kokpit, Kalkis, Bosluk, Inis, Ay } from './gokyuzu.js';

export const SCENES = {
  roof: Roof,
  stairs: Stairs,
  street: Street,
  arsa: Arsa,
  gece: Gece,
  depo: Depo,
  hurdalik: Hurdalik,
  cati2: Cati2,
  kokpit: Kokpit,
  kalkis: Kalkis,
  bosluk: Bosluk,
  inis: Inis,
  ay: Ay,
};
// sahnenin ait olduğu bölüm
export const SCENE_CHAPTER = { roof: 1, stairs: 1, street: 1, arsa: 1, gece: 1, depo: 2, hurdalik: 2, cati2: 2, kokpit: 3, kalkis: 3, bosluk: 3, inis: 3, ay: 3 };
