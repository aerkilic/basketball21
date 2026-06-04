// Crowd: home-fan reactions. Whistles/boos while the away team has the ball,
// occasional cheers while the home team attacks. Score cheers live in GameMode21.
import { GameState } from "../types";

export function updateCrowd(g: GameState, dt: number) {
  const homeTeam = g.homeIsUser ? "USER" : "CPU";
  const awayHasBall = g.possession !== homeTeam;

  // Agitation rises while the opponent holds the ball (crowd gets to its feet and
  // jeers) and relaxes otherwise. The render layer reads this to stand the fans up.
  // Updated every frame, independent of the whistle cadence below.
  if (!Number.isFinite(g.crowdAgitation)) g.crowdAgitation = 0; // heal pre-update saves
  const target = g.phase === "LIVE" && awayHasBall ? 1 : 0;
  const rate = target > g.crowdAgitation ? 1.6 : 0.8; // rise faster than it settles
  g.crowdAgitation += (target - g.crowdAgitation) * Math.min(1, rate * dt);

  if (g.phase !== "LIVE") return;

  g.crowdTimer -= dt;
  if (g.crowdTimer > 0) return;

  if (awayHasBall) {
    // hostile whistles against the opponent
    g.crowdTimer = 0.9 + Math.random() * 0.9;
    if (Math.random() < 0.85) g.events.push({ type: "whistle", data: { crowd: true } });
  } else {
    // supportive murmur/cheer for the home side
    g.crowdTimer = 2.6 + Math.random() * 2.0;
    if (Math.random() < 0.5) g.events.push({ type: "cheer", data: { crowd: true, soft: true } });
  }
}
