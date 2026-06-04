// Tournament / career mode: 8 city teams in two groups (Nord/Süd), double
// round-robin, top 2 advance, cross semifinals + final. Plus a persistent
// "ewige Tabelle" (all-time standings) and the player's profile.
import { MatchConfig, PlayerKind } from "./constants";

export type GroupKey = "NORD" | "SUED";
export type Stage = "GROUP" | "SF" | "FINAL";

export interface Team {
  id: string;
  city: string;
  color: string;
  group: GroupKey;
  players: [PlayerKind, PlayerKind];
  strength: number; // 0..1, used to simulate AI-vs-AI results
}

export const TEAMS: Team[] = [
  // Gruppe Süd
  { id: "muc", city: "München", color: "#dc2626", group: "SUED", players: ["BIG", "NORMAL"], strength: 0.85 },
  { id: "stu", city: "Stuttgart", color: "#f1f5f9", group: "SUED", players: ["NORMAL", "SMALL"], strength: 0.62 },
  { id: "fra", city: "Frankfurt", color: "#475569", group: "SUED", players: ["NORMAL", "NORMAL"], strength: 0.7 },
  { id: "nue", city: "Nürnberg", color: "#9333ea", group: "SUED", players: ["BIG", "SMALL"], strength: 0.58 },
  // Gruppe Nord
  { id: "ham", city: "Hamburg", color: "#0ea5e9", group: "NORD", players: ["NORMAL", "SMALL"], strength: 0.66 },
  { id: "ber", city: "Berlin", color: "#eab308", group: "NORD", players: ["BIG", "SMALL"], strength: 0.8 },
  { id: "koe", city: "Köln", color: "#16a34a", group: "NORD", players: ["SMALL", "SMALL"], strength: 0.55 },
  { id: "bre", city: "Bremen", color: "#ea580c", group: "NORD", players: ["NORMAL", "NORMAL"], strength: 0.5 },
];

export const teamById = (id: string): Team => TEAMS.find((t) => t.id === id)!;
const groupTeams = (g: GroupKey): Team[] => TEAMS.filter((t) => t.group === g);

export interface Fixture {
  id: string;
  stage: Stage;
  group: GroupKey | "KO";
  round: number; // group rounds 1..6, knockouts 7 (SF) / 8 (FINAL)
  home: string;
  away: string;
  played: boolean;
  homeScore: number;
  awayScore: number;
}

export interface Profile {
  name: string;
  nickname: string;
  teamId: string;
}

export interface Tournament {
  profile: Profile;
  phase: "GROUP" | "SF" | "FINAL" | "DONE";
  round: number; // current group round (1..6)
  fixtures: Fixture[]; // group stage
  knockouts: Fixture[]; // SF + final
  championId: string | null;
  appliedToEternal: boolean;
}

export interface EternalRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  pf: number;
  pa: number;
  points: number;
  titles: number;
}

// ---- schedule generation ----
let fxId = 0;
const nfx = () => `f${fxId++}`;

function randHome(a: string, b: string): { home: string; away: string } {
  return Math.random() < 0.5 ? { home: a, away: b } : { home: b, away: a };
}

// Single round-robin pairings for 4 teams (indices), then mirrored return legs.
const SINGLE_ROUNDS: [number, number][][] = [
  [[0, 3], [1, 2]],
  [[0, 2], [3, 1]],
  [[0, 1], [2, 3]],
];

function genGroupFixtures(group: GroupKey): Fixture[] {
  const ts = groupTeams(group);
  const out: Fixture[] = [];
  // first legs (rounds 1..3) with random home/away
  SINGLE_ROUNDS.forEach((pairs, r) => {
    pairs.forEach(([i, j]) => {
      const { home, away } = randHome(ts[i].id, ts[j].id);
      out.push(mkFix("GROUP", group, r + 1, home, away));
    });
  });
  // return legs (rounds 4..6) — swap home/away
  SINGLE_ROUNDS.forEach((pairs, r) => {
    pairs.forEach(([i, j]) => {
      const first = out.find(
        (f) =>
          f.round === r + 1 &&
          ((f.home === ts[i].id && f.away === ts[j].id) ||
            (f.home === ts[j].id && f.away === ts[i].id))
      )!;
      out.push(mkFix("GROUP", group, r + 4, first.away, first.home));
    });
  });
  return out;
}

function mkFix(stage: Stage, group: GroupKey | "KO", round: number, home: string, away: string): Fixture {
  return { id: nfx(), stage, group, round, home, away, played: false, homeScore: 0, awayScore: 0 };
}

export function createTournament(profile: Profile): Tournament {
  fxId = 0;
  const fixtures = [...genGroupFixtures("NORD"), ...genGroupFixtures("SUED")];
  return {
    profile,
    phase: "GROUP",
    round: 1,
    fixtures,
    knockouts: [],
    championId: null,
    appliedToEternal: false,
  };
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
  for (const tm of groupTeams(group))
    rows[tm.id] = { teamId: tm.id, played: 0, won: 0, lost: 0, pf: 0, pa: 0, points: 0 };
  for (const f of t.fixtures) {
    if (f.group !== group || !f.played) continue;
    const h = rows[f.home];
    const a = rows[f.away];
    h.played++; a.played++;
    h.pf += f.homeScore; h.pa += f.awayScore;
    a.pf += f.awayScore; a.pa += f.homeScore;
    if (f.homeScore > f.awayScore) {
      h.won++; h.points += 2; a.lost++; a.points += 1;
    } else {
      a.won++; a.points += 2; h.lost++; h.points += 1;
    }
  }
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
    return (
      t.fixtures.find((f) => f.round === t.round && involvesPlayer(t, f) && !f.played) ?? null
    );
  if (t.phase === "SF")
    return t.knockouts.find((f) => f.stage === "SF" && involvesPlayer(t, f) && !f.played) ?? null;
  if (t.phase === "FINAL")
    return t.knockouts.find((f) => f.stage === "FINAL" && involvesPlayer(t, f) && !f.played) ?? null;
  return null;
}

// Build the cross semifinals from final group standings.
function buildKnockouts(t: Tournament) {
  const nord = groupStandings(t, "NORD");
  const sued = groupStandings(t, "SUED");
  const n1 = nord[0].teamId, n2 = nord[1].teamId;
  const s1 = sued[0].teamId, s2 = sued[1].teamId;
  const a = randHome(n1, s2);
  const b = randHome(n2, s1);
  t.knockouts = [
    mkFix("SF", "KO", 7, a.home, a.away),
    mkFix("SF", "KO", 7, b.home, b.away),
  ];
}

function buildFinal(t: Tournament) {
  if (t.knockouts.some((f) => f.stage === "FINAL")) return;
  const sfs = t.knockouts.filter((f) => f.stage === "SF");
  const w1 = winnerOf(sfs[0]);
  const w2 = winnerOf(sfs[1]);
  const f = randHome(w1, w2);
  t.knockouts.push(mkFix("FINAL", "KO", 8, f.home, f.away));
}

function setChampion(t: Tournament) {
  const fin = t.knockouts.find((f) => f.stage === "FINAL")!;
  t.championId = winnerOf(fin);
  t.phase = "DONE";
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
    for (const f of t.fixtures) if (f.round === t.round && !f.played) simFixture(f);
    if (t.round < 6) {
      t.round++;
    } else {
      buildKnockouts(t);
      if (getPlayerFixture(t)) {
        t.phase = "SF";
      } else {
        // player eliminated — auto-play the bracket
        t.knockouts.forEach((f) => !f.played && simFixture(f));
        buildFinal(t);
        const fin = t.knockouts.find((f) => f.stage === "FINAL")!;
        if (!fin.played) simFixture(fin);
        setChampion(t);
      }
    }
  } else if (t.phase === "SF") {
    for (const f of t.knockouts) if (f.stage === "SF" && !f.played) simFixture(f);
    buildFinal(t);
    if (getPlayerFixture(t)) {
      t.phase = "FINAL";
    } else {
      const fin = t.knockouts.find((f) => f.stage === "FINAL")!;
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

// ---- eternal table ----
export function emptyEternal(): Record<string, EternalRow> {
  const out: Record<string, EternalRow> = {};
  for (const t of TEAMS)
    out[t.id] = { teamId: t.id, played: 0, won: 0, lost: 0, pf: 0, pa: 0, points: 0, titles: 0 };
  return out;
}

export function applyToEternal(
  t: Tournament,
  table: Record<string, EternalRow>
): Record<string, EternalRow> {
  const next = { ...table };
  for (const id of TEAMS.map((x) => x.id)) if (!next[id]) next[id] = emptyEternal()[id];
  const all = [...t.fixtures, ...t.knockouts].filter((f) => f.played);
  for (const f of all) {
    const h = next[f.home], a = next[f.away];
    h.played++; a.played++;
    h.pf += f.homeScore; h.pa += f.awayScore;
    a.pf += f.awayScore; a.pa += f.homeScore;
    if (f.homeScore > f.awayScore) {
      h.won++; h.points += 2; a.lost++; a.points += 1;
    } else {
      a.won++; a.points += 2; h.lost++; h.points += 1;
    }
  }
  if (t.championId) next[t.championId].titles++;
  return next;
}

export function eternalSorted(table: Record<string, EternalRow>): EternalRow[] {
  return Object.values(table).sort(
    (x, y) => y.titles - x.titles || y.points - x.points || y.pf - y.pa - (x.pf - x.pa)
  );
}
