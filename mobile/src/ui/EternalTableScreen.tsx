// EternalTableScreen: the all-time ("ewige Tabelle") standings across all tournaments.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { EternalRow, eternalSorted, teamById } from "../game/tournament";
import { useMenuInsets } from "./layout";
import { useI18n } from "../i18n";

export function EternalTableScreen({
  table,
  onBack,
}: {
  table: Record<string, EternalRow>;
  onBack: () => void;
}) {
  const rows = eternalSorted(table);
  const pad = useMenuInsets();
  const { t } = useI18n();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>{t("common.back")}</Text>
          </Pressable>
          <Text style={styles.title}>{t("eternal.title")}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.thead}>
          <Text style={[styles.th, styles.cClub]}>{t("table.club")}</Text>
          <Text style={styles.th}>{t("table.played")}</Text>
          <Text style={styles.th}>{t("table.won")}</Text>
          <Text style={styles.th}>{t("table.lost")}</Text>
          <Text style={styles.th}>🏆</Text>
          <Text style={[styles.th, styles.cPts]}>{t("table.points")}</Text>
        </View>
        {rows.map((r, i) => (
          <View key={r.teamId} style={styles.tr}>
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={[styles.cClub, styles.clubCell]}>
              <View style={[styles.swatch, { backgroundColor: teamById(r.teamId).color }]} />
              <Text style={styles.clubName} numberOfLines={1}>
                {teamById(r.teamId).city}
              </Text>
            </View>
            <Text style={styles.td}>{r.played}</Text>
            <Text style={styles.td}>{r.won}</Text>
            <Text style={styles.td}>{r.lost}</Text>
            <Text style={styles.td}>{r.titles}</Text>
            <Text style={[styles.td, styles.cPts, styles.pts]}>{r.points}</Text>
          </View>
        ))}
        <Text style={styles.note}>{t("eternal.note")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { paddingVertical: 22, paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  back: { paddingVertical: 6 },
  backText: { color: "#93c5fd", fontSize: 15, fontWeight: "700" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  thead: { flexDirection: "row", alignItems: "center", paddingBottom: 8, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  th: { color: "#9ca3af", fontSize: 12, fontWeight: "800", width: 34, textAlign: "center" },
  cClub: { flex: 1, textAlign: "left", marginLeft: 26 },
  cPts: { width: 44 },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  rank: { color: "#6b7280", fontSize: 13, fontWeight: "800", width: 22, textAlign: "center" },
  clubCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  clubName: { color: "#e5e7eb", fontSize: 15, fontWeight: "700", flex: 1 },
  td: { color: "#e5e7eb", fontSize: 13, width: 34, textAlign: "center" },
  pts: { fontWeight: "900", color: "#fff" },
  note: { color: "#6b7280", fontSize: 11, marginTop: 16, textAlign: "center" },
});
