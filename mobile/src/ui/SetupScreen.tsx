// SetupScreen: pick mode (points/time), score/time amount, difficulty, fouls,
// both teams (player selection) and jerseys, then start.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import {
  Difficulty,
  GameMode,
  MatchConfig,
  DEFAULT_CONFIG,
  JERSEYS,
  SCORE_OPTIONS,
  TIME_OPTIONS,
  TEAM_PRESETS,
} from "../game/constants";
import { useMenuInsets } from "./layout";

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Swatch({ color, active, onPress }: { color: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.swatch, { backgroundColor: color }, active && styles.swatchActive]}
    />
  );
}

export function SetupScreen({
  onStart,
  onBack,
}: {
  onStart: (c: MatchConfig) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<GameMode>(DEFAULT_CONFIG.mode);
  const [score, setScore] = useState(DEFAULT_CONFIG.scoreTarget);
  const [minutes, setMinutes] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_CONFIG.difficulty);
  const [fouls, setFouls] = useState(DEFAULT_CONFIG.fouls);
  const [userTeam, setUserTeam] = useState(0);
  const [cpuTeam, setCpuTeam] = useState(3);
  const [userJersey, setUserJersey] = useState(DEFAULT_CONFIG.userTeam.jersey);
  const [cpuJersey, setCpuJersey] = useState(DEFAULT_CONFIG.cpuTeam.jersey);
  const pad = useMenuInsets();

  const start = () => {
    const cfg: MatchConfig = {
      difficulty,
      fouls,
      mode,
      scoreTarget: mode === "score" ? score : 21,
      timeLimit: mode === "time" ? minutes * 60 : DEFAULT_CONFIG.timeLimit,
      userTeam: { players: TEAM_PRESETS[userTeam].players, jersey: userJersey },
      cpuTeam: { players: TEAM_PRESETS[cpuTeam].players, jersey: cpuJersey },
    };
    onStart(cfg);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>‹ Zurück</Text>
          </Pressable>
          <Text style={styles.title}>SPIEL EINRICHTEN</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.section}>Spielmodus</Text>
        <View style={styles.row}>
          <Chip label="PUNKTE" active={mode === "score"} onPress={() => setMode("score")} />
          <Chip label="ZEIT" active={mode === "time"} onPress={() => setMode("time")} />
        </View>

        {mode === "score" ? (
          <>
            <Text style={styles.section}>Bis wie viele Punkte?</Text>
            <View style={styles.row}>
              {SCORE_OPTIONS.map((s) => (
                <Chip key={s} label={`${s}`} active={score === s} onPress={() => setScore(s)} />
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>Spielzeit</Text>
            <View style={styles.row}>
              {TIME_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  label={`${m} min`}
                  active={minutes === m}
                  onPress={() => setMinutes(m)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.section}>Schwierigkeit</Text>
        <View style={styles.row}>
          {(["EASY", "NORMAL", "HARD"] as Difficulty[]).map((d) => (
            <Chip
              key={d}
              label={d === "EASY" ? "LEICHT" : d === "NORMAL" ? "NORMAL" : "SCHWER"}
              active={difficulty === d}
              onPress={() => setDifficulty(d)}
            />
          ))}
        </View>

        <Text style={styles.section}>Fouls</Text>
        <View style={styles.row}>
          <Chip label="AN" active={fouls} onPress={() => setFouls(true)} />
          <Chip label="AUS" active={!fouls} onPress={() => setFouls(false)} />
        </View>

        <Text style={styles.section}>Dein Team</Text>
        <View style={styles.teamRow}>
          {TEAM_PRESETS.map((t, i) => (
            <Pressable
              key={t.name}
              onPress={() => setUserTeam(i)}
              style={[styles.teamCard, userTeam === i && styles.teamCardActive]}
            >
              <Text style={[styles.teamName, userTeam === i && styles.teamNameActive]}>{t.name}</Text>
              <Text style={styles.teamDesc}>{t.desc}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Dein Trikot</Text>
        <View style={styles.row}>
          {JERSEYS.map((j) => (
            <Swatch
              key={j.color}
              color={j.color}
              active={userJersey === j.color}
              onPress={() => setUserJersey(j.color)}
            />
          ))}
        </View>

        <Text style={styles.section}>Gegner</Text>
        <View style={styles.teamRow}>
          {TEAM_PRESETS.map((t, i) => (
            <Pressable
              key={t.name}
              onPress={() => setCpuTeam(i)}
              style={[styles.teamCard, cpuTeam === i && styles.teamCardActive]}
            >
              <Text style={[styles.teamName, cpuTeam === i && styles.teamNameActive]}>{t.name}</Text>
              <Text style={styles.teamDesc}>{t.desc}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Gegner-Trikot</Text>
        <View style={styles.row}>
          {JERSEYS.map((j) => (
            <Swatch
              key={j.color}
              color={j.color}
              active={cpuJersey === j.color}
              onPress={() => setCpuJersey(j.color)}
            />
          ))}
        </View>

        <Pressable style={styles.play} onPress={start}>
          <Text style={styles.playText}>STARTEN ▶</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { paddingVertical: 24, paddingHorizontal: 22, alignItems: "stretch" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { paddingVertical: 6, paddingRight: 10 },
  backText: { color: "#93c5fd", fontSize: 15, fontWeight: "700" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  section: { color: "#fbbf24", fontSize: 13, fontWeight: "900", letterSpacing: 2, marginTop: 20 },
  label: { color: "#cbd5e1", fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 2 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  chipActive: { backgroundColor: "#fbbf24", borderColor: "#fbbf24" },
  chipText: { color: "#e5e7eb", fontWeight: "800", letterSpacing: 1 },
  chipTextActive: { color: "#1a1206" },
  teamRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  teamCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    minWidth: 120,
  },
  teamCardActive: { borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.14)" },
  teamName: { color: "#e5e7eb", fontWeight: "900", fontSize: 15 },
  teamNameActive: { color: "#fbbf24" },
  teamDesc: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  swatchActive: { borderColor: "#fff", borderWidth: 3, transform: [{ scale: 1.12 }] },
  play: {
    marginTop: 30,
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  playText: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 },
});
