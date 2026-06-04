// GameMode21: scoring (2s and 3s), score- or time-mode win, possession flow,
// fouls, phase machine.
import { GameState, TeamId, Player } from "../types";
import { HOOP, COURT, PAINT_ZONE, THREE_SEC_LIMIT, SHOT_CLOCK } from "../constants";
import { pushMessage } from "../GameState";
import { v3, clamp } from "../math";

const other = (t: TeamId): TeamId => (t === "USER" ? "CPU" : "USER");

export function updateGameMode(g: GameState, dt: number) {
  processScoreEvents(g);
  updateThreeSeconds(g, dt);
  updateShotClock(g, dt);
  advancePhase(g, dt);
}

// 24-second shot clock: the offense must get a shot off within SHOT_CLOCK seconds
// of gaining possession or it's a turnover. The clock only ticks while the ball is
// being handled (held/dribble); a shot attempt resets it, and possession changes
// reset it elsewhere (resetToTop / inboundBall / Simulation).
function updateShotClock(g: GameState, dt: number) {
  // taking a shot counts as "coming to a finish" — refill so it can't expire mid-air
  if (g.events.some((e) => e.type === "shoot" && !e.data?.fake)) {
    g.shotClock = SHOT_CLOCK;
    return;
  }
  if (g.phase !== "LIVE" || (g.ball.mode !== "held" && g.ball.mode !== "dribble")) return;
  if (!Number.isFinite(g.shotClock)) g.shotClock = SHOT_CLOCK; // heal pre-update saves
  g.shotClock = Math.max(0, g.shotClock - dt);
  if (g.shotClock <= 0) shotClockViolation(g);
}

const inPaint = (p: Player): boolean =>
  p.pos.x >= PAINT_ZONE.minX &&
  p.pos.x <= PAINT_ZONE.maxX &&
  p.pos.z >= PAINT_ZONE.minZ &&
  p.pos.z <= PAINT_ZONE.maxZ;

// 3-seconds-in-the-paint: ONLY the player currently holding the ball may not stay
// in the red zone (key) for more than THREE_SEC_LIMIT seconds. The count runs only
// while he is inside the zone and resets to 0 the moment he steps back out. Only
// counts while the ball is actually being handled (held/dribble).
function updateThreeSeconds(g: GameState, dt: number) {
  const live = g.phase === "LIVE" && (g.ball.mode === "held" || g.ball.mode === "dribble");
  for (const p of g.players) {
    if (live && p.hasBall && inPaint(p)) {
      const prev = p.paintTime;
      p.paintTime += dt;
      // warn once when crossing the 2s mark so the turnover isn't a surprise
      if (prev < 2.0 && p.paintTime >= 2.0 && p.team === "USER") {
        pushMessage(g, "msg.outOfZone", 1.0);
      }
      if (p.paintTime >= THREE_SEC_LIMIT) {
        paintViolation(g, p);
        return;
      }
    } else {
      p.paintTime = 0; // not the ball handler, or out of the zone -> reset
    }
  }
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
        e.data?.kind === "dunk" ? "msg.dunk" : pts === 3 ? "msg.three" : "msg.basket",
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
  if (winner === null) pushMessage(g, "msg.draw", 5);
  else pushMessage(g, winner === "USER" ? "msg.youWin" : "msg.cpuWins", 5);
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
      if (g.phaseTimer === dt) pushMessage(g, "msg.tipoff", 1.4);
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
  g.shotClock = SHOT_CLOCK;

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
    p.paintTime = 0;
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
  pushMessage(g, "msg.traveling", 1.6);
}

// 24-second violation: offense never got a shot off -> turnover at the top.
export function shotClockViolation(g: GameState) {
  const offense = g.possession;
  g.players.forEach((p) => {
    if (p.team === offense) {
      p.charging = false;
      p.hasBall = false;
      p.anim = "idle";
    }
    p.paintTime = 0;
  });
  g.possession = other(offense);
  g.phase = "DEAD";
  g.phaseTimer = 0;
  g.shotClock = SHOT_CLOCK;
  g.events.push({ type: "whistle" });
  pushMessage(g, "msg.shotClock", 1.6);
}

// 3-seconds-in-the-paint: offensive player camped in the key -> turnover at the top.
export function paintViolation(g: GameState, p: Player) {
  p.charging = false;
  p.hasBall = false;
  p.anim = "idle";
  g.players.forEach((q) => (q.paintTime = 0));
  g.possession = other(p.team);
  g.phase = "DEAD";
  g.phaseTimer = 0;
  g.events.push({ type: "whistle" });
  pushMessage(g, "msg.threeSec", 1.6);
}

// Out of bounds: the team that didn't touch it last inbounds from behind the line
// nearest the spot the ball left the court.
export function inboundBall(g: GameState, x: number, z: number) {
  const team = other(g.lastTouch);
  g.possession = team;
  g.phase = "LIVE";
  g.phaseTimer = 0;
  g.shotClock = SHOT_CLOCK;

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
    p.paintTime = 0;
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
  pushMessage(g, "msg.outOfBounds", 1.5, { who: team });
}
