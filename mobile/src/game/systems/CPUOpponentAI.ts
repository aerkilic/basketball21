// CPUOpponentAI: controls BOTH CPU players. Offense (drive/shoot/pass/space) and
// defense (man-mark, contest, steal) with difficulty-scaled reaction & skill.
import { GameState, Player } from "../types";
import { DIFFICULTY, HOOP, THREE_POINT_DIST, PAINT_DIST, SHOT } from "../constants";
import {
  ballHandler,
  contestPressure,
  distToBasket,
  guardSpot,
  pickSpacingSpot,
  moveToPoint,
  nearestPlayerTo,
} from "./helpers";
import { teammates } from "../GameState";
import { launchShot } from "./ShotSystem";
import { passToTeammate } from "./PassSystem";
import { attemptSteal, attemptBlock } from "./DefenseSystem";
import { triggerCrossover } from "./DribbleSystem";
import { distXZ, headingTo, angleTowards, chance } from "../math";

export function updateCPU(g: GameState, dt: number) {
  const cpus = g.players.filter((p) => p.team === "CPU");
  if (g.possession === "CPU") {
    for (const p of cpus) offense(g, p, dt);
  } else if (g.possession === "USER") {
    assignAndDefend(g, cpus, dt);
  } else {
    // loose ball — closest CPU chases
    const closest = nearestPlayerTo(g, g.ball.pos, "CPU");
    for (const p of cpus) {
      if (p === closest && g.ball.pos.y < 2.2) moveToPoint(p, g.ball.pos.x, g.ball.pos.z, 1);
      else moveToPoint(p, p.pos.x, p.pos.z, 0);
    }
  }
}

function offense(g: GameState, p: Player, dt: number) {
  if (p.actionLock > 0 || p.airborne) return;
  const handler = ballHandler(g);
  const off = DIFFICULTY[g.difficulty].offSkill;

  if (p.hasBall) {
    handleBall(g, p, dt, off);
  } else {
    // off-ball: space or cut, like a smart teammate
    if (p.aiTimer <= 0) {
      p.aiTimer = 1.0 + Math.random() * 1.3;
      if (chance(0.3)) {
        p.aiTargetX = HOOP.rim.x + (Math.random() - 0.5) * 2.2;
        p.aiTargetZ = HOOP.rim.z + 1.8;
      } else {
        const s = pickSpacingSpot(g, p, chance(0.6));
        p.aiTargetX = s.x;
        p.aiTargetZ = s.z;
      }
    }
    moveToPoint(p, p.aiTargetX, p.aiTargetZ, 0.85);
    face(p, HOOP.rim.x, HOOP.rim.z, dt);
  }
}

function handleBall(g: GameState, p: Player, dt: number, off: number) {
  const dist = distToBasket(p.pos);
  const contest = contestPressure(g, p.pos, "CPU", false);
  const nearestDef = g.players
    .filter((q) => q.team !== p.team)
    .reduce((a, b) => (distXZ(b.pos, p.pos) < distXZ(a.pos, p.pos) ? b : a));
  const defDist = distXZ(nearestDef.pos, p.pos);

  // crossover to shake a tight defender
  if (defDist < 1.3 && p.crossoverT === 0 && chance(0.02)) triggerCrossover(g, p);

  // decision tick
  if (p.aiTimer <= 0) {
    p.aiTimer = 0.45 + Math.random() * 0.5;

    const goodRange = dist < THREE_POINT_DIST + 1.2;
    const openEnough = contest < 0.45;
    const wantShoot = goodRange && openEnough && chance(0.35 + off * 0.3);
    const dunkable = dist < PAINT_DIST && p.stats.dunk > 0.6 && contest < 0.6;

    if (dunkable || wantShoot) {
      shootNow(g, p, off);
      return;
    }
    // pass if a teammate is clearly more open
    const mate = teammates(g, p)[0];
    if (mate) {
      const mateContest = contestPressure(g, mate.pos, "CPU", false);
      if (mateContest + 0.2 < contest && chance(0.5 + off * 0.3)) {
        passToTeammate(g, p);
        return;
      }
    }
    // otherwise pick a drive/reposition target
    if (defDist > 1.6 && chance(0.5)) {
      // drive to the rim
      p.aiTargetX = HOOP.rim.x + (Math.random() - 0.5) * 1.5;
      p.aiTargetZ = HOOP.rim.z + 1.4;
    } else {
      const s = pickSpacingSpot(g, p, chance(0.5));
      p.aiTargetX = s.x;
      p.aiTargetZ = s.z;
    }
  }

  moveToPoint(p, p.aiTargetX, p.aiTargetZ, defDist < 1.2 ? 1 : 0.8);
  face(p, HOOP.rim.x, HOOP.rim.z, dt);
}

function shootNow(g: GameState, p: Player, off: number) {
  // face the rim, then launch with timing that scales with difficulty skill.
  p.heading = headingTo(p.pos, HOOP.rim);
  const ideal = SHOT.fullChargeTime;
  const hold = ideal + (Math.random() - 0.5) * 2 * (1 - off) * 0.45;
  launchShot(g, p, Math.max(0.2, hold));
}

function assignAndDefend(g: GameState, cpus: Player[], dt: number) {
  const users = g.players.filter((p) => p.team === "USER");
  const react = DIFFICULTY[g.difficulty].defReact;
  // assign each CPU to nearest unique USER attacker
  const taken = new Set<string>();
  for (const c of cpus) {
    let man = users[0];
    let bd = Infinity;
    for (const u of users) {
      if (taken.has(u.id)) continue;
      const d = distXZ(c.pos, u.pos);
      if (d < bd) {
        bd = d;
        man = u;
      }
    }
    taken.add(man.id);
    defendMan(g, c, man, react, dt);
  }
}

function defendMan(g: GameState, c: Player, man: Player, react: number, dt: number) {
  if (c.actionLock > 0 || c.airborne) return;
  const onBall = man.hasBall;
  const gap = onBall ? 1.3 : 1.5;
  const spot = guardSpot(man, gap);
  // imperfect: don't always close out fully
  moveToPoint(c, spot.x, spot.z, onBall ? 0.88 : 0.78);
  face(c, man.pos.x, man.pos.z, dt);

  if (onBall) {
    const d = distXZ(c.pos, man.pos);
    // contest a shot in progress
    if (man.charging && d < c.stats.reach + 0.6 && chance(react * dt * 8)) {
      attemptBlock(g, c);
      return;
    }
    // occasional steal attempt — only when tight and much less often
    if (d < c.stats.reach * 0.85 && c.stealCooldown === 0 && chance(react * dt * 1.1)) {
      attemptSteal(g, c);
    }
  }
}

function face(p: Player, x: number, z: number, dt: number) {
  const target = headingTo(p.pos, { x, y: 0, z } as any);
  p.heading = angleTowards(p.heading, target, 9 * dt);
}
