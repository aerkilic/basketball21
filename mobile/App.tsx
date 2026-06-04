import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Simulation } from "./src/game/Simulation";
import { MatchConfig, PlayerKind, BackdropKind } from "./src/game/constants";
import { GameState } from "./src/game/types";
import {
  Tournament,
  Profile,
  TournamentRules,
  createTournament,
  getPlayerFixture,
  matchConfigFor,
  recordResult,
} from "./src/game/tournament";
import { GameCanvas } from "./src/render/GameCanvas";
import { HudSnapshot } from "./src/render/Scene";
import { Sound } from "./src/audio/SoundManager";
import {
  saveGame,
  loadGame,
  getSaveMeta,
  clearSave,
  SaveMeta,
  loadTournaments,
  upsertTournament,
  saveTournamentMatch,
  loadTournamentMatch,
  clearTournamentMatch,
} from "./src/game/storage";
import { Controls } from "./src/ui/Controls";
import { Hud } from "./src/ui/Hud";
import { StartScreen } from "./src/ui/StartScreen";
import { SetupScreen } from "./src/ui/SetupScreen";
import { LoadingScreen } from "./src/ui/LoadingScreen";
import { GameOverScreen } from "./src/ui/GameOverScreen";
import { PauseButton, PauseMenu } from "./src/ui/PauseMenu";
import { ProfileScreen } from "./src/ui/ProfileScreen";
import { TournamentScreen } from "./src/ui/TournamentScreen";
import { CareerHubScreen } from "./src/ui/CareerHubScreen";
import { I18nProvider } from "./src/i18n";

const EMPTY_HUD: HudSnapshot = {
  scoreUser: 0,
  scoreCpu: 0,
  foulUser: 0,
  foulCpu: 0,
  phase: "TIPOFF",
  possession: "USER",
  winner: null,
  draw: false,
  mode: "score",
  scoreTarget: 21,
  clock: 0,
  userName: "DU",
  cpuName: "CPU",
  homeIsUser: true,
  messages: [],
};

type Screen =
  | "start"
  | "setup"
  | "loading"
  | "playing"
  | "careerHub"
  | "profile"
  | "tournament";

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [foulsEnabled, setFoulsEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [saveMeta, setSaveMeta] = useState<SaveMeta | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tour, setTour] = useState<Tournament | null>(null); // the one being played
  const [backdrop, setBackdrop] = useState<BackdropKind>("classic");

  const simRef = useRef<Simulation | null>(null);
  const configRef = useRef<MatchConfig | null>(null);
  const startMatchRef = useRef<() => void>(() => {});
  const inTournamentRef = useRef(false);

  const refreshMeta = useCallback(() => {
    getSaveMeta().then(setSaveMeta);
  }, []);

  useEffect(() => {
    refreshMeta();
    loadTournaments().then(setTournaments);
  }, [refreshMeta]);

  // clear the quick-match save once that match is over
  useEffect(() => {
    if (hud.phase === "GAMEOVER" && !inTournamentRef.current) {
      clearSave().then(refreshMeta);
    }
  }, [hud.phase, refreshMeta]);

  const onHud = useCallback((s: HudSnapshot) => setHud(s), []);

  const goLoading = useCallback((prepare: () => void) => {
    Sound.init();
    startMatchRef.current = prepare;
    setHud(EMPTY_HUD);
    setPaused(false);
    setScreen("loading");
  }, []);

  // ---- quick match ----
  const startNew = useCallback(
    (cfg: MatchConfig) => {
      inTournamentRef.current = false;
      configRef.current = cfg;
      setFoulsEnabled(cfg.fouls);
      setBackdrop(cfg.backdrop ?? "classic");
      goLoading(() => {
        if (!simRef.current) simRef.current = new Simulation(cfg);
        else simRef.current.reset(cfg);
      });
    },
    [goLoading]
  );

  const continueSaved = useCallback(async () => {
    const saved = await loadGame();
    if (!saved) return;
    inTournamentRef.current = false;
    setFoulsEnabled(saved.foulsEnabled);
    setBackdrop(saved.backdrop ?? "classic");
    goLoading(() => {
      if (!simRef.current) simRef.current = new Simulation(configFromState(saved));
      simRef.current.loadState(saved);
    });
  }, [goLoading]);

  // ---- tournament ----
  // tapping Career/Tournament always opens the hub (continue existing or start new)
  const openTournament = useCallback(() => setScreen("careerHub"), []);

  // continue a saved tournament from the hub
  const continueExisting = useCallback((t: Tournament) => {
    setTour(t);
    setScreen("tournament");
  }, []);

  const startTournament = useCallback(
    async (profile: Profile, leagueId: string, rules: TournamentRules) => {
      const t = createTournament(profile, leagueId, rules);
      const list = await upsertTournament(t, tournaments); // trims to 5, drops oldest
      setTournaments(list);
      setTour(t);
      setScreen("tournament");
    },
    [tournaments]
  );

  const playNextFixture = useCallback(async () => {
    if (!tour) return;
    const f = getPlayerFixture(tour);
    if (!f) return;
    const cfg = matchConfigFor(tour, f);
    inTournamentRef.current = true;
    configRef.current = cfg;
    setFoulsEnabled(cfg.fouls);
    // resume the saved match if it belongs to this exact tournament fixture
    const saved = await loadTournamentMatch();
    const resume = saved && saved.tournamentId === tour.id && saved.fixtureId === f.id ? saved : null;
    setBackdrop((resume?.backdrop as BackdropKind) ?? cfg.backdrop ?? "classic");
    goLoading(() => {
      if (!simRef.current) simRef.current = new Simulation(cfg);
      else simRef.current.reset(cfg);
      if (resume) {
        simRef.current.loadState(resume);
      } else {
        // tag the fresh match so an in-progress save can be matched later
        simRef.current.state.tournamentId = tour.id;
        simRef.current.state.fixtureId = f.id;
      }
    });
  }, [tour, goLoading]);

  const continueTournament = useCallback(async () => {
    const sim = simRef.current;
    if (!sim || !tour) return;
    recordResult(tour, sim.state.score.USER, sim.state.score.CPU);
    const list = await upsertTournament(tour, tournaments); // persist progress
    setTournaments(list);
    setTour({ ...tour });
    inTournamentRef.current = false;
    await clearTournamentMatch(); // this fixture is finished
    setScreen("tournament");
  }, [tour, tournaments]);

  // "new tournament" from inside the hub or a finished tournament -> profile setup
  const newTournament = useCallback(() => {
    setTour(null);
    setScreen("profile");
  }, []);

  const onLoadingDone = useCallback(() => {
    startMatchRef.current();
    setScreen("playing");
  }, []);

  // ---- pause / save (quick match) ----
  const rematch = useCallback(() => {
    const cfg = configRef.current;
    if (cfg && simRef.current) simRef.current.reset(cfg);
    setHud(EMPTY_HUD);
    setPaused(false);
  }, []);

  const togglePause = useCallback((on: boolean) => {
    if (simRef.current) simRef.current.paused = on;
    setPaused(on);
  }, []);

  const doSave = useCallback(async () => {
    if (!simRef.current) return;
    if (inTournamentRef.current) {
      // tournament matches save to their own slot so they can be resumed
      await saveTournamentMatch(simRef.current.state);
    } else {
      await saveGame(simRef.current.state);
      refreshMeta();
    }
  }, [refreshMeta]);

  const quitToMenu = useCallback(() => {
    togglePause(false);
    setScreen(inTournamentRef.current ? "tournament" : "start");
    refreshMeta();
  }, [togglePause, refreshMeta]);

  const sim = simRef.current;
  const onBall = hud.possession === "USER" && hud.phase === "LIVE";
  const gameOver = hud.phase === "GAMEOVER";

  return (
    <SafeAreaProvider>
    <I18nProvider>
    <GestureHandlerRootView style={styles.root}>
      <StatusBar hidden />

      {screen === "start" && (
        <StartScreen
          saveMeta={saveMeta}
          hasTournament={tournaments.length > 0}
          onNew={() => setScreen("setup")}
          onContinue={continueSaved}
          onTournament={openTournament}
        />
      )}

      {screen === "setup" && <SetupScreen onStart={startNew} onBack={() => setScreen("start")} />}

      {screen === "careerHub" && (
        <CareerHubScreen
          tournaments={tournaments}
          onContinue={continueExisting}
          onNew={newTournament}
          onBack={() => setScreen("start")}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen onStart={startTournament} onBack={() => setScreen("careerHub")} />
      )}

      {screen === "tournament" && tour && (
        <TournamentScreen
          t={tour}
          onPlayNext={playNextFixture}
          onNewTournament={newTournament}
          onExit={() => setScreen("careerHub")}
        />
      )}

      {screen === "loading" && <LoadingScreen onDone={onLoadingDone} />}

      {screen === "playing" && sim && (
        <View style={styles.root}>
          <GameCanvas sim={sim} onHud={onHud} backdrop={backdrop} />

          <Hud hud={hud} foulsEnabled={foulsEnabled} />

          {!paused && !gameOver && <Controls input={sim.input} onBall={onBall} />}

          {!paused && !gameOver && <PauseButton onPress={() => togglePause(true)} />}

          {paused && !gameOver && (
            <PauseMenu onResume={() => togglePause(false)} onSave={doSave} onQuit={quitToMenu} />
          )}

          {gameOver && (
            <GameOverScreen
              winner={hud.winner}
              draw={hud.draw}
              scoreUser={hud.scoreUser}
              scoreCpu={hud.scoreCpu}
              tournament={inTournamentRef.current}
              onContinue={continueTournament}
              onRematch={rematch}
              onMenu={() => setScreen("start")}
            />
          )}
        </View>
      )}
    </GestureHandlerRootView>
    </I18nProvider>
    </SafeAreaProvider>
  );
}

function configFromState(s: GameState): MatchConfig {
  return {
    difficulty: s.difficulty,
    fouls: s.foulsEnabled,
    backdrop: s.backdrop ?? "classic",
    mode: s.mode,
    scoreTarget: s.scoreTarget,
    timeLimit: s.timeLimit,
    forceWinner: s.forceWinner ?? false,
    userTeam: {
      players: [s.players[0].stats.kind, s.players[1].stats.kind] as [PlayerKind, PlayerKind],
      jersey: s.players[0].jersey,
    },
    cpuTeam: {
      players: [s.players[2].stats.kind, s.players[3].stats.kind] as [PlayerKind, PlayerKind],
      jersey: s.players[2].jersey,
    },
    userName: s.userName,
    cpuName: s.cpuName,
    homeIsUser: s.homeIsUser,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1018" },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  side: { justifyContent: "flex-end" },
});
