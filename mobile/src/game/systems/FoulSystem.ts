// FoulSystem: registers fouls from mistimed steals/blocks and awards the ball.
import { GameState, Player, TeamId } from "../types";
import { pushMessage } from "../GameState";

export function callFoul(g: GameState, offender: Player, victimTeam: TeamId) {
  if (!g.foulsEnabled) return;
  g.fouls[offender.team] += 1;
  offender.anim = "idle";
  offender.actionLock = 0.5;

  // ball goes to the fouled team, action resets to the top.
  g.possession = victimTeam;
  g.phase = "DEAD";
  g.phaseTimer = 0;
  g.events.push({ type: "foul", team: offender.team });
  g.events.push({ type: "whistle" });
  pushMessage(g, "msg.foul", 1.8, { by: offender.team, to: victimTeam });
}
