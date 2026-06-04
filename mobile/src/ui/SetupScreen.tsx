// SetupScreen: pick mode (points/time), score/time amount, difficulty, then your
// team and the opponent — each chosen by country flag → city — and the scenery.
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
} from "../game/constants";
import { backdropForTeam } from "../game/cityBackgrounds";
import { LEAGUE_IDS, LEAGUES, Team, leagueForLang } from "../game/tournament";
import { useMenuInsets } from "./layout";
import { useI18n } from "../i18n";

// country flags for the league picker
const FLAGS: Record<string, string> = {
  de: "🇩🇪",
  tr: "🇹🇷",
  sr: "🇷🇸",
  uk: "🇺🇦",
  europe: "🇪🇺",
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

const leagueOf = (id: string): { id: string; teams: Team[] } => LEAGUES[id] ?? LEAGUES.de;

// Country flag row -> city cards. Used for both the player's team and the opponent.
function CountryTeamPicker({
  leagueId,
  teamId,
  onLeague,
  onTeam,
}: {
  leagueId: string;
  teamId: string;
  onLeague: (id: string) => void;
  onTeam: (id: string) => void;
}) {
  const { t } = useI18n();
  const league = leagueOf(leagueId);
  return (
    <>
      <View style={styles.flagRow}>
        {LEAGUE_IDS.map((id) => {
          const active = league.id === id;
          return (
            <Pressable
              key={id}
              onPress={() => onLeague(id)}
              style={[styles.flagChip, active && styles.flagChipActive]}
            >
              <Text style={styles.flag}>{FLAGS[id]}</Text>
              <Text style={[styles.flagText, active && styles.flagTextActive]}>{t(`league.${id}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.teamRow}>
        {league.teams.map((team) => {
          const active = teamId === team.id;
          return (
            <Pressable
              key={team.id}
              onPress={() => onTeam(team.id)}
              style={[styles.cityCard, active && styles.cityCardActive]}
            >
              <View style={[styles.miniSwatch, { backgroundColor: team.color }]} />
              <Text style={[styles.cityName, active && styles.cityNameActive]}>{team.city}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export function SetupScreen({
  onStart,
  onBack,
}: {
  onStart: (c: MatchConfig) => void;
  onBack: () => void;
}) {
  const { t, lang } = useI18n();
  const home = leagueForLang(lang);

  const [mode, setMode] = useState<GameMode>(DEFAULT_CONFIG.mode);
  const [score, setScore] = useState(DEFAULT_CONFIG.scoreTarget);
  const [minutes, setMinutes] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_CONFIG.difficulty);

  const [userLeagueId, setUserLeagueId] = useState(home.id);
  const [userTeamId, setUserTeamId] = useState(home.teams[0].id);
  const [oppLeagueId, setOppLeagueId] = useState(home.id);
  const [oppTeamId, setOppTeamId] = useState((home.teams[1] ?? home.teams[0]).id);
  const [backdrop, setBackdrop] = useState<BackdropSelection>("auto");
  const pad = useMenuInsets();

  const userTeam = leagueOf(userLeagueId).teams.find((x) => x.id === userTeamId) ?? leagueOf(userLeagueId).teams[0];
  const opponent = leagueOf(oppLeagueId).teams.find((x) => x.id === oppTeamId) ?? leagueOf(oppLeagueId).teams[0];

  const selectLeague = (setLeague: (id: string) => void, setTeam: (id: string) => void) => (id: string) => {
    setLeague(id);
    setTeam(leagueOf(id).teams[0].id);
  };

  const start = () => {
    // your team keeps its real colour; if both clubs share it, recolour the OPPONENT
    let oppColor = opponent.color;
    if (oppColor.toLowerCase() === userTeam.color.toLowerCase()) {
      oppColor = JERSEYS.find((j) => j.color.toLowerCase() !== userTeam.color.toLowerCase())?.color ?? oppColor;
    }
    // your team is named first -> it is the home side; AUTO scenery uses your city
    const venueBackdrop: BackdropKind = backdrop === "auto" ? backdropForTeam(userTeam.id) : backdrop;
    const cfg: MatchConfig = {
      difficulty,
      fouls: true,
      backdrop: venueBackdrop,
      mode,
      scoreTarget: mode === "score" ? score : 21,
      timeLimit: mode === "time" ? minutes * 60 : DEFAULT_CONFIG.timeLimit,
      userTeam: { players: userTeam.players, jersey: userTeam.color },
      cpuTeam: { players: opponent.players, jersey: oppColor },
      userName: userTeam.city,
      cpuName: opponent.city,
      homeIsUser: true,
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
        <CountryTeamPicker
          leagueId={userLeagueId}
          teamId={userTeamId}
          onLeague={selectLeague(setUserLeagueId, setUserTeamId)}
          onTeam={setUserTeamId}
        />

        <Text style={styles.section}>{t("setup.opponent")}</Text>
        <CountryTeamPicker
          leagueId={oppLeagueId}
          teamId={oppTeamId}
          onLeague={selectLeague(setOppLeagueId, setOppTeamId)}
          onTeam={setOppTeamId}
        />

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
  // flag picker
  flagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  flagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  flagChipActive: { borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.16)" },
  flag: { fontSize: 18 },
  flagText: { color: "#cbd5e1", fontWeight: "800", fontSize: 13 },
  flagTextActive: { color: "#fbbf24" },
  // city cards
  teamRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  cityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  cityCardActive: { borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.14)" },
  miniSwatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  cityName: { color: "#e5e7eb", fontWeight: "800", fontSize: 14 },
  cityNameActive: { color: "#fbbf24" },
  play: {
    marginTop: 30,
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  playText: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 },
});
