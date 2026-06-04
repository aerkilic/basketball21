// CareerHubScreen: shown when the player taps Career/Tournament. Lists the saved
// tournaments (up to 5) to continue, plus a button to start a new one.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Tournament, teamById, tournamentRules } from "../game/tournament";
import { MAX_TOURNAMENTS } from "../game/storage";
import { useMenuInsets } from "./layout";
import { useI18n, TFunc } from "../i18n";

function statusLabel(t: Tournament, tr: TFunc): string {
  if (t.phase === "DONE") {
    return `🏆 ${t.championId ? teamById(t.championId).city : ""}`.trim();
  }
  if (t.phase === "QF") return tr("tour.quarterfinal");
  if (t.phase === "SF") return tr("tour.semifinal");
  if (t.phase === "FINAL") return tr("tour.final");
  return tr("tour.groupPhase", { r: t.round, n: t.rounds });
}

function ruleLabel(t: Tournament, tr: TFunc): string {
  const rules = tournamentRules(t);
  if (rules.mode === "time") return tr("setup.minSuffix", { m: Math.round(rules.timeLimit / 60) });
  return tr("hud.target", { n: rules.scoreTarget });
}

export function CareerHubScreen({
  tournaments,
  onContinue,
  onNew,
  onBack,
}: {
  tournaments: Tournament[];
  onContinue: (t: Tournament) => void;
  onNew: () => void;
  onBack: () => void;
}) {
  const pad = useMenuInsets();
  const { t: tr } = useI18n();
  const full = tournaments.length >= MAX_TOURNAMENTS;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>{tr("common.menu")}</Text>
          </Pressable>
          <Text style={styles.title}>{tr("hub.title")}</Text>
          <View style={{ width: 60 }} />
        </View>

        {tournaments.length === 0 ? (
          <Text style={styles.empty}>{tr("hub.empty")}</Text>
        ) : (
          tournaments.map((t) => (
            <Pressable key={t.id} style={styles.card} onPress={() => onContinue(t)}>
              <View style={[styles.swatch, { backgroundColor: teamById(t.profile.teamId).color }]} />
              <View style={styles.cardMid}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {t.profile.nickname} · {teamById(t.profile.teamId).city}
                </Text>
                <Text style={styles.cardStatus}>{statusLabel(t, tr)} · {ruleLabel(t, tr)}</Text>
              </View>
              <Text style={styles.continue}>{tr("hub.continue")} ›</Text>
            </Pressable>
          ))
        )}

        <Pressable style={styles.new} onPress={onNew}>
          <Text style={styles.newText}>{tr("hub.new")}</Text>
        </Pressable>
        {full && <Text style={styles.slots}>{tr("hub.slots")}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { paddingVertical: 22, paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  back: { paddingVertical: 6 },
  backText: { color: "#93c5fd", fontSize: 15, fontWeight: "700" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  empty: { color: "#9ca3af", fontSize: 14, textAlign: "center", marginVertical: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  swatch: { width: 26, height: 26, borderRadius: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  cardMid: { flex: 1 },
  cardName: { color: "#e5e7eb", fontSize: 16, fontWeight: "800" },
  cardStatus: { color: "#fbbf24", fontSize: 12, fontWeight: "700", marginTop: 2 },
  continue: { color: "#93c5fd", fontSize: 14, fontWeight: "800" },
  new: {
    marginTop: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 15,
    borderRadius: 28,
    alignItems: "center",
  },
  newText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  slots: { color: "#6b7280", fontSize: 11, textAlign: "center", marginTop: 12 },
});
