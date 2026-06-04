import { GameState, Player, Ball, TeamId } from "./types";
import { ARCHETYPES, MatchConfig, PlayerKind, SHOT_CLOCK } from "./constants";
import { v3 } from "./math";

let uid = 0;
const nid = () => `p${uid++}`;

const KIND_LABEL: Record<PlayerKind, string> = { BIG: "BIG", NORMAL: "NRM", SMALL: "G" };

function makePlayer(
  team: TeamId,
  kind: PlayerKind,
  label: string,
  jersey: string,
  x: number,
  z: number,
  active: boolean,
  userControlled: boolean
): Player {
  return {
    id: nid(),
    team,
    stats: ARCHETYPES[kind],
    label,
    jersey,
    pos: v3(x, 0, z),
    vel: v3(),
    intentX: 0,
    intentZ: 0,
    heading: team === "USER" ? Math.PI : 0, // face toward hoop-ish
    jumpY: 0,
    jumpVel: 0,
    airborne: false,
    hasBall: false,
    isUserControlled: userControlled,
    isActive: active,
    anim: "idle",
    animPhase: 0,
    animSpeed: 1,
    shootHold: 0,
    charging: false,
    carryDist: 0,
    paintTime: 0,
    actionLock: 0,
    stealCooldown: 0,
    blockCooldown: 0,
    crossoverT: 0,
    dunkT: 0,
    aiTimer: 0,
    aiTargetX: x,
    aiTargetZ: z,
  };
}

export function createGameState(config: MatchConfig): GameState {
  uid = 0;
  const u = config.userTeam;
  const c = config.cpuTeam;
  const players: Player[] = [
    // USER team (second listed player is the one you start controlling)
    makePlayer("USER", u.players[0], KIND_LABEL[u.players[0]], u.jersey, -3.0, -1.0, false, false),
    makePlayer("USER", u.players[1], KIND_LABEL[u.players[1]], u.jersey, 0.0, 0.6, true, true),
    // CPU team
    makePlayer("CPU", c.players[0], "CPU 1", c.jersey, -1.4, -3.0, true, false),
    makePlayer("CPU", c.players[1], "CPU 2", c.jersey, 1.8, -3.8, false, false),
  ];

  const ball: Ball = {
    pos: v3(0.0, 1.0, 0.6),
    vel: v3(),
    mode: "held",
    ownerId: players[1].id,
    dribblePhase: 0,
    passTargetId: null,
    shot: null,
    spin: 0,
    flightT: 0,
    flightDur: 0,
    flightFrom: v3(),
    flightTo: v3(),
    flightApexY: 0,
    scoredHandled: false,
    crossedRim: false,
  };
  players[1].hasBall = true;

  return {
    phase: "TIPOFF",
    score: { USER: 0, CPU: 0 },
    fouls: { USER: 0, CPU: 0 },
    foulsEnabled: config.fouls,
    backdrop: config.backdrop ?? "classic",
    difficulty: config.difficulty,
    mode: config.mode,
    scoreTarget: config.scoreTarget,
    timeLimit: config.timeLimit,
    forceWinner: config.forceWinner ?? false,
    clock: config.timeLimit,
    shotClock: SHOT_CLOCK,
    userName: config.userName ?? "DU",
    cpuName: config.cpuName ?? "CPU",
    homeIsUser: config.homeIsUser ?? true,
    crowdTimer: 0,
    crowdAgitation: 0,
    possession: "USER",
    players,
    ball,
    hoopFx: { rimShake: 0, netImpulse: 0, netSwingDir: 0 },
    time: 0,
    phaseTimer: 0,
    shake: 0,
    messages: [],
    lastScorer: null,
    lastTouch: "USER",
    winner: null,
    draw: false,
    events: [],
  };
}

export const teamOf = (g: GameState, id: string | null): TeamId | null =>
  g.players.find((p) => p.id === id)?.team ?? null;

export const playerById = (g: GameState, id: string | null): Player | undefined =>
  g.players.find((p) => p.id === id);

export const teammates = (g: GameState, p: Player): Player[] =>
  g.players.filter((q) => q.team === p.team && q.id !== p.id);

export const opponents = (g: GameState, team: TeamId): Player[] =>
  g.players.filter((q) => q.team !== team);

// Messages are stored as translation keys (+ optional params); the HUD localizes
// them at render time.
export function pushMessage(
  g: GameState,
  key: string,
  t = 1.6,
  params?: Record<string, string | number>
) {
  g.messages.unshift({ key, params, t });
  if (g.messages.length > 3) g.messages.pop();
}
