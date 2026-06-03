// DribbleSystem: special "through the legs" crossover that helps beat a defender,
// plus the periodic dribble sound while a handler moves.
import { GameState, Player } from "../types";

export function triggerCrossover(g: GameState, p: Player) {
  // Works while running — only blocked mid-air, mid-shot, or during an active cross.
  if (!p.hasBall || p.airborne || p.charging) return;
  if (p.crossoverT > 0) return;
  p.crossoverT = 0.42;
  p.anim = "crossover";
  p.animPhase = 0;
  // immediate evasive burst in the current movement (or facing) direction
  let dx = p.intentX;
  let dz = p.intentZ;
  if (Math.hypot(dx, dz) < 0.3) {
    dx = Math.sin(p.heading);
    dz = Math.cos(p.heading);
  }
  const d = Math.hypot(dx, dz) || 1;
  const burst = p.stats.speed * 1.3;
  p.vel.x = (dx / d) * burst;
  p.vel.z = (dz / d) * burst;
  g.events.push({ type: "dribble", team: p.team, data: { crossover: true } });
}

// Advances crossover timer and grants a short evasive burst (helps beat a defender).
export function updateDribble(g: GameState, p: Player, dt: number) {
  if (p.crossoverT > 0) {
    p.crossoverT = Math.max(0, p.crossoverT - dt);
    const boost = 1.5;
    p.intentX *= boost;
    p.intentZ *= boost;
  }
}

// Emits dribble bounce sound roughly twice a second while actively dribbling.
let dribbleAcc = 0;
export function dribbleSound(g: GameState, p: Player, dt: number) {
  const moving = Math.hypot(p.vel.x, p.vel.z) > 0.4;
  if (!p.hasBall || p.airborne || p.charging) {
    dribbleAcc = 0;
    return;
  }
  dribbleAcc += dt;
  const interval = moving ? 0.42 : 0.6;
  if (dribbleAcc >= interval) {
    dribbleAcc = 0;
    g.events.push({ type: "dribble", team: p.team });
  }
}
