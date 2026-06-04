// Tournament / career mode: a league of teams (chosen by the player) is drawn
// randomly into two groups (A & B), single round-robin, top 2 of each advance to
// cross semifinals + final. Points: win = 2, loss = 1; ties broken by basket
// difference (scored − conceded), then baskets scored.
import { MatchConfig, PlayerKind, BackdropKind } from "./constants";

export type GroupKey = "A" | "B";
export type Stage = "GROUP" | "SF" | "FINAL";

export interface Team {
  id: string;
  city: string; // display name (city or club)
  color: string;
  players: [PlayerKind, PlayerKind];
  strength: number; // 0..1, used to simulate AI-vs-AI results
}

export interface League {
  id: string;
  teams: Team[];
}

// ---- German clubs (default for all non-Turkish languages) ----
const GERMAN_TEAMS: Team[] = [
  { id: "muc", city: "München", color: "#dc2626", players: ["BIG", "NORMAL"], strength: 0.85 },
  { id: "stu", city: "Stuttgart", color: "#f1f5f9", players: ["NORMAL", "SMALL"], strength: 0.62 },
  { id: "fra", city: "Frankfurt", color: "#475569", players: ["NORMAL", "NORMAL"], strength: 0.7 },
  { id: "nue", city: "Nürnberg", color: "#9333ea", players: ["BIG", "SMALL"], strength: 0.58 },
  { id: "ham", city: "Hamburg", color: "#0ea5e9", players: ["NORMAL", "SMALL"], strength: 0.66 },
  { id: "ber", city: "Berlin", color: "#eab308", players: ["BIG", "SMALL"], strength: 0.8 },
  { id: "koe", city: "Köln", color: "#16a34a", players: ["SMALL", "SMALL"], strength: 0.55 },
  { id: "bre", city: "Bremen", color: "#ea580c", players: ["NORMAL", "NORMAL"], strength: 0.5 },
];

// ---- Turkish clubs (used when the app language is Turkish) ----
const TURKISH_TEAMS: Team[] = [
  { id: "tr_gs", city: "Galatasaray", color: "#a11818", players: ["BIG", "SMALL"], strength: 0.86 },
  { id: "tr_fb", city: "Fenerbahçe", color: "#16307a", players: ["BIG", "NORMAL"], strength: 0.84 },
  { id: "tr_bjk", city: "Beşiktaş", color: "#1f2937", players: ["NORMAL", "SMALL"], strength: 0.8 },
  { id: "tr_tra", city: "Trabzon", color: "#7a1f3d", players: ["NORMAL", "NORMAL"], strength: 0.74 },
  { id: "tr_kay", city: "Kayseri", color: "#c4302b", players: ["NORMAL", "SMALL"], strength: 0.6 },
  { id: "tr_mer", city: "Mersin", color: "#b22222", players: ["SMALL", "SMALL"], strength: 0.52 },
  { id: "tr_ank", city: "Ankara", color: "#0b3d91", players: ["BIG", "SMALL"], strength: 0.68 },
  { id: "tr_bur", city: "Bursa", color: "#15803d", players: ["NORMAL", "NORMAL"], strength: 0.64 },
  { id: "tr_kon", city: "Konya", color: "#166534", players: ["BIG", "NORMAL"], strength: 0.66 },
  { id: "tr_izm", city: "İzmir", color: "#d97706", players: ["NORMAL", "SMALL"], strength: 0.57 },
];

// ---- Serbian cities (used when the app language is Serbian), 6 teams ----
const SERBIAN_TEAMS: Team[] = [
  { id: "rs_bg", city: "Beograd", color: "#c4302b", players: ["BIG", "SMALL"], strength: 0.85 },
  { id: "rs_ns", city: "Novi Sad", color: "#1d4ed8", players: ["NORMAL", "NORMAL"], strength: 0.7 },
  { id: "rs_nis", city: "Niš", color: "#0f766e", players: ["NORMAL", "SMALL"], strength: 0.64 },
  { id: "rs_kg", city: "Kragujevac", color: "#b45309", players: ["BIG", "NORMAL"], strength: 0.6 },
  { id: "rs_np", city: "Novi Pazar", color: "#15803d", players: ["SMALL", "SMALL"], strength: 0.54 },
  { id: "rs_su", city: "Subotica", color: "#7c3aed", players: ["NORMAL", "NORMAL"], strength: 0.58 },
];

// ---- Ukrainian cities (used when the app language is Ukrainian), 6 teams,
// names in Ukrainian ----
const UKRAINIAN_TEAMS: Team[] = [
  { id: "ua_kyiv", city: "Київ", color: "#2563eb", players: ["BIG", "SMALL"], strength: 0.85 },
  { id: "ua_lviv", city: "Львів", color: "#ca8a04", players: ["NORMAL", "NORMAL"], strength: 0.7 },
  { id: "ua_dnipro", city: "Дніпро", color: "#dc2626", players: ["BIG", "NORMAL"], strength: 0.68 },
  { id: "ua_donetsk", city: "Донецьк", color: "#ea580c", players: ["NORMAL", "SMALL"], strength: 0.66 },
  { id: "ua_uzh", city: "Ужгород", color: "#0f766e", players: ["SMALL", "SMALL"], strength: 0.55 },
  { id: "ua_odesa", city: "Одеса", color: "#0ea5e9", players: ["NORMAL", "NORMAL"], strength: 0.6 },
];

export const LEAGUES: Record<string, League> = {
  de: { id: "de", teams: GERMAN_TEAMS },
  tr: { id: "tr", teams: TURKISH_TEAMS },
  sr: { id: "sr", teams: SERBIAN_TEAMS },
  uk: { id: "uk", teams: UKRAINIAN_TEAMS },
};

export const LEAGUE_IDS = ["de", "tr", "sr", "uk"] as const;

// language -> default league (German is the fallback for languages without a league)
export function leagueForLang(lang: string): League {
  return LEAGUES[lang] ?? LEAGUES.de;
}
export function leagueById(id: string): League {
  return LEAGUES[id] ?? LEAGUES.de;
}

const ALL_TEAMS: Team[] = [...GERMAN_TEAMS, ...TURKISH_TEAMS, ...SERBIAN_TEAMS, ...UKRAINIAN_TEAMS];
export const teamById = (id: string): Team =>
  ALL_TEAMS.find((t) => t.id === id) ?? { id, city: id, color: "#888", players: ["NORMAL", "NORMAL"], strength: 0.5 };

export interface Fixture {
  id: string;
  stage: Stage;
  group: GroupKey | "KO";
  round: number; // group rounds 1..rounds; knockouts rounds+1 (SF) / rounds+2 (FINAL)
  home: string;
  away: string;
  played: boolean;
  homeScore: number;
  awayScore: number;
}

export interface Profile {
  nickname: string;
  teamId: string;
}

// stadium/backdrop is drawn at random for every tournament match
const BACKDROPS: BackdropKind[] = ["classic", "cappadocia", "novisad", "beach", "erciyes"];
const randomBackdrop = (): BackdropKind => BACKDROPS[Math.floor(Math.random() * BACKDROPS.length)];

export interface Tournament {
  id: string; // unique save-slot id
  updatedAt: number; // last time this tournament was created/played (for slot ordering)
  leagueId: string;
  groups: { A: string[]; B: string[] }; // random draw of team ids per group
  rounds: number; // number of group-stage rounds
  profile: Profile;
  phase: "GROUP" | "SF" | "FINAL" | "DONE";
  round: number; // current group round (1..rounds)
  fixtures: Fixture[]; // group stage
  knockouts: Fixture[]; // SF + final
  championId: string | null;
}

// ---- helpers ----
let fxId = 0;
const nfx = () => `f${fxId++}`;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randHome(a: string, b: string): { home: string; away: string } {
  return Math.random() < 0.5 ? { home: a, away: b } : { home: b, away: a };
}

const roundsFor = (n: number) => (n % 2 === 0 ? n - 1 : n);

// Circle-method single round-robin pairings. Odd counts get a "BYE" each round.
function roundRobin(ids: string[]): [string, string][][] {
  const arr = ids.slice();
  if (arr.length % 2 === 1) arr.push("BYE");
  const n = arr.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== "BYE" && b !== "BYE") pairs.push([a, b]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()!); // rotate, keeping the first element fixed
  }
  return rounds;
}

function mkFix(stage: Stage, group: GroupKey | "KO", round: number, home: string, away: string): Fixture {
  return { id: nfx(), stage, group, round, home, away, played: false, homeScore: 0, awayScore: 0 };
}

function genGroupFixtures(group: GroupKey, ids: string[]): Fixture[] {
  const out: Fixture[] = [];
  roundRobin(ids).forEach((pairs, r) => {
    pairs.forEach(([a, b]) => {
      const { home, away } = randHome(a, b);
      out.push(mkFix("GROUP", group, r + 1, home, away));
    });
  });
  return out;
}

export function createTournament(profile: Profile, leagueId: string): Tournament {
  fxId = 0;
  const league = leagueById(leagueId);
  const ids = shuffle(league.teams.map((t) => t.id));
  const half = Math.ceil(ids.length / 2);
  const A = ids.slice(0, half);
  const B = ids.slice(half);
  const rounds = roundsFor(A.length);
  const fixtures = [...genGroupFixtures("A", A), ...genGroupFixtures("B", B)];
  const t: Tournament = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: Date.now(),
    leagueId: league.id,
    groups: { A, B },
    rounds,
    profile,
    phase: "GROUP",
    round: 1,
    fixtures,
    knockouts: [],
    championId: null,
  };
  skipPlayerByes(t); // if the player has a bye in round 1, auto-advance
  return t;
}

// ---- standings ----
export interface StandRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  pf: number;
  pa: number;
  points: number;
}

export function groupStandings(t: Tournament, group: GroupKey): StandRow[] {
  const rows: Record<string, StandRow> = {};
  for (const id of t.groups[group] ?? [])
    rows[id] = { teamId: id, played: 0, won: 0, lost: 0, pf: 0, pa: 0, points: 0 };
  for (const f of t.fixtures) {
    if (f.group !== group || !f.played) continue;
    const h = rows[f.home];
    const a = rows[f.away];
    if (!h || !a) continue;
    h.played++; a.played++;
    h.pf += f.homeScore; h.pa += f.awayScore;
    a.pf += f.awayScore; a.pa += f.homeScore;
    if (f.homeScore > f.awayScore) {
      h.won++; h.points += 2; a.lost++; a.points += 1;
    } else {
      a.won++; a.points += 2; h.lost++; h.points += 1;
    }
  }
  // points, then basket difference (scored − conceded), then baskets scored
  return Object.values(rows).sort(
    (x, y) => y.points - x.points || y.pf - y.pa - (x.pf - x.pa) || y.pf - x.pf
  );
}

// ---- AI-vs-AI result ----
function simFixture(f: Fixture) {
  const home = teamById(f.home);
  const away = teamById(f.away);
  const hs = home.strength + 0.06; // home advantage
  const p = Math.max(0.22, Math.min(0.78, hs / (hs + away.strength)));
  const homeWins = Math.random() < p;
  const margin = 2 + Math.floor(Math.random() * 13); // 2..14
  const lose = Math.max(7, 21 - margin);
  f.homeScore = homeWins ? 21 : lose;
  f.awayScore = homeWins ? lose : 21;
  f.played = true;
}

const winnerOf = (f: Fixture): string => (f.homeScore > f.awayScore ? f.home : f.away);
const involvesPlayer = (t: Tournament, f: Fixture): boolean =>
  f.home === t.profile.teamId || f.away === t.profile.teamId;

// The next match the player must play interactively, or null.
export function getPlayerFixture(t: Tournament): Fixture | null {
  if (t.phase === "GROUP")
    return t.fixtures.find((f) => f.round === t.round && involvesPlayer(t, f) && !f.played) ?? null;
  if (t.phase === "SF")
    return t.knockouts.find((f) => f.stage === "SF" && involvesPlayer(t, f) && !f.played) ?? null;
  if (t.phase === "FINAL")
    return t.knockouts.find((f) => f.stage === "FINAL" && involvesPlayer(t, f) && !f.played) ?? null;
  return null;
}

// Simulate the remaining games of the current group round (used after the player's
// own game, and for rounds where the player has a bye).
function simRound(t: Tournament, round: number) {
  for (const f of t.fixtures) if (f.round === round && !f.played) simFixture(f);
}

// Advance through any group rounds where the player has a bye; enter the knockouts
// once the group stage is exhausted.
function skipPlayerByes(t: Tournament) {
  while (t.phase === "GROUP") {
    const hasGame = t.fixtures.some((f) => f.round === t.round && involvesPlayer(t, f) && !f.played);
    if (hasGame) return;
    simRound(t, t.round);
    if (t.round < t.rounds) t.round++;
    else {
      enterKnockouts(t);
      return;
    }
  }
}

// Build the cross semifinals from final group standings.
function buildKnockouts(t: Tournament) {
  const a = groupStandings(t, "A");
  const b = groupStandings(t, "B");
  const a1 = a[0].teamId, a2 = a[1].teamId;
  const b1 = b[0].teamId, b2 = b[1].teamId;
  const sfRound = t.rounds + 1;
  const m1 = randHome(a1, b2);
  const m2 = randHome(b1, a2);
  t.knockouts = [
    mkFix("SF", "KO", sfRound, m1.home, m1.away),
    mkFix("SF", "KO", sfRound, m2.home, m2.away),
  ];
}

function buildFinal(t: Tournament) {
  if (t.knockouts.some((f) => f.stage === "FINAL")) return;
  const sfs = t.knockouts.filter((f) => f.stage === "SF");
  const f = randHome(winnerOf(sfs[0]), winnerOf(sfs[1]));
  t.knockouts.push(mkFix("FINAL", "KO", t.rounds + 2, f.home, f.away));
}

function setChampion(t: Tournament) {
  const fin = t.knockouts.find((f) => f.stage === "FINAL")!;
  t.championId = winnerOf(fin);
  t.phase = "DONE";
}

function enterKnockouts(t: Tournament) {
  buildKnockouts(t);
  const playerSF = t.knockouts.find((f) => f.stage === "SF" && involvesPlayer(t, f) && !f.played);
  if (playerSF) {
    t.phase = "SF";
    return;
  }
  // player didn't qualify — auto-play the whole bracket
  t.knockouts.forEach((f) => !f.played && simFixture(f));
  buildFinal(t);
  const fin = t.knockouts.find((f) => f.stage === "FINAL")!;
  if (!fin.played) simFixture(fin);
  setChampion(t);
}

// Record the player's match result (from the USER-side perspective) and advance.
export function recordResult(t: Tournament, userScore: number, cpuScore: number) {
  const f = getPlayerFixture(t);
  if (!f) return;
  const me = t.profile.teamId;
  if (f.home === me) {
    f.homeScore = userScore;
    f.awayScore = cpuScore;
  } else {
    f.homeScore = cpuScore;
    f.awayScore = userScore;
  }
  f.played = true;
  resolveAfter(t);
}

function resolveAfter(t: Tournament) {
  if (t.phase === "GROUP") {
    simRound(t, t.round); // finish the rest of this round
    if (t.round < t.rounds) {
      t.round++;
      skipPlayerByes(t); // advance over bye rounds or into the knockouts
    } else {
      enterKnockouts(t);
    }
  } else if (t.phase === "SF") {
    for (const f of t.knockouts) if (f.stage === "SF" && !f.played) simFixture(f);
    buildFinal(t);
    const fin = t.knockouts.find((f) => f.stage === "FINAL")!;
    if (involvesPlayer(t, fin) && !fin.played) {
      t.phase = "FINAL";
    } else {
      if (!fin.played) simFixture(fin);
      setChampion(t);
    }
  } else if (t.phase === "FINAL") {
    setChampion(t);
  }
}

// Build the MatchConfig for the player's current fixture.
export function matchConfigFor(t: Tournament, f: Fixture): MatchConfig {
  const meId = t.profile.teamId;
  const me = teamById(meId);
  const oppId = f.home === meId ? f.away : f.home;
  const opp = teamById(oppId);
  const homeIsUser = f.home === meId;
  return {
    difficulty: "NORMAL",
    fouls: true,
    backdrop: randomBackdrop(), // random stadium each tournament match
    mode: "score",
    scoreTarget: 21,
    timeLimit: 600,
    userTeam: { players: me.players, jersey: me.color },
    cpuTeam: { players: opp.players, jersey: opp.color },
    // show the player's nickname (with their club) on the scoreboard
    userName: t.profile.nickname ? `${t.profile.nickname} · ${me.city}` : me.city,
    cpuName: opp.city,
    homeIsUser,
  };
}
