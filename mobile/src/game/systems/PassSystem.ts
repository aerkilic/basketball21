// PassSystem: passing to the teammate and (on defense) switching the active player.
import { GameState, Player } from "../types";
import { teammates, pushMessage } from "../GameState";
import { v3, distXZ } from "../math";

export function passToTeammate(g: GameState, passer: Player): boolean {
  if (!passer.hasBall || passer.actionLock > 0) return false;
  const mates = teammates(g, passer);
  if (mates.length === 0) return false;
  // prefer the more open / more advanced teammate
  const target = mates[0];

  passer.hasBall = false;
  passer.anim = "idle";
  passer.actionLock = 0.18;

  const ball = g.ball;
  ball.mode = "pass";
  ball.ownerId = null;
  ball.passTargetId = target.id;
  ball.shot = null;
  ball.pos = v3(
    passer.pos.x + Math.sin(passer.heading) * 0.2,
    1.3 * passer.stats.height,
    passer.pos.z + Math.cos(passer.heading) * 0.2
  );
  g.events.push({ type: "pass", team: passer.team });
  return true;
}

// Switch the human-controlled defender to the other USER player (defense only).
export function switchActivePlayer(g: GameState): boolean {
  const userPlayers = g.players.filter((p) => p.team === "USER");
  const current = userPlayers.find((p) => p.isUserControlled);
  const other = userPlayers.find((p) => !p.isUserControlled);
  if (!current || !other) return false;
  current.isUserControlled = false;
  current.isActive = false;
  other.isUserControlled = true;
  other.isActive = true;
  g.events.push({ type: "switch", team: "USER" });
  pushMessage(g, "msg.switch", 0.8);
  return true;
}

// Pick the USER player nearest the ball as the controlled one. With `force`, it
// re-picks even if someone is already selected (used on a turnover to defense).
export function autoSelectNearestDefender(g: GameState, force = false) {
  const userPlayers = g.players.filter((p) => p.team === "USER");
  if (!force && userPlayers.some((p) => p.isUserControlled)) return;
  let best = userPlayers[0];
  let bd = Infinity;
  for (const p of userPlayers) {
    const d = distXZ(p.pos, g.ball.pos);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  userPlayers.forEach((p) => {
    p.isUserControlled = p === best;
    p.isActive = p === best;
  });
}
