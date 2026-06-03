// GameMode21: scoring (2s and 3s), score- or time-mode win, possession flow,
// fouls, phase machine.
import { GameState, TeamId, Player } from "../types";
import { HOOP, COURT } from "../constants";
import { pushMessage } from "../GameState";
import { v3, clamp } from "../math";

const other = (t: TeamId): TeamId => (t === "USER" ? "CPU" : "USER");

export function updateGameMode(g: GameState, dt: number) {
  processScoreEvents(g);
  advancePhase(g, dt);
}

function processScoreEvents(g: GameState) {
  for (const e of g.events) {
    if (e.type === "score" && e.team) {
      const pts = (e.data?.points as number) ?? 2;
      g.score[e.team] += pts;
      g.lastScorer = e.team;
      g.shake = Math.max(g.shake, e.data?.kind === "dunk" ? 0.9 : pts === 3 ? 0.55 : 0.35);
      // home crowd celebrates; if the away team scores, the home fans whistle/boo
      const homeTeam = g.homeIsUser ? "USER" : "CPU";
      if (e.team === homeTeam) g.events.push({ type: "cheer", team: e.team });
      else g.events.push({ type: "whistle", data: { crowd: true } });
      pushMessage(
        g,
        e.data?.kind === "dunk" ? "DUNK! +2" : pts === 3 ? "DREIER! +3" : "TREFFER +2",
        1.6
      );

      if (g.mode === "score" && g.score[e.team] >= g.scoreTarget) {
        endGame(g, e.team);
      } else {
        g.phase = "MADE";
        g.phaseTimer = 0;
      }
    }
  }
}

function endGame(g: GameState, winner: TeamId | null) {
  g.phase = "GAMEOVER";
  g.winner = winner;
  g.draw = winner === null;
  g.events.push({ type: "buzzer" });
  if (winner === null) pushMessage(g, "UNENTSCHIEDEN", 5);
  else pushMessage(g, winner === "USER" ? "DU GEWINNST! 🏆" : "CPU GEWINNT", 5);
}

function advancePhase(g: GameState, dt: number) {
  // time-mode clock only ticks while the ball is live
  if (g.mode === "time" && g.phase === "LIVE") {
    g.clock = Math.max(0, g.clock - dt);
    if (g.clock <= 0) {
      const w = g.score.USER === g.score.CPU ? null : g.score.USER > g.score.CPU ? "USER" : "CPU";
      endGame(g, w);
      return;
    }
  }

  g.phaseTimer += dt;
  switch (g.phase) {
    case "TIPOFF":
      if (g.phaseTimer === dt) pushMessage(g, "STREET BALL — BIS 21!", 1.4);
      if (g.phaseTimer > 1.0) {
        g.phase = "LIVE";
      }
      break;
    case "MADE": {
      // make-it/other-team's ball: loser of the bucket gets possession at the top.
      if (g.phaseTimer > 1.5) {
        const next = g.lastScorer ? other(g.lastScorer) : g.possession;
        resetToTop(g, next);
      }
      break;
    }
    case "DEAD":
      if (g.phaseTimer > 1.3) {
        resetToTop(g, g.possession);
      }
      break;
    default:
      break;
  }
}

// Check-ball restart: offense at the top, defense set, ball in offense's hands.
export function resetToTop(g: GameState, offense: TeamId) {
  g.phase = "LIVE";
  g.phaseTimer = 0;
  g.possession = offense;

  const off = g.players.filter((p) => p.team === offense);
  const def = g.players.filter((p) => p.team !== offense);

  // offense: handler top of key, partner on the wing
  const handler = off[0];
  const wing = off[1];
  place(handler, 0, 0.8);
  place(wing, 4.2, -2.4);

  // defense between men & basket
  place(def[0], 0, -1.4);
  place(def[1], 3.4, -3.6);

  g.players.forEach((p) => {
    p.hasBall = false;
    p.vel.x = p.vel.z = 0;
    p.intentX = p.intentZ = 0;
    p.charging = false;
    p.actionLock = 0;
    p.airborne = false;
    p.jumpY = 0;
    p.anim = "idle";
    p.heading = Math.atan2(HOOP.rim.x - p.pos.x, HOOP.rim.z - p.pos.z);
  });

  handler.hasBall = true;
  handler.carryDist = 0;
  g.lastTouch = handler.team;
  const ball = g.ball;
  ball.mode = "held";
  ball.ownerId = handler.id;
  ball.shot = null;
  ball.passTargetId = null;
  ball.scoredHandled = false;
  ball.crossedRim = false;
  ball.vel = v3();

  // control assignment: offense -> handler; defense -> nearest defender
  if (offense === "USER") {
    g.players.forEach((p) => {
      p.isUserControlled = p === handler;
      p.isActive = p === handler;
    });
  } else {
    // CPU offense: user controls a defender (nearest to handler)
    const userDefs = g.players.filter((p) => p.team === "USER");
    let near = userDefs[0];
    near = userDefs.reduce((a, b) =>
      Math.hypot(b.pos.x - handler.pos.x, b.pos.z - handler.pos.z) <
      Math.hypot(a.pos.x - handler.pos.x, a.pos.z - handler.pos.z)
        ? b
        : a
    );
    g.players.forEach((p) => {
      if (p.team === "USER") {
        p.isUserControlled = p === near;
        p.isActive = p === near;
      }
    });
  }
}

function place(p: Player, x: number, z: number) {
  p.pos.x = x;
  p.pos.z = z;
  p.pos.y = 0;
}

// Traveling: gathered the ball and took too many steps -> turnover at the top.
export function travelingViolation(g: GameState, p: Player) {
  p.charging = false;
  p.hasBall = false;
  p.carryDist = 0;
  p.anim = "idle";
  g.possession = other(p.team);
  g.phase = "DEAD";
  g.phaseTimer = 0;
  g.events.push({ type: "whistle" });
  pushMessage(g, "SCHRITTFEHLER!", 1.6);
}

// Out of bounds: the team that didn't touch it last inbounds from behind the line
// nearest the spot the ball left the court.
export function inboundBall(g: GameState, x: number, z: number) {
  const team = other(g.lastTouch);
  g.possession = team;
  g.phase = "LIVE";
  g.phaseTimer = 0;

  const m = 0.5;
  const ix = clamp(x, -COURT.halfWidth + m, COURT.halfWidth - m);
  const iz = clamp(z, COURT.zBack + m, COURT.zFront - m);

  const us = g.players.filter((p) => p.team === team);
  const opp = g.players.filter((p) => p.team !== team);

  // inbounder = teammate nearest the exit point; the other spaces toward the court
  const inb = us.reduce((a, b) =>
    Math.hypot(b.pos.x - ix, b.pos.z - iz) < Math.hypot(a.pos.x - ix, a.pos.z - iz) ? b : a
  );
  const mate = us.find((p) => p !== inb)!;

  place(inb, ix, iz);
  place(mate, clamp(ix * 0.4, -4, 4), iz + (iz > 0 ? -3 : 2.5));
  // defenders give a step of space
  place(opp[0], clamp(ix * 0.5, -4, 4), (iz + HOOP.rim.z) / 2);
  place(opp[1], clamp(-ix * 0.4, -4, 4), iz * 0.4 - 1.5);

  g.players.forEach((p) => {
    p.vel.x = p.vel.z = 0;
    p.intentX = p.intentZ = 0;
    p.charging = false;
    p.actionLock = 0;
    p.airborne = false;
    p.jumpY = 0;
    p.hasBall = false;
    p.carryDist = 0;
    p.anim = "idle";
    p.heading = Math.atan2(HOOP.rim.x - p.pos.x, HOOP.rim.z - p.pos.z);
  });

  inb.hasBall = true;
  g.lastTouch = team;
  const ball = g.ball;
  ball.mode = "held";
  ball.ownerId = inb.id;
  ball.shot = null;
  ball.passTargetId = null;
  ball.scoredHandled = false;
  ball.crossedRim = false;
  ball.vel = v3();

  if (team === "USER") {
    g.players.forEach((p) => {
      if (p.team === "USER") {
        p.isUserControlled = p === inb;
        p.isActive = p === inb;
      }
    });
  } else {
    const userDefs = g.players.filter((p) => p.team === "USER");
    const near = userDefs.reduce((a, b) =>
      Math.hypot(b.pos.x - inb.pos.x, b.pos.z - inb.pos.z) <
      Math.hypot(a.pos.x - inb.pos.x, a.pos.z - inb.pos.z)
        ? b
        : a
    );
    userDefs.forEach((p) => {
      p.isUserControlled = p === near;
      p.isActive = p === near;
    });
  }

  g.events.push({ type: "whistle" });
  pushMessage(g, `AUS — ${team === "USER" ? "DEIN" : "CPU"} BALL`, 1.5);
}
