import * as THREE from 'three';
import { makeSoldier, animSoldier, nameSprite, setSit, animCivilian, ROLES } from './chars.js';
import * as S from './sfx.js';

// Çok oyunculu (en çok 4 insan) işbirliği: kurucu (host) düşman/rehine/helikopter/görevi yönetir,
// diğer oyuncular onun görüntüsünü alır. Herkes kendi konumunu, atışlarını ve olaylarını gönderir.
const TAU = Math.PI * 2;
const angDiff = (a, b) => ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const r2 = (v) => Math.round(v * 100) / 100;
const ST = ['idle', 'patrol', 'search', 'combat'];
const HST = ['bound', 'follow', 'safe'];
const HEL = ['circle', 'inbound', 'landed'];

export const coop = {
  isGuest() {
    return !!this.net && !this.net.host;
  },
  // canlı insan oyuncular (kendisi dahil)
  humans() {
    const out = [];
    if (!this.pl.dead) out.push(this.pl);
    if (this.net) for (const r of Object.values(this.net.remotes)) if (!r.dead) out.push(r);
    return out;
  },
  // rehinenin takip edeceği oyuncu: en yakın canlı insan
  leader(h) {
    let best = this.pl, bd = 1e9;
    for (const a of this.humans()) {
      const d = Math.hypot(a.pos.x - h.pos.x, a.pos.z - h.pos.z);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  },
  hurtAny(w, dmg, src) {
    if (w === this.pl) this.hurtPlayer(dmg, src);
    else if (w.kind === 'remote') this.netSend({ k: 'hurt', to: w.uid, d: r2(dmg), sx: r2(src.x), sz: r2(src.z) });
    else this.hurtFriend(w, dmg, src);
  },
  netSend(e) {
    if (this.net) this.net.room.sendEv(e);
  },

  netAttach(net) {
    this.netDetach();
    const room = net.room;
    this.net = { room, host: net.host, uid: room.uid, remotes: {}, snap: null, posT: 0, worldT: 0, shots: [], heliP: null };
    room
      .on('pos', (u, p) => this.netPos(u, p))
      .on('ev', (u, e) => this.netEv(u, e))
      .on('world', (s) => this.netSnap(s))
      .on('players', (pl) => this.netPlayers(pl))
      .on('closed', () => {
        if (this.net && this.phase === 'play' && !this.net.host) this.cb.onNetClosed?.();
      });
    this.netPlayers(room.players);
  },
  netDetach() {
    const n = this.net;
    if (!n) return;
    for (const r of Object.values(n.remotes)) this.scene.remove(r.g);
    try {
      n.room.leave();
    } catch {}
    this.net = null;
  },
  netPlayers(pl) {
    const n = this.net;
    if (!n || !pl) return;
    const uids = Object.keys(pl).sort();
    for (const u of uids) {
      if (u === n.uid || n.remotes[u]) continue;
      const info = pl[u] || {};
      const role = ROLES[info.r] ? info.r : 'komando';
      const g = makeSoldier(role, false);
      const tag = nameSprite(info.n || 'Oyuncu');
      tag.position.y = 2.55;
      g.add(tag);
      const i = uids.indexOf(u);
      g.position.set((i - 1.5) * 1.6, 0, this.world.spawn.z);
      this.scene.add(g);
      n.remotes[u] = { kind: 'remote', uid: u, name: info.n || 'Oyuncu', role, g, pos: g.position, yaw: 0, hp: 100, maxHp: 100, dead: false, speed: 0, tx: g.position.x, ty: 0, tz: g.position.z, tyaw: 0, tag, got: false };
    }
    for (const u of Object.keys(n.remotes)) {
      if (!pl[u]) {
        this.scene.remove(n.remotes[u].g);
        delete n.remotes[u];
        this.say('Bir oyuncu ayrıldı.', 0);
      }
    }
  },
  netPos(u, p) {
    const r = this.net?.remotes[u];
    if (!r || !p) return;
    r.tx = p.x;
    r.ty = p.y;
    r.tz = p.z;
    r.tyaw = p.w;
    r.speed = p.s || 0;
    r.hp = p.h;
    if (!r.got) {
      r.got = true;
      r.pos.set(p.x, p.y, p.z);
      r.yaw = p.w;
    }
    const dead = !!p.d;
    if (dead !== r.dead) {
      r.dead = dead;
      r.tag.visible = !dead;
    }
  },
  netEv(u, e) {
    const n = this.net;
    if (!n || this.mode !== 'play') return;
    const r = n.remotes[u];
    if (e.k === 'f' && r) {
      const o = e.o, p = e.p;
      this.tracer(o, p, 0xffe0a0, 0.06);
      const d = Math.hypot(o[0] - this.pl.pos.x, o[2] - this.pl.pos.z);
      S.shot(e.w || 'm4', Math.max(0.05, 1 / (1 + d / 16)) * 0.8);
      if (n.host) this.noise(new THREE.Vector3(o[0], o[1], o[2]), e.w === 'pistol' ? 38 : 60);
    } else if (e.k === 'hit' && n.host && r) {
      const en = this.enemies[e.i];
      if (en) this.hurtEnemy(en, e.d, !!e.h, false, r.pos);
    } else if (e.k === 'free' && n.host) {
      const h = this.hostages[e.i];
      if (h && h.state === 'bound') this.freeHostage(h);
    } else if (e.k === 'n' && r) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshLambertMaterial({ color: 0x3d4a2a, flatShading: true }));
      m.position.set(e.p[0], e.p[1], e.p[2]);
      this.scene.add(m);
      this.nades.push({ m, vel: new THREE.Vector3(e.v[0], e.v[1], e.v[2]), t: 2.0, remote: true });
    } else if (e.k === 'hurt' && e.to === n.uid) {
      this.hurtPlayer(e.d, { x: e.sx, z: e.sz });
    } else if (e.k === 'say' && !n.host) {
      this.say(e.t, 0);
    }
  },

  makeSnap() {
    const n = this.net;
    const h = this.heli;
    const snap = {
      e: this.enemies.map((e) => [r2(e.pos.x), r2(e.pos.z), r2(e.pos.y), r2(e.yaw), Math.round(e.hp), Math.max(0, ST.indexOf(e.state)), r2(e.speed || 0)]),
      f: this.friends.map((f) => [r2(f.pos.x), r2(f.pos.z), r2(f.pos.y), r2(f.yaw), Math.round(f.hp), r2(f.speed || 0)]),
      h: this.hostages.map((x) => [r2(x.pos.x), r2(x.pos.z), r2(x.yaw), HST.indexOf(x.state)]),
      s: [HEL.indexOf(this.heliState), r2(h.position.x), r2(h.position.y), r2(h.position.z), r2(h.rotation.y), r2(h.rotation.z)],
      k: this.kills,
      r: this.rescued,
      p: this.phase === 'won' ? 1 : this.phase === 'lost' ? 2 : 0,
      eh: r2(this.evacHold || 0),
      sh: n.shots.splice(0, 8),
    };
    return snap;
  },
  netSendWorld() {
    if (this.net?.host) this.net.room.sendWorld(this.makeSnap());
  },
  netSnap(s) {
    const n = this.net;
    if (!n || n.host || this.mode !== 'play' || !s || !s.e) return;
    n.snap = s;
    s.e.forEach((a, i) => {
      const e = this.enemies[i];
      if (!e) return;
      e.tx = a[0];
      e.tz = a[1];
      e.ty = a[2];
      e.tyaw = a[3];
      e.hp = a[4];
      e.state = ST[a[5]] || 'idle';
      e.spd = a[6];
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        e.marker.visible = false;
      }
    });
    s.f.forEach((a, i) => {
      const f = this.friends[i];
      if (!f) return;
      f.tx = a[0];
      f.tz = a[1];
      f.ty = a[2];
      f.tyaw = a[3];
      f.hp = a[4];
      f.spd = a[5];
      if (f.hp <= 0 && !f.dead) {
        f.dead = true;
        f.tag.visible = false;
      }
    });
    s.h.forEach((a, i) => {
      const h = this.hostages[i];
      if (!h) return;
      h.tx = a[0];
      h.tz = a[1];
      h.tyaw = a[2];
      h.state = HST[a[3]] || 'bound';
      if (h.state !== 'bound' && h.sit !== false) {
        h.sit = false;
        setSit(h.g, false);
      }
      if (h.state === 'safe') h.g.visible = false;
    });
    this.kills = s.k;
    this.rescued = s.r;
    const hs = HEL[s.s[0]] || 'circle';
    if (hs !== this.heliState) {
      this.heliState = hs;
      if (hs === 'landed') this.evacReady = true;
    }
    n.heliP = s.s;
    this.evacHold = s.eh;
    for (const t of s.sh || []) {
      this.tracer([t[0], t[1], t[2]], [t[3], t[4], t[5]], t[6] ? 0xa0d0ff : 0xff8060, 0.06);
      const d = Math.hypot(t[0] - this.pl.pos.x, t[2] - this.pl.pos.z);
      S.shot('m4', Math.max(0.05, 1 / (1 + d / 16)) * 0.7);
    }
    if (s.p > 0 && this.phase === 'play') this.endMission(s.p === 1);
  },
  // kurucu olmayanlarda yapay zekâ yok: görüntüyü yumuşakça uygula
  netProxyStep(dt) {
    const k = Math.min(1, dt * 10);
    const follow = (a, spdKey) => {
      const first = !a.tInit;
      a.tInit = true;
      if (a.tx === undefined) return false;
      const ox = a.pos.x, oz = a.pos.z;
      if (first) a.pos.set(a.tx, a.ty ?? a.pos.y, a.tz);
      else a.pos.set(a.pos.x + (a.tx - a.pos.x) * k, a.pos.y + ((a.ty ?? a.pos.y) - a.pos.y) * k, a.pos.z + (a.tz - a.pos.z) * k);
      a.yaw += angDiff(a.yaw, a.tyaw ?? a.yaw) * k;
      a.g.rotation.y = a.yaw;
      a.speed = a[spdKey] ?? Math.hypot(a.pos.x - ox, a.pos.z - oz) / dt;
      return true;
    };
    for (const e of this.enemies) {
      if (!e.dead) follow(e, 'spd');
      animSoldier(e.g, dt, e.speed || 0, e.dead);
    }
    for (const f of this.friends) {
      if (!f.dead) follow(f, 'spd');
      animSoldier(f.g, dt, f.speed || 0, f.dead);
    }
    for (const h of this.hostages) {
      if (h.state === 'safe') continue;
      follow(h, 'none');
      animCivilian(h.g, dt, h.state === 'bound' ? 0 : h.speed || 0);
    }
  },
  netStep(dt) {
    const n = this.net;
    if (!n) return;
    const k = Math.min(1, dt * 12);
    for (const r of Object.values(n.remotes)) {
      r.pos.x += (r.tx - r.pos.x) * k;
      r.pos.y += (r.ty - r.pos.y) * k;
      r.pos.z += (r.tz - r.pos.z) * k;
      r.yaw += angDiff(r.yaw, r.tyaw) * k;
      r.g.rotation.y = r.yaw;
      animSoldier(r.g, dt, r.speed, r.dead);
    }
    n.posT -= dt;
    if (n.posT <= 0) {
      n.posT = 0.1;
      const p = this.pl;
      n.room.sendPos({ x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), w: r2(p.yaw), s: r2(Math.hypot(p.vel.x, p.vel.z)), h: Math.round(p.hp), d: p.dead ? 1 : 0, c: p.crouchK > 0.5 ? 1 : 0 });
    }
    if (n.host) {
      n.worldT -= dt;
      if (n.worldT <= 0) {
        n.worldT = 0.125;
        n.room.sendWorld(this.makeSnap());
      }
      if (this.phase === 'play' && this.humans().length === 0) this.endMission(false);
    }
  },
};
