// Crowd: home-fan reactions. Whistles/boos while the away team has the ball,
// occasional cheers while the home team attacks. Score cheers live in GameMode21.
import { GameState } from "../types";

export function updateCrowd(g: GameState, dt: number) {
  if (g.phase !== "LIVE") return;
  const homeTeam = g.homeIsUser ? "USER" : "CPU";
  const awayHasBall = g.possession !== homeTeam;

  g.crowdTimer -= dt;
  if (g.crowdTimer > 0) return;

  if (awayHasBall) {
    // hostile whistles against the opponent
    g.crowdTimer = 1.1 + Math.random() * 1.0;
    if (Math.random() < 0.8) g.events.push({ type: "whistle", data: { crowd: true } });
  } else {
    // supportive murmur/cheer for the home side
    g.crowdTimer = 2.6 + Math.random() * 2.0;
    if (Math.random() < 0.5) g.events.push({ type: "cheer", data: { crowd: true, soft: true } });
  }
}
