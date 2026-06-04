// SetupScreen: pick mode (points/time), score/time amount, difficulty,
// both teams (player selection) and jerseys, then start.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import {
  Difficulty,
  GameMode,
  BackdropKind,
  SpecialBackdropKind,
  MatchConfig,
  DEFAULT_CONFIG,
  JERSEYS,
  SCORE_OPTIONS,
  TIME_OPTIONS,
  TEAM_PRESETS,
} from "../game/constants";
import { backdropForTeam } from "../game/cityBackgrounds";
import { LEAGUE_IDS, LEAGUES, Team, leagueForLang } from "../game/tournament";
import { useMenuInsets } from "./layout";
import { useI18n } from "../i18n";

// preset name -> description translation key
const DESC_KEY: Record<string, string> = {
  Classic: "teamdesc.classic",
  "Twin Towers": "teamdesc.towers",
  Speed: "teamdesc.speed",
  Allround: "teamdesc.allround",
};

const SPECIAL_BACKDROPS: SpecialBackdropKind[] = [
  "classic",
  "cappadocia",
  "novisad",
  "beach",
  "erciyes",
  "petrovaradin",
];

type BackdropSelection = "auto" | SpecialBackdropKind;

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
  const { t, lang } = useI18n();
  const [opponentLeagueId, setOpponentLeagueId] = useState(() => leagueForLang(lang).id);
  const [opponentTeamId, setOpponentTeamId] = useState(() => leagueForLang(lang).teams[0].id);
  const [backdrop, setBackdrop] = useState<BackdropSelection>("auto");
  const [userTeam, setUserTeam] = useState(0);
  const [userJersey, setUserJersey] = useState(DEFAULT_CONFIG.userTeam.jersey);
  const pad = useMenuInsets();
  const opponentLeague = LEAGUES[opponentLeagueId] ?? leagueForLang(lang);
  const opponent = opponentLeague.teams.find((team) => team.id === opponentTeamId) ?? opponentLeague.teams[0];

  const selectOpponentLeague = (id: string) => {
    const league = LEAGUES[id] ?? opponentLeague;
    setOpponentLeagueId(league.id);
    setOpponentTeamId(league.teams[0].id);
  };

  const start = () => {
    const opponentBackdrop: BackdropKind = backdrop === "auto" ? backdropForTeam(opponent.id) : backdrop;
    const cfg: MatchConfig = {
      difficulty,
      fouls: true,
      backdrop: opponentBackdrop,
      mode,
      scoreTarget: mode === "score" ? score : 21,
      timeLimit: mode === "time" ? minutes * 60 : DEFAULT_CONFIG.timeLimit,
      userTeam: { players: TEAM_PRESETS[userTeam].players, jersey: userJersey },
      cpuTeam: { players: opponent.players, jersey: opponent.color },
      userName: t("team.you"),
      cpuName: opponent.city,
      homeIsUser: false,
    };
    onStart(cfg);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>{t("common.back")}</Text>
          </Pressable>
          <Text style={styles.title}>{t("setup.title")}</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.section}>{t("setup.mode")}</Text>
        <View style={styles.row}>
          <Chip label={t("setup.points")} active={mode === "score"} onPress={() => setMode("score")} />
          <Chip label={t("setup.time")} active={mode === "time"} onPress={() => setMode("time")} />
        </View>

        {mode === "score" ? (
          <>
            <Text style={styles.section}>{t("setup.toPoints")}</Text>
            <View style={styles.row}>
              {SCORE_OPTIONS.map((s) => (
                <Chip key={s} label={`${s}`} active={score === s} onPress={() => setScore(s)} />
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>{t("setup.playTime")}</Text>
            <View style={styles.row}>
              {TIME_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  label={t("setup.minSuffix", { m })}
                  active={minutes === m}
                  onPress={() => setMinutes(m)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.section}>{t("setup.difficulty")}</Text>
        <View style={styles.row}>
          {(["EASY", "NORMAL", "HARD"] as Difficulty[]).map((d) => (
            <Chip
              key={d}
              label={d === "EASY" ? t("diff.easy") : d === "NORMAL" ? t("diff.normal") : t("diff.hard")}
              active={difficulty === d}
              onPress={() => setDifficulty(d)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("setup.yourTeam")}</Text>
        <View style={styles.teamRow}>
          {TEAM_PRESETS.map((preset, i) => (
            <Pressable
              key={preset.name}
              onPress={() => setUserTeam(i)}
              style={[styles.teamCard, userTeam === i && styles.teamCardActive]}
            >
              <Text style={[styles.teamName, userTeam === i && styles.teamNameActive]}>{preset.name}</Text>
              <Text style={styles.teamDesc}>{t(DESC_KEY[preset.name] ?? "")}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t("setup.yourJersey")}</Text>
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

        <Text style={styles.section}>{t("setup.opponent")}</Text>
        <Text style={styles.label}>{t("setup.opponentCountry")}</Text>
        <View style={styles.row}>
          {LEAGUE_IDS.map((id) => (
            <Chip
              key={id}
              label={t(`league.${id}`)}
              active={opponentLeague.id === id}
              onPress={() => selectOpponentLeague(id)}
            />
          ))}
        </View>
        <Text style={styles.label}>{t("setup.opponentTeam")}</Text>
        <View style={styles.teamRow}>
          {opponentLeague.teams.map((team: Team) => (
            <Pressable
              key={team.id}
              onPress={() => setOpponentTeamId(team.id)}
              style={[styles.teamCard, opponent.id === team.id && styles.teamCardActive]}
            >
              <View style={styles.teamTitleRow}>
                <View style={[styles.miniSwatch, { backgroundColor: team.color }]} />
                <Text style={[styles.teamName, opponent.id === team.id && styles.teamNameActive]}>{team.city}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{t("setup.backdrop")}</Text>
        <View style={styles.row}>
          <Chip label={t("setup.autoBackdrop")} active={backdrop === "auto"} onPress={() => setBackdrop("auto")} />
          {SPECIAL_BACKDROPS.map((kind) => (
            <Chip
              key={kind}
              label={t(`backdrop.${kind}`)}
              active={backdrop === kind}
              onPress={() => setBackdrop(kind)}
            />
          ))}
        </View>

        <Pressable style={styles.play} onPress={start}>
          <Text style={styles.playText}>{t("setup.start")}</Text>
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
  teamTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniSwatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
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
