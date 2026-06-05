// DefenseSystem: steal attempts (D on defense) and block/jump attempts (A on defense).
import { GameState, Player } from "../types";
import { ballHandler } from "./helpers";
import { callFoul } from "./FoulSystem";
import { distXZ, chance, clamp } from "../math";
import { DIFFICULTY } from "../constants";

// D on defense: try to poke the ball away from the handler.
export function attemptSteal(g: GameState, defender: Player) {
  if (defender.stealCooldown > 0 || defender.actionLock > 0 || defender.hasBall) return;
  defender.anim = "steal";
  defender.animPhase = 0;
  defender.stealCooldown = 0.55; // responsive: allow frequent poke attempts
  defender.actionLock = 0.18;
  g.events.push({ type: "shoot", team: defender.team, data: { steal: true } });

  const handler = ballHandler(g);
  if (!handler || handler.team === defender.team) return;
  const d = distXZ(defender.pos, handler.pos);
  const inRange = d < defender.stats.reach + 0.6;

  if (!inRange) return; // swiped at air

  // facing check — must be roughly in front of the defender
  const toH = Math.atan2(handler.pos.x - defender.pos.x, handler.pos.z - defender.pos.z);
  let da = Math.abs(((toH - defender.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  const facing = clamp(1 - da / Math.PI, 0, 1);

  const skill = defender.team === "CPU" ? DIFFICULTY[g.difficulty].defSkill : 1;
  let stealChance = (defender.stats.steal * 0.45 + 0.1) * facing * skill;
  stealChance *= clamp(1 - handler.stats.dribble * 0.7, 0.25, 1);
  // moving handlers and fresh crossovers are harder to strip
  if (Math.hypot(handler.vel.x, handler.vel.z) > 1.5) stealChance *= 0.7;
  if (handler.crossoverT > 0) stealChance *= 0.35;

  if (chance(stealChance)) {
    // clean steal
    g.players.forEach((p) => (p.hasBall = false));
    defender.hasBall = true;
    g.ball.mode = "held";
    g.ball.ownerId = defender.id;
    g.ball.shot = null;
    g.possession = defender.team;
    g.lastTouch = defender.team;
    g.events.push({ type: "steal", team: defender.team });
  } else if (g.foulsEnabled && facing < 0.55 && chance(0.4)) {
    // bad angle reach-in => foul
    callFoul(g, defender, handler.team);
  }
}

// A on defense: jump to block. Returns nothing; effect resolves on ball flight too.
export function attemptBlock(g: GameState, defender: Player) {
  if (defender.blockCooldown > 0 || defender.actionLock > 0 || defender.airborne) return;
  defender.airborne = true;
  defender.jumpVel = defender.stats.jump * 4.1;
  defender.anim = "jump";
  defender.animPhase = 0;
  defender.blockCooldown = 0.5; // responsive contests
  g.events.push({ type: "shoot", team: defender.team, data: { block: true } });

  const handler = ballHandler(g);
  if (!handler || handler.team === defender.team) return;
  const d = distXZ(defender.pos, handler.pos);
  if (d >= defender.stats.reach + 0.6) return; // jumped near nobody

  const skill = defender.team === "CPU" ? DIFFICULTY[g.difficulty].defSkill : 1;
  const looseBall = () => {
    handler.hasBall = false;
    handler.charging = false;
    const ball = g.ball;
    ball.mode = "loose";
    ball.ownerId = null;
    ball.shot = null;
    ball.vel.x = (Math.random() - 0.5) * 4;
    ball.vel.y = 2;
    ball.vel.z = (Math.random() - 0.5) * 4;
    g.lastTouch = defender.team;
  };

  if (handler.charging) {
    // contesting a shot -> a real block
    const blockChance = defender.stats.block * 0.7 * skill * clamp(1 - d / 2, 0.2, 1);
    if (chance(blockChance)) {
      looseBall();
      g.events.push({ type: "block", team: defender.team });
      g.shake = Math.max(g.shake, 0.5);
    } else if (g.foulsEnabled && chance(0.25)) {
      callFoul(g, defender, handler.team);
    }
  } else {
    // jumping into a dribbler -> a chance to deflect the ball loose
    const knock = defender.stats.block * 0.32 * skill * clamp(1 - d / 2, 0.15, 1);
    if (chance(knock)) {
      looseBall();
      g.events.push({ type: "block", team: defender.team });
    }
  }
}

// Continuous: a defender in flight near a rising shot can still tip it.
export function checkShotBlocks(g: GameState) {
  const ball = g.ball;
  if (ball.mode !== "flight" || !ball.shot || ball.vel.y <= 0) return;
  for (const d of g.players) {
    if (d.team === ball.shot.team || !d.airborne) continue;
    const handY = 1.6 * d.stats.height + d.jumpY + 0.6;
    if (Math.abs(ball.pos.y - handY) < 0.5 && distXZ(d.pos, ball.pos) < d.stats.reach * 0.7) {
      if (chance(d.stats.block * 0.5)) {
        ball.shot.willMake = false;
        ball.vel.y *= -0.3;
        ball.vel.x += (Math.random() - 0.5) * 3;
        ball.mode = "loose";
        ball.shot = null;
        g.lastTouch = d.team;
        g.events.push({ type: "block", team: d.team });
        g.shake = Math.max(g.shake, 0.4);
        return;
      }
    }
  }
}
