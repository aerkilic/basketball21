// ProfileScreen: enter a nickname and pick your club for a new tournament.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";
import { Profile, LEAGUE_IDS, LEAGUES, leagueForLang } from "../game/tournament";
import { useMenuInsets } from "./layout";
import { useI18n } from "../i18n";

export function ProfileScreen({
  onStart,
  onBack,
}: {
  onStart: (p: Profile, leagueId: string) => void;
  onBack: () => void;
}) {
  const [nick, setNick] = useState("");
  const { t, lang } = useI18n();
  const [leagueId, setLeagueId] = useState(() => leagueForLang(lang).id);
  const [teamId, setTeamId] = useState<string | null>(null);
  const pad = useMenuInsets();

  const league = LEAGUES[leagueId] ?? leagueForLang(lang);
  const ready = nick.trim().length > 0 && teamId;

  const selectLeague = (id: string) => {
    if (id === leagueId) return;
    setLeagueId(id);
    setTeamId(null);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>{t("common.back")}</Text>
          </Pressable>
          <Text style={styles.title}>{t("profile.title")}</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.label}>{t("profile.nickname")}</Text>
        <TextInput
          style={styles.input}
          value={nick}
          onChangeText={setNick}
          placeholder={t("profile.nicknamePh")}
          placeholderTextColor="#6b7280"
          maxLength={14}
        />

        <Text style={styles.section}>{t("profile.league")}</Text>
        <View style={styles.leagueRow}>
          {LEAGUE_IDS.map((id) => (
            <Pressable
              key={id}
              onPress={() => selectLeague(id)}
              style={[styles.leagueChip, league.id === id && styles.leagueChipActive]}
            >
              <Text style={[styles.leagueChipText, league.id === id && styles.leagueChipTextActive]}>
                {t(`league.${id}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{t("profile.club")}</Text>
        <View style={styles.grid}>
          {league.teams.map((tm) => (
            <Pressable
              key={tm.id}
              onPress={() => setTeamId(tm.id)}
              style={[styles.team, teamId === tm.id && styles.teamActive]}
            >
              <View style={[styles.swatch, { backgroundColor: tm.color }]} />
              <Text style={[styles.teamCity, teamId === tm.id && styles.teamCityActive]}>{tm.city}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.play, !ready && styles.playOff]}
          disabled={!ready}
          onPress={() => onStart({ nickname: nick.trim(), teamId: teamId! }, league.id)}
        >
          <Text style={styles.playText}>{t("profile.start")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { paddingVertical: 24, paddingHorizontal: 22 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { paddingVertical: 6, paddingRight: 10 },
  backText: { color: "#93c5fd", fontSize: 15, fontWeight: "700" },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: 2 },
  label: { color: "#cbd5e1", fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  section: { color: "#fbbf24", fontSize: 13, fontWeight: "900", letterSpacing: 2, marginTop: 20 },
  leagueRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  leagueChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  leagueChipActive: { backgroundColor: "#fbbf24", borderColor: "#fbbf24" },
  leagueChipText: { color: "#e5e7eb", fontWeight: "800", fontSize: 13 },
  leagueChipTextActive: { color: "#1a1206" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    minWidth: 130,
  },
  teamActive: { borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.14)" },
  swatch: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  teamCity: { color: "#e5e7eb", fontWeight: "800", fontSize: 15 },
  teamCityActive: { color: "#fbbf24" },
  play: {
    marginTop: 28,
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  playOff: { backgroundColor: "rgba(255,255,255,0.12)" },
  playText: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
});
