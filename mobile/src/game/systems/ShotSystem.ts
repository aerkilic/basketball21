// ShotSystem: charge mechanic, shot-type selection, make probability and launch.
import { GameState, Player, ShotInfo } from "../types";
import { HOOP, SHOT, GRAVITY, THREE_POINT_DIST, PAINT_DIST, DIFFICULTY } from "../constants";
import { v3, clamp, chance } from "../math";
import { contestPressure, distToBasket } from "./helpers";

export function beginCharge(p: Player) {
  // allowed in the air too, so you can leap (A) and then shoot (D) at the apex
  if (p.actionLock > 0 || !p.hasBall) return;
  p.charging = true;
  p.shootHold = 0;
  p.carryDist = 0; // start counting steps for the traveling rule
  p.anim = "windup";
  p.animPhase = 0;
}

export function updateCharge(p: Player, dt: number) {
  if (p.charging) {
    p.shootHold += dt;
    // gather but still let the player drive toward the rim
    p.intentX *= 0.7;
    p.intentZ *= 0.7;
  }
}

// Release the shot. Returns true if a real shot was launched (false = pump fake).
export function releaseShot(g: GameState, p: Player): boolean {
  if (!p.charging) return false;
  const hold = p.shootHold;
  p.charging = false;

  if (hold < SHOT.fakeMaxHold) {
    // pump fake — no ball release, brief lock; can shake a defender.
    p.anim = "windup";
    p.actionLock = 0.22;
    g.events.push({ type: "shoot", team: p.team, data: { fake: true } });
    return false;
  }

  launchShot(g, p, hold);
  return true;
}

function shotKind(p: Player, dist: number): ShotInfo["kind"] {
  if (dist < PAINT_DIST + 0.6 && p.stats.dunk > 0.6) return "dunk";
  if (dist < PAINT_DIST + 1.1) return "layup";
  if (dist >= THREE_POINT_DIST) return "three";
  return "jump";
}

function makeProbability(
  g: GameState,
  p: Player,
  dist: number,
  kind: ShotInfo["kind"],
  contest: number,
  timing: number
): number {
  const moving = Math.hypot(p.vel.x, p.vel.z) / (p.stats.speed || 1); // 0..1+
  const movePenalty = kind === "layup" || kind === "dunk" ? 0 : moving * 0.22;

  let base: number;
  if (kind === "dunk") {
    base = 0.62 + p.stats.dunk * 0.35 - contest * 0.3;
  } else if (kind === "layup") {
    base = 0.5 + p.stats.shoot2 * 0.35 - contest * 0.32;
  } else if (kind === "three") {
    const falloff = clamp(1 - (dist - THREE_POINT_DIST) / 4, 0.55, 1);
    base = p.stats.shoot3 * 0.95 * falloff - contest * 0.4;
  } else {
    const falloff = clamp(1 - (dist - PAINT_DIST) / (THREE_POINT_DIST - PAINT_DIST) * 0.45, 0.55, 1);
    base = p.stats.shoot2 * 0.92 * falloff - contest * 0.42;
  }

  base *= timing; // 0.6 (bad) .. 1.05 (perfect)
  base -= movePenalty;
  return clamp(base, 0.04, 0.96);
}

function timingQuality(hold: number): { mul: number; quality: number; perfect: boolean } {
  const ideal = SHOT.fullChargeTime;
  const diff = Math.abs(hold - ideal);
  if (diff <= SHOT.perfectWindow) return { mul: 1.05, quality: 1, perfect: true };
  const q = clamp(1 - (diff - SHOT.perfectWindow) / 0.5, 0, 1);
  return { mul: 0.62 + q * 0.33, quality: q, perfect: false };
}

export function launchShot(g: GameState, p: Player, hold: number) {
  const ball = g.ball;
  const dist = distToBasket(p.pos);
  const kind = shotKind(p, dist);
  const { mul: timing, quality, perfect } = timingQuality(hold);
  const contest = contestPressure(g, p.pos, p.team, true);

  let prob = makeProbability(g, p, dist, kind, contest, timing);
  // difficulty nudges the human player's own shooting only slightly via offSkill
  if (p.team === "USER") prob = clamp(prob + (perfect ? 0.06 : 0), 0, 0.97);

  const willMake = chance(prob);
  const points: 2 | 3 = kind === "three" ? 3 : 2;

  const shot: ShotInfo = {
    shooter: p.id,
    team: p.team,
    points,
    kind,
    willMake,
    quality,
  };

  const rim = HOOP.rim;

  // start position: a dunk is released right above the rim (the hand slams it in);
  // other shots leave from the shooter's release point.
  const start =
    kind === "dunk"
      ? v3(rim.x, rim.y + 0.6, rim.z + 0.45)
      : v3(
          p.pos.x + Math.sin(p.heading) * 0.2,
          1.95 * p.stats.height + p.jumpY,
          p.pos.z + Math.cos(p.heading) * 0.2
        );

  // target
  let target = v3(rim.x, rim.y, rim.z);
  if (!willMake) {
    const r = Math.random();
    if (r < 0.34) {
      target = v3(rim.x + (HOOP.rimRadius + 0.12) * (Math.random() < 0.5 ? -1 : 1), rim.y, rim.z);
    } else if (r < 0.67) {
      target = v3(rim.x, rim.y - 0.04, rim.z + 0.22); // front rim (short)
    } else {
      target = v3(rim.x, rim.y, rim.z - 0.22); // back rim (long)
    }
  }

  // flight time: short & steep for dunks, arcing otherwise
  const T = kind === "dunk" ? 0.32 : clamp(0.85 + dist * 0.085, 0.85, 1.55);

  ball.flightFrom = v3(start.x, start.y, start.z);
  ball.flightTo = target;
  ball.pos.x = start.x;
  ball.pos.y = start.y;
  ball.pos.z = start.z;
  ball.vel.x = (target.x - start.x) / T;
  ball.vel.z = (target.z - start.z) / T;
  ball.vel.y = (target.y - start.y - 0.5 * GRAVITY * T * T) / T;
  ball.mode = "flight";
  ball.shot = shot;
  ball.ownerId = null;
  ball.crossedRim = false;
  ball.scoredHandled = false;

  p.hasBall = false;
  g.lastTouch = p.team;
  p.anim = kind === "dunk" ? "dunk" : kind === "layup" ? "layup" : "jumpshot";
  p.animPhase = 0;
  p.actionLock = kind === "dunk" ? 0.85 : 0.5;
  // jump on a jumpshot / dunk
  if (!p.airborne && kind !== "layup") {
    p.airborne = true;
    p.jumpVel = (kind === "dunk" ? 1.5 : 1.0) * p.stats.jump * 3.8;
  }
  if (kind === "dunk") {
    p.dunkT = 0.85; // PlayerController flies the dunker to the rim & holds the slam
    p.heading = Math.atan2(rim.x - p.pos.x, rim.z - p.pos.z);
  }

  g.events.push({ type: "shoot", team: p.team, data: { kind, dist, perfect } });
}
