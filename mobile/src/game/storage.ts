// Persistence: save / load an in-progress match, plus tournament + eternal table.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState } from "./types";
import { Tournament, EternalRow, emptyEternal } from "./tournament";

const KEY = "bb21_savegame_v1";
const T_KEY = "bb21_tournament_v1"; // legacy single-tournament slot (migrated on load)
const T_LIST_KEY = "bb21_tournaments_v2"; // up to MAX_TOURNAMENTS saved tournaments
const E_KEY = "bb21_eternal_v1";

export const MAX_TOURNAMENTS = 5;

export interface SaveMeta {
  scoreUser: number;
  scoreCpu: number;
  timeMode: boolean;
  scoreTarget: number;
  savedAt: number;
}

export async function saveGame(state: GameState): Promise<void> {
  try {
    // don't persist transient per-frame events
    const clean: GameState = { ...state, events: [] };
    await AsyncStorage.setItem(KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn("saveGame failed", e);
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch (e) {
    console.warn("loadGame failed", e);
    return null;
  }
}

export async function getSaveMeta(): Promise<SaveMeta | null> {
  const s = await loadGame();
  if (!s) return null;
  return {
    scoreUser: s.score.USER,
    scoreCpu: s.score.CPU,
    timeMode: s.mode === "time",
    scoreTarget: s.scoreTarget,
    savedAt: Date.now(),
  };
}

export async function clearSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

// ---- tournaments (up to MAX_TOURNAMENTS slots) ----
function withId(t: Tournament): Tournament {
  // heal tournaments saved before id/updatedAt existed
  return {
    ...t,
    id: t.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    updatedAt: t.updatedAt ?? Date.now(),
  };
}

const byRecency = (a: Tournament, b: Tournament) => b.updatedAt - a.updatedAt;

// Load all saved tournaments, newest first, migrating a legacy single save if present.
// only tournaments in the current (league/groups) format are usable
const isCompatible = (t: Tournament): boolean =>
  !!t && !!t.groups && Array.isArray(t.groups.A) && typeof t.rounds === "number";

export async function loadTournaments(): Promise<Tournament[]> {
  try {
    const raw = await AsyncStorage.getItem(T_LIST_KEY);
    if (raw) {
      const list = (JSON.parse(raw) as Tournament[]).filter(isCompatible).map(withId);
      return list.sort(byRecency).slice(0, MAX_TOURNAMENTS);
    }
    // legacy single-tournament slot used an incompatible format — discard it
    await AsyncStorage.removeItem(T_KEY).catch(() => {});
    return [];
  } catch {
    return [];
  }
}

async function persist(list: Tournament[]): Promise<void> {
  try {
    await AsyncStorage.setItem(T_LIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("saveTournaments failed", e);
  }
}

// Insert or update a tournament, keep newest-first, and cap at MAX_TOURNAMENTS
// (the oldest is dropped when a 6th is added). Returns the new list.
export async function upsertTournament(t: Tournament, current: Tournament[]): Promise<Tournament[]> {
  const stamped = { ...t, updatedAt: Date.now() };
  const next = [stamped, ...current.filter((x) => x.id !== stamped.id)]
    .sort(byRecency)
    .slice(0, MAX_TOURNAMENTS);
  await persist(next);
  return next;
}

export async function deleteTournament(id: string, current: Tournament[]): Promise<Tournament[]> {
  const next = current.filter((x) => x.id !== id);
  await persist(next);
  return next;
}

// ---- eternal table ----
export async function loadEternal(): Promise<Record<string, EternalRow>> {
  try {
    const raw = await AsyncStorage.getItem(E_KEY);
    if (!raw) return emptyEternal();
    const parsed = JSON.parse(raw) as Record<string, EternalRow>;
    // merge with any newly added teams
    return { ...emptyEternal(), ...parsed };
  } catch {
    return emptyEternal();
  }
}

export async function saveEternal(table: Record<string, EternalRow>): Promise<void> {
  try {
    await AsyncStorage.setItem(E_KEY, JSON.stringify(table));
  } catch {}
}
