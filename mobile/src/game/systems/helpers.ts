// Cross-system helpers shared by AI and gameplay systems.
import { GameState, Player, TeamId } from "../types";
import { BASKET_GROUND, HOOP, THREE_POINT_DIST, COURT } from "../constants";
import { Vec3, distXZ, headingTo, clamp } from "../math";

export const ballHandler = (g: GameState): Player | null =>
  g.players.find((p) => p.hasBall) ?? null;

export const userPlayer = (g: GameState): Player =>
  g.players.find((p) => p.isUserControlled && p.team === "USER") ?? g.players[1];

export function nearestOpponent(g: GameState, p: Player): Player {
  let best = g.players[0];
  let bd = Infinity;
  for (const q of g.players) {
    if (q.team === p.team) continue;
    const d = distXZ(p.pos, q.pos);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}

export function nearestPlayerTo(g: GameState, point: Vec3, team?: TeamId): Player {
  let best = g.players[0];
  let bd = Infinity;
  for (const q of g.players) {
    if (team && q.team !== team) continue;
    const d = distXZ(q.pos, point);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}

export const distToBasket = (p: Vec3): number => distXZ(p, BASKET_GROUND);

export const isThree = (p: Vec3): boolean => distToBasket(p) >= THREE_POINT_DIST;

// How tightly the nearest defender of `team`'s opponents is contesting position `pos`.
// Returns 0 (wide open) .. 1 (smothered).
export function contestPressure(g: GameState, pos: Vec3, offenseTeam: TeamId, jumpAware = true): number {
  let best = 0;
  for (const q of g.players) {
    if (q.team === offenseTeam) continue;
    const d = distXZ(q.pos, pos);
    let reach = q.stats.reach;
    if (jumpAware && q.airborne) reach += 0.8; // contesting in the air counts more
    const p = clamp(1 - d / (reach + 1.6), 0, 1);
    if (p > best) best = p;
  }
  return best;
}

// Face the player toward a world point (sets heading target via PlayerController smoothing).
export const faceTarget = (p: Player, target: Vec3) => {
  p.aiTimer = p.aiTimer; // noop to keep tree-shaking honest
  return headingTo(p.pos, target);
};

// Set a movement intent toward a court point at a given speed fraction (0..1).
export function moveToPoint(p: Player, x: number, z: number, speedFrac: number, stopRadius = 0.25) {
  const dx = x - p.pos.x;
  const dz = z - p.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < stopRadius) {
    p.intentX = 0;
    p.intentZ = 0;
    return;
  }
  const s = p.stats.speed * clamp(speedFrac, 0, 1);
  p.intentX = (dx / d) * s;
  p.intentZ = (dz / d) * s;
}

export function moveDir(p: Player, dx: number, dz: number, speedFrac: number) {
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) {
    p.intentX = 0;
    p.intentZ = 0;
    return;
  }
  const s = p.stats.speed * clamp(speedFrac, 0, 1);
  p.intentX = (dx / d) * s;
  p.intentZ = (dz / d) * s;
}

// Clamp a court position to stay in bounds (with a small margin).
export function clampToCourt(x: number, z: number, m = 0.3): [number, number] {
  return [
    clamp(x, -COURT.halfWidth + m, COURT.halfWidth - m),
    clamp(z, COURT.zBack + m, COURT.zFront - m),
  ];
}

export const rimPoint = (): Vec3 => HOOP.rim;

// Good half-court shooting / spacing spots (X, Z) around the single hoop.
export const SPOTS: { x: number; z: number; three: boolean }[] = [
  { x: 0, z: -0.2, three: true }, // top of the arc
  { x: -4.4, z: -2.2, three: true }, // left wing
  { x: 4.4, z: -2.2, three: true }, // right wing
  { x: -6.0, z: -5.6, three: true }, // left corner
  { x: 6.0, z: -5.6, three: true }, // right corner
  { x: -1.8, z: -4.6, three: false }, // left mid / cut
  { x: 1.8, z: -4.6, three: false }, // right mid / cut
];

// Pick a spacing spot for an off-ball offensive player: far from the ball handler
// and from a chosen teammate, biased by whether we want a three or a cut.
export function pickSpacingSpot(g: GameState, p: Player, wantThree: boolean): { x: number; z: number } {
  const handler = ballHandler(g);
  let best = SPOTS[0];
  let bestScore = -Infinity;
  for (const s of SPOTS) {
    let score = 0;
    if (wantThree && s.three) score += 2;
    if (!wantThree && !s.three) score += 1.5;
    // spacing away from handler
    if (handler) score += Math.min(distXZ(handler.pos, { x: s.x, y: 0, z: s.z } as Vec3), 6) * 0.4;
    // closeness to current position (don't run across the whole court)
    score -= distXZ(p.pos, { x: s.x, y: 0, z: s.z } as Vec3) * 0.15;
    score += Math.random() * 0.8;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return { x: best.x, z: best.z };
}

// Stand between the guarded man and the basket, `gap` meters off them.
export function guardSpot(man: Player, gap: number): { x: number; z: number } {
  const bx = BASKET_GROUND.x;
  const bz = BASKET_GROUND.z;
  const dx = man.pos.x - bx;
  const dz = man.pos.z - bz;
  const d = Math.hypot(dx, dz) || 1;
  return { x: man.pos.x - (dx / d) * gap, z: man.pos.z - (dz / d) * gap };
}

