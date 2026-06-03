// Persistence: save / load an in-progress match, plus tournament + eternal table.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameState } from "./types";
import { Tournament, EternalRow, emptyEternal } from "./tournament";

const KEY = "bb21_savegame_v1";
const T_KEY = "bb21_tournament_v1";
const E_KEY = "bb21_eternal_v1";

export interface SaveMeta {
  scoreUser: number;
  scoreCpu: number;
  mode: string;
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
    mode: s.mode === "time" ? "Zeit" : `bis ${s.scoreTarget}`,
    savedAt: Date.now(),
  };
}

export async function clearSave(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

// ---- tournament ----
export async function saveTournament(t: Tournament): Promise<void> {
  try {
    await AsyncStorage.setItem(T_KEY, JSON.stringify(t));
  } catch (e) {
    console.warn("saveTournament failed", e);
  }
}

export async function loadTournament(): Promise<Tournament | null> {
  try {
    const raw = await AsyncStorage.getItem(T_KEY);
    return raw ? (JSON.parse(raw) as Tournament) : null;
  } catch {
    return null;
  }
}

export async function clearTournament(): Promise<void> {
  try {
    await AsyncStorage.removeItem(T_KEY);
  } catch {}
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
