// All gameplay tuning lives here. Units are meters / seconds. Y is up.

import { Vec3, v3 } from "./math";

// ---- Court geometry (single street hoop, half-court "21") ----
// Play happens only in the half nearest the hoop: z in [zBack, zFront]. Anything
// past zFront (toward the camera) is out of bounds.
export const COURT = {
  halfWidth: 7.0, // X extent, +/-
  zFront: 1.2, // in-bounds front line (mid court) — beyond this is OUT
  zBack: -7.6, // behind the hoop
};

// The one hoop. Rim center in world space.
export const HOOP = {
  rim: v3(0, 3.05, -6.6),
  rimRadius: 0.23,
  backboardZ: -6.95,
  backboardY: 3.4,
  poleZ: -7.3,
};

// Ground point directly under the rim — used for shot-distance math.
export const BASKET_GROUND: Vec3 = v3(HOOP.rim.x, 0, HOOP.rim.z);

export const BALL_RADIUS = 0.15; // slightly larger than life so it reads clearly
export const THREE_POINT_DIST = 6.0; // street arc radius from basket
export const PAINT_DIST = 1.9; // close range / dunk range

// The painted key / lane (matches the rectangle drawn in Court.tsx). Used for the
// offensive 3-seconds-in-the-paint rule.
export const PAINT_ZONE = {
  minX: -1.8,
  maxX: 1.8,
  minZ: HOOP.rim.z - 0.35, // baseline under the hoop
  maxZ: HOOP.rim.z + 4.0, // free-throw line
};
export const THREE_SEC_LIMIT = 3.0; // seconds an offensive player may stay in the paint
export const SHOT_CLOCK = 24; // seconds to get a shot off before a turnover

export const TARGET_SCORE = 21;

// ---- Player archetypes ----
export type PlayerKind = "BIG" | "NORMAL" | "SMALL";

export interface PlayerStats {
  kind: PlayerKind;
  speed: number; // base run speed (m/s)
  sprintMul: number;
  accel: number;
  height: number; // body scale
  shoot2: number; // close/mid make skill 0..1
  shoot3: number; // three-point make skill 0..1
  dunk: number; // dunk power/skill
  block: number; // block reach/skill
  steal: number; // steal skill
  rebound: number; // rebound skill
  dribble: number; // ball security / crossover skill
  jump: number; // jump height (m)
  reach: number; // contest/steal radius
  color: string; // jersey accent
}

export const ARCHETYPES: Record<PlayerKind, PlayerStats> = {
  BIG: {
    kind: "BIG",
    speed: 3.8,
    sprintMul: 1.55,
    accel: 16,
    height: 1.18,
    shoot2: 0.62,
    shoot3: 0.3,
    dunk: 0.92,
    block: 0.9,
    steal: 0.4,
    rebound: 0.9,
    dribble: 0.45,
    jump: 0.95,
    reach: 1.5,
    color: "#e8e8e8",
  },
  NORMAL: {
    kind: "NORMAL",
    speed: 4.7,
    sprintMul: 1.7,
    accel: 20,
    height: 1.0,
    shoot2: 0.62,
    shoot3: 0.55,
    dunk: 0.55,
    block: 0.6,
    steal: 0.6,
    rebound: 0.6,
    dribble: 0.7,
    jump: 1.05,
    reach: 1.25,
    color: "#e8e8e8",
  },
  SMALL: {
    kind: "SMALL",
    speed: 5.7,
    sprintMul: 1.8,
    accel: 24,
    height: 0.86,
    shoot2: 0.6,
    shoot3: 0.78,
    dunk: 0.18,
    block: 0.3,
    steal: 0.75,
    rebound: 0.32,
    dribble: 0.92,
    jump: 1.15,
    reach: 1.05,
    color: "#e8e8e8",
  },
};

// ---- Physics ----
export const GRAVITY = -9.81;
export const BALL_RESTITUTION = 0.62;
export const BALL_FRICTION = 0.78;

// ---- Shooting ----
export const SHOT = {
  minHold: 0.0,
  fullChargeTime: 0.55, // seconds to reach full power / ideal release
  perfectWindow: 0.12, // +/- around fullChargeTime that counts as "perfect"
  baseArc: 7.0, // flight time scaling helper
};

// ---- Difficulty ----
export type Difficulty = "EASY" | "NORMAL" | "HARD";
export const DIFFICULTY: Record<Difficulty, { defReact: number; defSkill: number; offSkill: number }> = {
  EASY: { defReact: 0.35, defSkill: 0.55, offSkill: 0.55 },
  NORMAL: { defReact: 0.6, defSkill: 0.75, offSkill: 0.75 },
  HARD: { defReact: 0.85, defSkill: 0.92, offSkill: 0.9 },
};

export const PLAYER_RADIUS = 0.42; // collision radius on court
export const TRAVEL_DIST = 2.5; // ~3 steps gathered without shooting = traveling

// ---- Match configuration (chosen on the setup screen) ----
export type GameMode = "score" | "time";

// Background scenery the match is played in.
export type SpecialBackdropKind =
  | "classic"
  | "cappadocia"
  | "novisad"
  | "beach"
  | "erciyes"
  | "petrovaradin";

export type CityBackdropKind =
  | "munichMarienplatz"
  | "stuttgartPalace"
  | "frankfurtSkyline"
  | "nurembergCastle"
  | "hamburgHarbor"
  | "berlinGate"
  | "cologneCathedral"
  | "bremenTownHall"
  | "istanbulBosphorus"
  | "istanbulGalata"
  | "istanbulDolmabahce"
  | "trabzonSumela"
  | "ankaraAtakule"
  | "bursaUludag"
  | "konyaMevlana"
  | "izmirClockTower"
  | "belgradeKalemegdan"
  | "nisFortress"
  | "kragujevacMemorial"
  | "noviPazarOldTown"
  | "suboticaTownHall"
  | "kyivMaidan"
  | "lvivOpera"
  | "dniproRiver"
  | "donetskArena"
  | "uzhhorodBlossom"
  | "odesaPotemkin";

export type BackdropKind = SpecialBackdropKind | CityBackdropKind;

export interface TeamConfig {
  players: [PlayerKind, PlayerKind];
  jersey: string;
}

export interface MatchConfig {
  difficulty: Difficulty;
  fouls: boolean;
  backdrop: BackdropKind;
  mode: GameMode;
  scoreTarget: number; // used in "score" mode
  timeLimit: number; // seconds, used in "time" mode
  forceWinner?: boolean; // timed tournament games use a tie-break so every fixture has a winner
  userTeam: TeamConfig;
  cpuTeam: TeamConfig;
  // optional context (tournament matches): team names + which side is the home team
  userName?: string;
  cpuName?: string;
  homeIsUser?: boolean;
}

export const JERSEYS: { name: string; color: string }[] = [
  { name: "Blau", color: "#2563eb" },
  { name: "Rot", color: "#dc2626" },
  { name: "Grün", color: "#16a34a" },
  { name: "Gelb", color: "#eab308" },
  { name: "Violett", color: "#7c3aed" },
  { name: "Orange", color: "#ea580c" },
  { name: "Schwarz", color: "#1f2937" },
  { name: "Weiß", color: "#e5e7eb" },
];

export const SCORE_OPTIONS = [7, 11, 15, 21, 31];
export const TIME_OPTIONS = [5, 10, 15, 20]; // minutes

export const TEAM_PRESETS: { name: string; players: [PlayerKind, PlayerKind]; desc: string }[] = [
  { name: "Classic", players: ["BIG", "SMALL"], desc: "Center + Guard" },
  { name: "Twin Towers", players: ["BIG", "BIG"], desc: "2× groß, dominant am Korb" },
  { name: "Speed", players: ["SMALL", "SMALL"], desc: "2× schnell, viele Dreier" },
  { name: "Allround", players: ["NORMAL", "NORMAL"], desc: "ausgewogen" },
];

export const DEFAULT_CONFIG: MatchConfig = {
  difficulty: "NORMAL",
  fouls: true,
  backdrop: "classic",
  mode: "score",
  scoreTarget: 21,
  timeLimit: 10 * 60,
  userTeam: { players: ["BIG", "SMALL"], jersey: "#2563eb" },
  cpuTeam: { players: ["NORMAL", "NORMAL"], jersey: "#dc2626" },
};
