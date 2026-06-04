// Simulation: the single authoritative game-loop step. The render layer calls
// step(dt) every frame; HUD-relevant state is read straight off GameState.
import { GameState, InputFrame, Player } from "./types";
import { MatchConfig, PAINT_DIST, SHOT, TRAVEL_DIST } from "./constants";
import { createGameState } from "./GameState";
import { InputManager } from "./InputManager";
import { userPlayer, ballHandler, distToBasket } from "./systems/helpers";
import { BASKET_GROUND } from "./constants";
import { updatePlayers } from "./systems/PlayerController";
import { updateBall } from "./systems/BallController";
import { updateGameMode, travelingViolation } from "./systems/GameMode21";
import { updateTeamAI } from "./systems/SimpleTeamAI";
import { updateCPU } from "./systems/CPUOpponentAI";
import { beginCharge, updateCharge, releaseShot, launchShot } from "./systems/ShotSystem";
import { passToTeammate, switchActivePlayer, autoSelectNearestDefender } from "./systems/PassSystem";
import { attemptSteal, attemptBlock, checkShotBlocks } from "./systems/DefenseSystem";
import { triggerCrossover, updateDribble, dribbleSound } from "./systems/DribbleSystem";
import { doTrick } from "./systems/TrickSystem";
import { updateCrowd } from "./systems/Crowd";

export class Simulation {
  state: GameState;
  input = new InputManager();
  paused = false;
  private prevPossession: "USER" | "CPU" = "USER";

  constructor(config: MatchConfig) {
    this.state = createGameState(config);
  }

  reset(config: MatchConfig) {
    this.state = createGameState(config);
    this.input.reset();
    this.paused = false;
    this.prevPossession = this.state.possession;
  }

  // Restore a previously saved state (e.g. from storage).
  loadState(saved: GameState) {
    this.state = saved;
    this.input.reset();
    this.paused = false;
    this.prevPossession = saved.possession;
  }

  step(dtRaw: number) {
    if (this.paused) return;
    const g = this.state;
    const dt = Math.min(0.033, Math.max(0.001, dtRaw));

    g.events = [];
    g.time += dt;

    // decay transient fx
    g.shake = Math.max(0, g.shake - dt * 2.5);
    g.hoopFx.rimShake = Math.max(0, g.hoopFx.rimShake - dt * 2.2);
    g.hoopFx.netImpulse = Math.max(0, g.hoopFx.netImpulse - dt * 1.5);
    for (const m of g.messages) m.t -= dt;
    g.messages = g.messages.filter((m) => m.t > 0);

    if (g.phase === "GAMEOVER") {
      updatePlayers(g, dt);
      updateBall(g, dt);
      return;
    }

    const frame = this.input.consume();
    // on a fresh turnover to defense, snap control to the defender nearest the ball
    const turnedToDefense = g.possession === "CPU" && this.prevPossession !== "CPU";
    assignControl(g, turnedToDefense);

    if (g.phase === "LIVE") {
      const me = userPlayer(g);
      applyUserControl(g, me, frame, dt);
      // AI for the other USER player
      for (const p of g.players) {
        if (p.team === "USER" && !p.isUserControlled) updateTeamAI(g, p, dt);
      }
      updateCPU(g, dt);
      // crossover bursts / dribble sfx for whoever holds it
      const h = ballHandler(g);
      if (h) {
        updateDribble(g, h, dt);
        dribbleSound(g, h, dt);
      }
    } else {
      // non-live phases: ease everyone to a stop, no new decisions
      for (const p of g.players) {
        p.intentX = 0;
        p.intentZ = 0;
      }
    }

    updatePlayers(g, dt);
    checkShotBlocks(g);
    updateBall(g, dt);
    updateGameMode(g, dt);
    updateCrowd(g, dt);

    this.prevPossession = g.possession;
  }
}

function assignControl(g: GameState, forceDefenderPick = false) {
  const userBall = g.players.find((p) => p.team === "USER" && p.hasBall);
  if (userBall) {
    g.players.forEach((p) => {
      if (p.team === "USER") {
        p.isUserControlled = p === userBall;
        p.isActive = p === userBall;
      }
    });
  } else if (forceDefenderPick || !g.players.some((p) => p.team === "USER" && p.isUserControlled)) {
    autoSelectNearestDefender(g, forceDefenderPick);
  }
}

function applyUserControl(g: GameState, p: Player, f: InputFrame, dt: number) {
  // --- movement from joystick ---
  const mag = Math.hypot(f.moveX, f.moveZ);
  if (mag > 0.05) {
    const sprint = f.sprint ? p.stats.sprintMul : 1;
    const frac = Math.min(1, mag) * sprint;
    const s = p.stats.speed * frac;
    p.intentX = (f.moveX / mag) * s;
    p.intentZ = (f.moveZ / mag) * s;
  } else {
    p.intentX = 0;
    p.intentZ = 0;
  }

  const onOffense = p.hasBall;

  if (onOffense) {
    // D: charge & release shot (hold = real shot, tap = pump fake)
    if (f.shootDown) beginCharge(p);
    if (p.charging) {
      updateCharge(p, dt);
      // drive finish: reaching the rim while holding D goes up for a dunk/layup
      if (distToBasket(p.pos) < PAINT_DIST + 0.5) {
        launchShot(g, p, SHOT.fullChargeTime);
      } else {
        // traveling: a driving move toward the rim is legal; gathering then
        // walking around (sideways / backwards) is not — count those steps.
        const sp = Math.hypot(p.vel.x, p.vel.z);
        const bx = BASKET_GROUND.x - p.pos.x;
        const bz = BASKET_GROUND.z - p.pos.z;
        const bl = Math.hypot(bx, bz) || 1;
        const towardBasket = (p.vel.x * bx + p.vel.z * bz) / bl; // m/s toward rim
        if (towardBasket > 1.0) {
          p.carryDist = 0; // legal drive
        } else {
          p.carryDist += sp * dt;
          if (p.carryDist > TRAVEL_DIST) travelingViolation(g, p);
        }
      }
    }
    if (f.shootUp) releaseShot(g, p);

    // S: pass to teammate
    if (f.pass) passToTeammate(g, p);

    // A: attack the rim (layup / dunk) when close, else a clean vertical leap
    if (f.jump && !p.airborne) {
      if (distToBasket(p.pos) < PAINT_DIST + 0.9) {
        launchShot(g, p, SHOT.fullChargeTime); // good-timing attack at the rim
      } else {
        p.airborne = true;
        p.jumpVel = p.stats.jump * 4.0;
        p.anim = "jump";
        p.animPhase = 0;
      }
    }

    // special: through-the-legs crossover
    if (f.special) triggerCrossover(g, p);

    // T: random trick (behind-back pass / leg pass / drive to the rim)
    if (f.trick) doTrick(g, p);
  } else {
    // --- defense ---
    if (f.jump) attemptBlock(g, p); // A: jump / block
    if (f.shootDown) attemptSteal(g, p); // D: steal / poke
    if (f.pass) switchActivePlayer(g); // S: switch active defender
  }
}
