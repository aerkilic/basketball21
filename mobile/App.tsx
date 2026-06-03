import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Simulation } from "./src/game/Simulation";
import { MatchConfig, PlayerKind } from "./src/game/constants";
import { GameState } from "./src/game/types";
import {
  Tournament,
  Profile,
  EternalRow,
  createTournament,
  getPlayerFixture,
  matchConfigFor,
  recordResult,
  applyToEternal,
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
  saveTournament,
  loadTournament,
  clearTournament,
  loadEternal,
  saveEternal,
} from "./src/game/storage";
import { Joystick } from "./src/ui/Joystick";
import { ActionButtons } from "./src/ui/ActionButtons";
import { Hud } from "./src/ui/Hud";
import { StartScreen } from "./src/ui/StartScreen";
import { SetupScreen } from "./src/ui/SetupScreen";
import { LoadingScreen } from "./src/ui/LoadingScreen";
import { GameOverScreen } from "./src/ui/GameOverScreen";
import { PauseButton, PauseMenu } from "./src/ui/PauseMenu";
import { ProfileScreen } from "./src/ui/ProfileScreen";
import { TournamentScreen } from "./src/ui/TournamentScreen";
import { EternalTableScreen } from "./src/ui/EternalTableScreen";

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

type Screen = "start" | "setup" | "loading" | "playing" | "profile" | "tournament" | "eternal";

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [foulsEnabled, setFoulsEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const [saveMeta, setSaveMeta] = useState<SaveMeta | null>(null);
  const [tour, setTour] = useState<Tournament | null>(null);
  const [eternal, setEternal] = useState<Record<string, EternalRow>>({});

  const simRef = useRef<Simulation | null>(null);
  const configRef = useRef<MatchConfig | null>(null);
  const startMatchRef = useRef<() => void>(() => {});
  const inTournamentRef = useRef(false);

  const refreshMeta = useCallback(() => {
    getSaveMeta().then(setSaveMeta);
  }, []);

  useEffect(() => {
    refreshMeta();
    loadEternal().then(setEternal);
    loadTournament().then(setTour);
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
    goLoading(() => {
      if (!simRef.current) simRef.current = new Simulation(configFromState(saved));
      simRef.current.loadState(saved);
    });
  }, [goLoading]);

  // ---- tournament ----
  const openTournament = useCallback(() => {
    if (tour) setScreen("tournament");
    else setScreen("profile");
  }, [tour]);

  const startTournament = useCallback(
    (profile: Profile) => {
      const t = createTournament(profile);
      setTour(t);
      saveTournament(t);
      setScreen("tournament");
    },
    []
  );

  const playNextFixture = useCallback(() => {
    if (!tour) return;
    const f = getPlayerFixture(tour);
    if (!f) return;
    const cfg = matchConfigFor(tour, f);
    inTournamentRef.current = true;
    configRef.current = cfg;
    setFoulsEnabled(cfg.fouls);
    goLoading(() => {
      if (!simRef.current) simRef.current = new Simulation(cfg);
      else simRef.current.reset(cfg);
    });
  }, [tour, goLoading]);

  const continueTournament = useCallback(async () => {
    const sim = simRef.current;
    if (!sim || !tour) return;
    recordResult(tour, sim.state.score.USER, sim.state.score.CPU);
    if (tour.phase === "DONE" && !tour.appliedToEternal) {
      const updated = applyToEternal(tour, eternal);
      tour.appliedToEternal = true;
      setEternal(updated);
      saveEternal(updated);
    }
    await saveTournament(tour);
    setTour({ ...tour });
    inTournamentRef.current = false;
    setScreen("tournament");
  }, [tour, eternal]);

  const newTournament = useCallback(() => {
    clearTournament();
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
    if (simRef.current) {
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
    <GestureHandlerRootView style={styles.root}>
      <StatusBar hidden />

      {screen === "start" && (
        <StartScreen
          saveMeta={saveMeta}
          hasTournament={!!tour && tour.phase !== "DONE"}
          onNew={() => setScreen("setup")}
          onContinue={continueSaved}
          onTournament={openTournament}
        />
      )}

      {screen === "setup" && <SetupScreen onStart={startNew} onBack={() => setScreen("start")} />}

      {screen === "profile" && (
        <ProfileScreen onStart={startTournament} onBack={() => setScreen("start")} />
      )}

      {screen === "tournament" && tour && (
        <TournamentScreen
          t={tour}
          onPlayNext={playNextFixture}
          onShowEternal={() => setScreen("eternal")}
          onNewTournament={newTournament}
          onExit={() => setScreen("start")}
        />
      )}

      {screen === "eternal" && (
        <EternalTableScreen table={eternal} onBack={() => setScreen(tour ? "tournament" : "start")} />
      )}

      {screen === "loading" && <LoadingScreen onDone={onLoadingDone} />}

      {screen === "playing" && sim && (
        <View style={styles.root}>
          <GameCanvas sim={sim} onHud={onHud} />

          <Hud hud={hud} foulsEnabled={foulsEnabled} />

          {!paused && !gameOver && <PauseButton onPress={() => togglePause(true)} />}

          <View pointerEvents="box-none" style={styles.controls}>
            <View style={styles.side}>
              <Joystick onMove={(x, z) => sim.input.setMove(x, z)} />
            </View>
            <View style={styles.side}>
              <ActionButtons input={sim.input} onBall={onBall} />
            </View>
          </View>

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
  );
}

function configFromState(s: GameState): MatchConfig {
  return {
    difficulty: s.difficulty,
    fouls: s.foulsEnabled,
    mode: s.mode,
    scoreTarget: s.scoreTarget,
    timeLimit: s.timeLimit,
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
