// SimpleTeamAI: drives the USER team's NON-controlled player. Gets open on offense,
// guards / helps on defense. Never ball-stalls next to the handler.
import { GameState, Player } from "../types";
import {
  ballHandler,
  pickSpacingSpot,
  guardSpot,
  moveToPoint,
  nearestPlayerTo,
  distToBasket,
} from "./helpers";
import { teammates } from "../GameState";
import { distXZ, headingTo, angleTowards } from "../math";
import { HOOP } from "../constants";

export function updateTeamAI(g: GameState, p: Player, dt: number) {
  if (p.isUserControlled || p.actionLock > 0 || p.airborne) return;

  const handler = ballHandler(g);
  const ball = g.ball;

  // Loose ball or pass in the air: chase if we're the closest USER player.
  if (ball.mode === "loose" || ball.mode === "flight") {
    const closest = nearestPlayerTo(g, ball.pos, "USER");
    if (closest === p && ball.pos.y < 2.2) {
      moveToPoint(p, ball.pos.x, ball.pos.z, 1);
      face(p, ball.pos.x, ball.pos.z, dt);
      return;
    }
  }

  if (g.possession === "USER") {
    offense(g, p, dt);
  } else {
    defense(g, p, dt);
  }
}

function offense(g: GameState, p: Player, dt: number) {
  // Re-pick a spot every ~1.5s: sometimes cut to the rim, mostly space for a shot.
  if (p.aiTimer <= 0) {
    p.aiTimer = 1.2 + Math.random() * 1.2;
    const cut = Math.random() < 0.3;
    if (cut) {
      p.aiTargetX = HOOP.rim.x + (Math.random() - 0.5) * 2;
      p.aiTargetZ = HOOP.rim.z + 1.6;
    } else {
      const want = p.stats.shoot3 > 0.5; // the small guard spaces for threes
      const s = pickSpacingSpot(g, p, want);
      p.aiTargetX = s.x;
      p.aiTargetZ = s.z;
    }
  }
  moveToPoint(p, p.aiTargetX, p.aiTargetZ, 0.85);
  face(p, HOOP.rim.x, HOOP.rim.z, dt);
}

function defense(g: GameState, p: Player, dt: number) {
  // Guard whichever CPU player the human defender isn't covering.
  const cpus = g.players.filter((q) => q.team === "CPU");
  const userDef = g.players.find((q) => q.team === "USER" && q.isUserControlled);
  // assign the man farther from the human-controlled defender
  let man = cpus[0];
  if (userDef) {
    man = cpus.reduce((a, b) =>
      distXZ(b.pos, userDef.pos) > distXZ(a.pos, userDef.pos) ? b : a
    );
  }
  const handler = ballHandler(g);
  // help toward the ball if our man is far from it
  const gap = man.hasBall ? 1.1 : 1.6;
  const spot = guardSpot(man, gap);
  moveToPoint(p, spot.x, spot.z, man.hasBall ? 1 : 0.8);
  if (handler) face(p, handler.pos.x, handler.pos.z, dt);
}

function face(p: Player, x: number, z: number, dt: number) {
  const target = headingTo(p.pos, { x, y: 0, z } as any);
  p.heading = angleTowards(p.heading, target, 9 * dt);
}
