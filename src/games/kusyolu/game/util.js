import * as THREE from 'three';
export const BASE = '/kusyolu/';
export const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
// iki nokta arasındaki yatay açı (three: yaw=0 → +Z'ye bakar)
export const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
