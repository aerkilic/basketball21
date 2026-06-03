// Minimal plain-object 3D vector math. Kept allocation-light for the sim loop.
// World convention: Three.js style, Y is up, court lies on the XZ plane.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const clone = (a: Vec3): Vec3 => ({ x: a.x, y: a.y, z: a.z });

export const set = (out: Vec3, x: number, y: number, z: number): Vec3 => {
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
};

export const copy = (out: Vec3, a: Vec3): Vec3 => set(out, a.x, a.y, a.z);

export const add = (a: Vec3, b: Vec3): Vec3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);

export const sub = (a: Vec3, b: Vec3): Vec3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);

export const scale = (a: Vec3, s: number): Vec3 => v3(a.x * s, a.y * s, a.z * s);

export const addScaled = (out: Vec3, a: Vec3, s: number): Vec3 =>
  set(out, out.x + a.x * s, out.y + a.y * s, out.z + a.z * s);

export const len = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);

export const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// Horizontal (court-plane) distance, ignores height.
export const distXZ = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.z - b.z);

export const normalize = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return v3(a.x / l, a.y / l, a.z / l);
};

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const lerpV = (a: Vec3, b: Vec3, t: number): Vec3 =>
  v3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

// Move a horizontal heading angle toward a target by at most `maxStep` radians.
export const angleTowards = (current: number, target: number, maxStep: number): number => {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
};

export const headingTo = (from: Vec3, to: Vec3): number =>
  Math.atan2(to.x - from.x, to.z - from.z);

export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

export const chance = (p: number): boolean => Math.random() < p;
