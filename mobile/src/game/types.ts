import { Vec3 } from "./math";
import { PlayerKind, PlayerStats, Difficulty, BackdropKind } from "./constants";

export type TeamId = "USER" | "CPU";

// Visible animation the render layer plays. The sim drives `animPhase` (0..1).
export type AnimState =
  | "idle"
  | "run"
  | "dribble"
  | "crossover" // through-the-legs special dribble
  | "windup" // shot wind-up
  | "jumpshot"
  | "layup"
  | "dunk"
  | "jump" // defensive jump / block
  | "steal"
  | "fall"; // knocked down on a foul

export interface Player {
  id: string;
  team: TeamId;
  stats: PlayerStats;
  label: string;
  jersey: string; // jersey color

  pos: Vec3;
  vel: Vec3; // actual horizontal velocity (smoothed)
  intentX: number; // desired velocity X set by controller/AI each frame
  intentZ: number; // desired velocity Z
  heading: number; // facing angle (radians, atan2(x,z))

  // vertical jump
  jumpY: number; // current height off ground
  jumpVel: number;
  airborne: boolean;

  hasBall: boolean;
  isUserControlled: boolean; // the human-driven player (only one at a time on USER team)
  isActive: boolean; // the "selected" player on its team (gets AI focus markers off)

  anim: AnimState;
  animPhase: number; // 0..1 progress through the current anim
  animSpeed: number; // multiplier

  // action timers / locks (seconds remaining)
  shootHold: number; // how long D held while charging
  charging: boolean;
  carryDist: number; // distance travelled while gathered (traveling rule)
  paintTime: number; // seconds spent in the paint while on offense (3-second rule)
  actionLock: number; // can't start new actions while > 0
  stealCooldown: number;
  blockCooldown: number;
  crossoverT: number; // remaining crossover anim time
  dunkT: number; // remaining dunk sequence time (fly to rim + slam)

  // AI scratch
  aiTimer: number;
  aiTargetX: number;
  aiTargetZ: number;
}

export type BallMode =
  | "held" // attached to a player's hands
  | "dribble" // bouncing next to handler
  | "flight" // a shot in the air toward the rim
  | "loose" // free / rebound, physics-driven
  | "pass"; // traveling between teammates

export interface ShotInfo {
  shooter: string;
  team: TeamId;
  points: 2 | 3;
  kind: "jump" | "three" | "layup" | "dunk";
  willMake: boolean;
  quality: number; // 0..1 release quality (for feedback)
}

export interface Ball {
  pos: Vec3;
  vel: Vec3;
  mode: BallMode;
  ownerId: string | null;
  dribblePhase: number; // 0..1 bounce cycle
  passTargetId: string | null;
  shot: ShotInfo | null;
  spin: number;
  // flight timing for arc lerp
  flightT: number;
  flightDur: number;
  flightFrom: Vec3;
  flightTo: Vec3;
  flightApexY: number;
  scoredHandled: boolean;
  crossedRim: boolean; // tracks rim-plane crossing during a shot
}

// Net + rim animation state, consumed by the render layer.
export interface HoopFx {
  rimShake: number; // 0..1 decaying
  netImpulse: number; // 0..1 set on events, render plays it out
  netSwingDir: number; // -1..1 sideways swing for dunks
}

export type Phase = "TIPOFF" | "LIVE" | "MADE" | "DEAD" | "GAMEOVER";

export interface GameEvent {
  type:
    | "score"
    | "miss"
    | "rimhit"
    | "swish"
    | "dunk"
    | "block"
    | "steal"
    | "foul"
    | "pass"
    | "dribble"
    | "shoot"
    | "switch"
    | "cheer"
    | "chant"
    | "whistle"
    | "buzzer";
  team?: TeamId;
  data?: any;
}

export interface Score {
  USER: number;
  CPU: number;
}

export interface GameState {
  phase: Phase;
  score: Score;
  fouls: { USER: number; CPU: number };
  foulsEnabled: boolean;
  backdrop: BackdropKind;
  difficulty: Difficulty;
  // match mode / clock
  mode: "score" | "time";
  scoreTarget: number;
  timeLimit: number; // seconds (time mode)
  forceWinner: boolean; // if a timed match is level, break the tie at the buzzer
  clock: number; // remaining seconds (time mode), counts down during LIVE
  shotClock: number; // remaining seconds on the 24s shot clock (per possession)
  // team identity / home crowd
  userName: string;
  cpuName: string;
  homeIsUser: boolean; // home crowd supports USER when true
  crowdTimer: number; // internal cadence for crowd reactions
  crowdAgitation: number; // 0..1 how riled the home crowd is (rises vs. opponent ball)
  possession: TeamId;
  players: Player[];
  ball: Ball;
  hoopFx: HoopFx;
  time: number; // total elapsed
  phaseTimer: number; // counts within MADE/DEAD/etc.
  shake: number; // camera/screen shake 0..1
  messages: { key: string; params?: Record<string, string | number>; t: number }[];
  lastScorer: TeamId | null;
  lastTouch: TeamId; // team that last had the ball (for out-of-bounds calls)
  winner: TeamId | null;
  draw: boolean; // time mode ended level
  events: GameEvent[]; // drained each frame by audio/fx
  // set when this match is part of a tournament, so an in-progress save can be resumed
  tournamentId?: string;
  fixtureId?: string;
}

export interface InputFrame {
  moveX: number; // -1..1 joystick
  moveZ: number; // -1..1 joystick (up on stick = toward hoop = -Z)
  sprint: boolean; // W
  // edge + hold for D
  shootDown: boolean;
  shootHeld: boolean;
  shootUp: boolean; // released this frame
  pass: boolean; // S (edge)
  jump: boolean; // A (edge)
  jumpHeld: boolean;
  special: boolean; // special dribble (edge)
  trick: boolean; // T (edge) — random trick move
}

export type { PlayerKind };
