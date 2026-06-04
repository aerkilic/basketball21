// Crowd: home-fan reactions. Rhythmic chants ("Jubelgesänge") throughout the live
// action (no booing/whistling). Score cheers live in GameMode21.
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

  // crowd chants throughout the live action ("Jubelgesänge") — no booing/whistling
  g.crowdTimer = 2.2 + Math.random() * 0.8; // ~ chant length, so it repeats
  g.events.push({ type: "chant", data: { crowd: true } });
}
