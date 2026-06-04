// TrickSystem: the "T" button. Randomly performs one of three street tricks:
//  - a behind-the-back pass to the teammate (who cuts open first)
//  - a through-the-legs pass to the teammate (who cuts open first)
//  - an explosive 1–2 step drive toward the rim (to set up a dunk)
import { GameState, Player } from "../types";
import { teammates } from "../GameState";
import { passToTeammate } from "./PassSystem";
import { pickSpacingSpot } from "./helpers";
import { BASKET_GROUND } from "../constants";
import { chance } from "../math";

// Send the teammate to an open spot so the trick pass has a target.
function freeUpTeammate(g: GameState, p: Player) {
  const mate = teammates(g, p)[0];
  if (!mate) return;
  const cutToRim = chance(0.4);
  if (cutToRim) {
    mate.aiTargetX = BASKET_GROUND.x + (Math.random() - 0.5) * 2;
    mate.aiTargetZ = BASKET_GROUND.z + 1.6;
  } else {
    const spot = pickSpacingSpot(g, mate, chance(0.6));
    mate.aiTargetX = spot.x;
    mate.aiTargetZ = spot.z;
  }
  mate.aiTimer = 1.6; // keep heading there (get open) for a bit
}

export function doTrick(g: GameState, p: Player) {
  if (!p.hasBall || p.airborne || p.charging || p.actionLock > 0) return;

  const r = Math.random();
  if (r < 0.66) {
    // trick pass — behind the back or through the legs
    freeUpTeammate(g, p);
    const ok = passToTeammate(g, p);
    if (ok) {
      p.anim = "crossover";
      p.animPhase = 0;
      g.events.push({ type: "pass", team: p.team, data: { trick: r < 0.33 ? "behind" : "legs" } });
    }
  } else {
    // explosive drive toward the basket (1–2 steps) — great into a dunk
    const dx = BASKET_GROUND.x - p.pos.x;
    const dz = BASKET_GROUND.z - p.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const burst = p.stats.speed * 1.7;
    p.vel.x = (dx / d) * burst;
    p.vel.z = (dz / d) * burst;
    p.heading = Math.atan2(dx, dz);
    p.crossoverT = 0.5; // sustains the burst (handled by DribbleSystem)
    p.anim = "crossover";
    p.animPhase = 0;
    g.events.push({ type: "dribble", team: p.team, data: { trick: "drive" } });
  }
}
