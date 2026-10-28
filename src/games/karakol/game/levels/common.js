import * as THREE from 'three';

// Bölüm 2–5 için ortak senaryo yardımcıları.

// Oyuncuyu kısa süre dondurup ilerleme çubuğu gösterir, sonra fn çalışır
export function timedAction(game, label, dur, fn) {
  if (game.player.frozen) return;
  game.player.frozen = true;
  game.emitUI('progress', { label, dur });
  game.time.after(dur, () => {
    game.player.frozen = false;
    fn();
  });
}

// Siviller için etkileşimler: saklanıyorsa konuş/katıl, sonra bekle/gel
export function civilianInteractions(game, level, { onJoin, waitLine, followLine } = {}) {
  for (const def of level.civilians) {
    level.interactables.push({
      id: 'civ_' + def.id,
      pos: () => {
        const c = game.civilians.find((x) => x.id === def.id);
        return c ? c.pos.clone().setY(c.pos.y + 1) : new THREE.Vector3(def.x, -100, def.z);
      },
      radius: 2.6,
      enabled: () => {
        const c = game.civilians.find((x) => x.id === def.id);
        return !!c && c.alive && ['hiding', 'wait', 'follow', 'cover'].includes(c.state);
      },
      prompt: () => {
        const c = game.civilians.find((x) => x.id === def.id);
        return c.state === 'hiding' ? `${c.name} ile konuş` : c.state === 'wait' ? `${c.name}: benimle gel` : `${c.name}: burada bekle`;
      },
      use: () => {
        const c = game.civilians.find((x) => x.id === def.id);
        if (c.state === 'hiding') {
          c.join();
          onJoin && onJoin(c);
        } else {
          const res = c.toggleWait();
          if (res === 'wait' && waitLine) game.say(waitLine);
          if (res === 'follow' && followLine) game.say(followLine);
        }
      },
    });
  }
}

// Takip eden sivil güvenli bölgeye girdiyse güvende say. Yeni kurtarılan sayısını döndürür.
export function updateEscort(game, level) {
  let n = 0;
  for (const c of game.civilians) {
    if (c.alive && (c.state === 'follow' || c.state === 'cover') && level.safeZone(c.pos)) {
      c.state = 'safe';
      n++;
    }
  }
  game.mission.stats.civiliansSaved = game.civilians.filter((c) => c.state === 'safe').length;
  return n;
}

// Kilitli kapı: görsel kanat + çarpışma; açılınca kanat döner, çarpışma kalkar
export function lockedDoor(kit, scene, { x, z, axis = 'x', w = 1.2, h = 2.1, y0 }) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a5e60, roughness: 0.5, metalness: 0.6 });
  const pivot = new THREE.Group();
  const hingeX = axis === 'x' ? x - w / 2 : x;
  const hingeZ = axis === 'x' ? z : z - w / 2;
  pivot.position.set(hingeX, y0, hingeZ);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? w : 0.08, h, axis === 'x' ? 0.08 : w), mat);
  leaf.position.set(axis === 'x' ? w / 2 : 0, h / 2, axis === 'x' ? 0 : w / 2);
  leaf.castShadow = true;
  pivot.add(leaf);
  scene.add(pivot);
  const col = kit.world.addBox(x, z, axis === 'x' ? w : 0.3, axis === 'x' ? 0.3 : w, y0, h, { bulletProof: true, tag: 'door' });
  const door = {
    open: false,
    pivot,
    col,
    pos: new THREE.Vector3(x, y0 + 1.2, z),
    openNow() {
      if (door.open) return;
      door.open = true;
      kit.world.remove(col);
      pivot.rotation.y = -1.5;
    },
    closeNow() {
      if (!door.open) return;
      door.open = false;
      kit.world.boxes.push(col);
      kit.world.rebuild();
      pivot.rotation.y = 0;
    },
  };
  return door;
}

// Hedef ok işareti için yer
export const at = (heightAt, x, z, dy = 1) => () => new THREE.Vector3(x, heightAt(x, z) + dy, z);
