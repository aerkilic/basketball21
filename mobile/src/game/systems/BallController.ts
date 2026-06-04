// BallController: owns the ball's position & physics across all modes and detects
// rim / backboard interaction and made baskets.
import { GameState, Player } from "../types";
import {
  HOOP,
  BALL_RADIUS,
  GRAVITY,
  BALL_RESTITUTION,
  BALL_FRICTION,
  COURT,
  SHOT_CLOCK,
} from "../constants";
import { playerById } from "../GameState";
import { v3, distXZ } from "../math";
import { inboundBall } from "./GameMode21";

// Where the ball sits relative to a handler (hand height + slight forward offset).
function handPosition(p: Player, out = v3()): void {
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  // to the player's right side, slightly in front
  const rx = Math.cos(p.heading);
  const rz = -Math.sin(p.heading);
  const side = 0.32;
  out.x = p.pos.x + rx * side + fx * 0.18;
  out.z = p.pos.z + rz * side + fz * 0.18;
  out.y = 1.25 * p.stats.height + p.jumpY;
}

export function updateBall(g: GameState, dt: number) {
  const ball = g.ball;

  switch (ball.mode) {
    case "held":
      updateHeld(g, dt);
      break;
    case "pass":
      updatePass(g, dt);
      break;
    case "flight":
      updateFlight(g, dt);
      break;
    case "loose":
      updateLoose(g, dt);
      break;
  }
}

function updateHeld(g: GameState, dt: number) {
  const ball = g.ball;
  const h = playerById(g, ball.ownerId);
  if (!h) {
    ball.mode = "loose";
    return;
  }
  g.lastTouch = h.team;
  const hand = v3();
  handPosition(h, hand);

  // Dribble bounce when grounded & not winding up a shot.
  const dribbling = !h.airborne && !h.charging && h.anim !== "windup" && h.anim !== "layup";
  if (dribbling) {
    ball.dribblePhase = (ball.dribblePhase + dt * (h.vel.x || h.vel.z ? 3.2 : 2.2)) % 1;
    const bounce = Math.abs(Math.sin(ball.dribblePhase * Math.PI)); // 0..1
    // crossover swings the ball across the body
    let cross = 0;
    if (h.crossoverT > 0) {
      cross = Math.sin((1 - h.crossoverT / 0.4) * Math.PI) * 0.5;
      const rx = Math.cos(h.heading);
      const rz = -Math.sin(h.heading);
      hand.x -= rx * cross * 1.4;
      hand.z -= rz * cross * 1.4;
    }
    hand.y = 0.18 + bounce * (0.95 * h.stats.height);
  } else {
    // ball brought up to chest/hands for shooting or in the air
    hand.y = (h.charging ? 1.7 : 1.35) * h.stats.height + h.jumpY;
  }
  ball.pos.x = hand.x;
  ball.pos.y = hand.y;
  ball.pos.z = hand.z;
  ball.vel.x = ball.vel.y = ball.vel.z = 0;
}

function updatePass(g: GameState, dt: number) {
  const ball = g.ball;
  const target = playerById(g, ball.passTargetId);
  if (!target) {
    ball.mode = "loose";
    return;
  }
  const tx = target.pos.x;
  const tz = target.pos.z;
  const ty = 1.3 * target.stats.height;
  const dx = tx - ball.pos.x;
  const dz = tz - ball.pos.z;
  const dy = ty - ball.pos.y;
  const d = Math.hypot(dx, dz);
  const speed = 13;
  if (d < 0.5) {
    // caught
    target.hasBall = true;
    ball.ownerId = target.id;
    ball.passTargetId = null;
    ball.mode = "held";
    g.possession = target.team;
    g.events.push({ type: "dribble", team: target.team });
    return;
  }
  const step = (speed * dt) / d;
  ball.pos.x += dx * step;
  ball.pos.z += dz * step;
  ball.pos.y += dy * Math.min(1, step) + Math.sin(step) * 0.0;
  // gentle arc
  ball.pos.y += Math.sin((1 - d / 8) * Math.PI) * 0.0;
  ball.spin += dt * 12;
}

function updateFlight(g: GameState, dt: number) {
  const ball = g.ball;
  // integrate projectile
  ball.vel.y += GRAVITY * dt;
  const prevY = ball.pos.y;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;
  ball.spin += dt * 9;

  const rim = HOOP.rim;
  const dxz = distXZ(ball.pos, rim);

  // Backboard collision (vertical plane behind rim).
  if (
    ball.vel.z < 0 &&
    ball.pos.z <= HOOP.backboardZ + BALL_RADIUS &&
    ball.pos.z > HOOP.backboardZ - 0.2 &&
    ball.pos.y > 3.0 &&
    ball.pos.y < HOOP.backboardY + 0.2 &&
    Math.abs(ball.pos.x) < 0.95
  ) {
    ball.pos.z = HOOP.backboardZ + BALL_RADIUS;
    ball.vel.z = Math.abs(ball.vel.z) * 0.45;
    ball.vel.x *= 0.6;
    g.events.push({ type: "rimhit" });
    g.hoopFx.rimShake = Math.max(g.hoopFx.rimShake, 0.35);
  }

  // Rim-plane crossing (descending through the hoop height).
  const crossingDown =
    prevY > rim.y && ball.pos.y <= rim.y && ball.vel.y < 0 && !ball.crossedRim;
  if (crossingDown) {
    ball.crossedRim = true;
    if (dxz < HOOP.rimRadius - BALL_RADIUS * 0.4 && ball.shot?.willMake) {
      // SWISH / made basket — drop straight through.
      onMade(g);
      ball.vel.x *= 0.2;
      ball.vel.z *= 0.2;
      ball.vel.y = -3.2;
      return;
    }
    if (dxz < HOOP.rimRadius + BALL_RADIUS) {
      // clipped the rim — bounce out, becomes a rebound.
      const nx = (ball.pos.x - rim.x) / (dxz || 1);
      const nz = (ball.pos.z - rim.z) / (dxz || 1);
      ball.vel.x = nx * 2.2 + (Math.random() - 0.5);
      ball.vel.z = nz * 2.2 + (Math.random() - 0.5) * 0.6;
      ball.vel.y = 1.6;
      g.events.push({ type: "rimhit" });
      g.hoopFx.rimShake = Math.max(g.hoopFx.rimShake, 0.5);
      ball.mode = "loose";
      ball.shot = null;
      return;
    }
  }

  // Missed everything — fell below rim height: go loose.
  if (ball.pos.y < 2.4 && (ball.vel.y < 0 || ball.crossedRim)) {
    if (!ball.scoredHandled) g.events.push({ type: "miss" });
    ball.mode = "loose";
    ball.shot = null;
  }
}

function onMade(g: GameState) {
  const ball = g.ball;
  const shot = ball.shot!;
  ball.scoredHandled = true;
  // Net + rim reaction scales with shot type.
  let impulse = 0.55;
  let swing = 0;
  if (shot.kind === "three") {
    impulse = 0.85;
  } else if (shot.kind === "dunk") {
    impulse = 1.0;
    swing = (Math.random() - 0.5) * 2;
    g.hoopFx.rimShake = 1;
    g.events.push({ type: "dunk", team: shot.team });
  }
  g.hoopFx.netImpulse = impulse;
  g.hoopFx.netSwingDir = swing;
  g.events.push({ type: "swish" });
  g.events.push({ type: "score", team: shot.team, data: { points: shot.points, kind: shot.kind } });
}

function updateLoose(g: GameState, dt: number) {
  const ball = g.ball;
  ball.vel.y += GRAVITY * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;
  ball.spin += dt * (Math.abs(ball.vel.x) + Math.abs(ball.vel.z)) * 0.5;

  // ground bounce
  if (ball.pos.y < BALL_RADIUS) {
    ball.pos.y = BALL_RADIUS;
    if (ball.vel.y < -0.4) {
      ball.vel.y = -ball.vel.y * BALL_RESTITUTION;
      ball.vel.x *= BALL_FRICTION;
      ball.vel.z *= BALL_FRICTION;
      g.events.push({ type: "dribble" });
    } else {
      ball.vel.y = 0;
      ball.vel.x *= 0.9;
      ball.vel.z *= 0.9;
    }
  }
  // out of bounds -> inbound for the other team (only during live play)
  const oob =
    Math.abs(ball.pos.x) > COURT.halfWidth ||
    ball.pos.z > COURT.zFront ||
    ball.pos.z < COURT.zBack;
  if (oob) {
    if (g.phase === "LIVE") {
      inboundBall(g, ball.pos.x, ball.pos.z);
      return;
    }
    // not live: just keep it on the court
    ball.pos.x = Math.max(-COURT.halfWidth, Math.min(COURT.halfWidth, ball.pos.x));
    ball.pos.z = Math.max(COURT.zBack, Math.min(COURT.zFront, ball.pos.z));
    ball.vel.x *= -0.4;
    ball.vel.z *= -0.4;
  }

  // Pickup / rebound: a player can grab the ball if their hands reach it. Jumping
  // (airborne) raises the reach so you can actively pull down a rebound in the air.
  if (g.phase === "LIVE") {
    let grabber: typeof g.players[number] | null = null;
    let bestD = Infinity;
    for (const p of g.players) {
      const handReach = 1.45 * p.stats.height + p.jumpY + (p.airborne ? 0.55 : 0.25);
      if (ball.pos.y > handReach + 0.3) continue; // too high for this player
      const d = distXZ(p.pos, ball.pos);
      const grabRadius =
        0.55 + p.stats.rebound * 0.5 + (p.airborne ? 0.45 : 0);
      if (d < grabRadius && d < bestD) {
        bestD = d;
        grabber = p;
      }
    }
    if (grabber) {
      g.players.forEach((p) => (p.hasBall = false));
      grabber.hasBall = true;
      grabber.carryDist = 0;
      ball.ownerId = grabber.id;
      ball.mode = "held";
      ball.shot = null;
      ball.scoredHandled = false;
      const changed = g.possession !== grabber.team;
      g.possession = grabber.team;
      g.lastTouch = grabber.team;
      g.shotClock = SHOT_CLOCK; // fresh clock on any rebound (offensive or defensive)
      if (changed) g.events.push({ type: "steal", team: grabber.team, data: { rebound: true } });
    }
  }
}
