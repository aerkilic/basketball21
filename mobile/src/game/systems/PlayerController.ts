// PlayerController: integrates every player's movement, jump arc, body collisions,
// facing and animation-state selection. Reads `intentX/intentZ` set by input/AI.
import { GameState, Player } from "../types";
import { GRAVITY, PLAYER_RADIUS, HOOP } from "../constants";
import { clamp, angleTowards } from "../math";
import { clampToCourt } from "./helpers";

export function updatePlayers(g: GameState, dt: number) {
  for (const p of g.players) {
    integrate(g, p, dt);
    timers(p, dt);
    selectAnim(p, dt);
  }
  separate(g);
}

function integrate(g: GameState, p: Player, dt: number) {
  // Dunk sequence: fly to the rim, rise, hang, then come down — overrides normal
  // movement so the slam reads clearly.
  if (p.dunkT > 0) {
    p.dunkT = Math.max(0, p.dunkT - dt);
    const phase = 1 - p.dunkT / 0.85;
    const tx = HOOP.rim.x;
    const tz = HOOP.rim.z + 0.55;
    p.pos.x += (tx - p.pos.x) * Math.min(1, dt * 7);
    p.pos.z += (tz - p.pos.z) * Math.min(1, dt * 7);
    p.jumpY = Math.sin(Math.min(1, phase) * Math.PI) * 0.95;
    p.airborne = true;
    p.vel.x = 0;
    p.vel.z = 0;
    p.heading = Math.atan2(tx - p.pos.x, tz - p.pos.z);
    if (p.dunkT === 0) {
      p.airborne = false;
      p.jumpY = 0;
      p.anim = "idle";
    }
    return;
  }

  // smooth actual velocity toward intent
  const a = p.stats.accel;
  p.vel.x += clamp(p.intentX - p.vel.x, -a * dt, a * dt);
  p.vel.z += clamp(p.intentZ - p.vel.z, -a * dt, a * dt);
  // friction when no intent
  if (p.intentX === 0 && p.intentZ === 0) {
    p.vel.x *= 0.82;
    p.vel.z *= 0.82;
  }

  p.pos.x += p.vel.x * dt;
  p.pos.z += p.vel.z * dt;
  const [cx, cz] = clampToCourt(p.pos.x, p.pos.z);
  p.pos.x = cx;
  p.pos.z = cz;

  // vertical jump arc
  if (p.airborne) {
    p.jumpY += p.jumpVel * dt;
    p.jumpVel += GRAVITY * dt;
    if (p.jumpY <= 0) {
      p.jumpY = 0;
      p.jumpVel = 0;
      p.airborne = false;
      if (p.anim === "jump" || p.anim === "jumpshot" || p.anim === "dunk") p.anim = "idle";
    }
  }

  // face movement direction (or keep heading while charging/shooting)
  const speed = Math.hypot(p.vel.x, p.vel.z);
  if (!p.charging && p.anim !== "windup" && speed > 0.4) {
    const target = Math.atan2(p.vel.x, p.vel.z);
    p.heading = angleTowards(p.heading, target, 12 * dt);
  }
}

function timers(p: Player, dt: number) {
  p.actionLock = Math.max(0, p.actionLock - dt);
  p.stealCooldown = Math.max(0, p.stealCooldown - dt);
  p.blockCooldown = Math.max(0, p.blockCooldown - dt);
  if (p.aiTimer > 0) p.aiTimer = Math.max(0, p.aiTimer - dt);
}

function selectAnim(p: Player, dt: number) {
  // Don't override committed action anims while they play out.
  const committed =
    p.anim === "jumpshot" ||
    p.anim === "dunk" ||
    p.anim === "layup" ||
    p.anim === "windup" ||
    p.anim === "steal" ||
    p.anim === "crossover" ||
    p.anim === "jump" ||
    p.anim === "fall";

  const speed = Math.hypot(p.vel.x, p.vel.z);
  if (!committed) {
    if (speed > 0.5) {
      p.anim = p.hasBall ? "dribble" : "run";
    } else {
      p.anim = "idle";
    }
  }

  // advance anim phase; committed action anims auto-clear via actionLock
  const rate =
    p.anim === "run" || p.anim === "dribble"
      ? 1.6 + speed * 0.4
      : p.anim === "crossover"
      ? 2.6
      : 2.0;
  p.animPhase = (p.animPhase + dt * rate) % 1;

  if (committed && p.actionLock === 0 && p.crossoverT === 0 && !p.airborne) {
    if (p.anim !== "fall") p.anim = "idle";
  }
}

// Soft body separation so players don't stack.
function separate(g: GameState) {
  const ps = g.players;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      if (a.airborne || b.airborne) continue;
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz) || 0.001;
      const min = PLAYER_RADIUS * 2;
      if (d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const nz = dz / d;
        a.pos.x -= nx * push;
        a.pos.z -= nz * push;
        b.pos.x += nx * push;
        b.pos.z += nz * push;
      }
    }
  }
}
