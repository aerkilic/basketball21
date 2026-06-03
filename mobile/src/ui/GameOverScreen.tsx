// GameOverScreen: result + rematch / menu.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

export function GameOverScreen({
  winner,
  draw,
  scoreUser,
  scoreCpu,
  onRematch,
  onMenu,
  tournament,
  onContinue,
}: {
  winner: string | null;
  draw: boolean;
  scoreUser: number;
  scoreCpu: number;
  onRematch: () => void;
  onMenu: () => void;
  tournament?: boolean;
  onContinue?: () => void;
}) {
  const won = winner === "USER";
  const head = draw ? "UNENTSCHIEDEN" : won ? "GEWONNEN! 🏆" : "VERLOREN";
  const color = draw ? "#fbbf24" : won ? "#4ade80" : "#f87171";
  return (
    <View style={styles.root}>
      <Text style={[styles.head, { color }]}>{head}</Text>
      <Text style={styles.score}>
        {scoreUser} : {scoreCpu}
      </Text>
      <Text style={styles.sub}>{draw ? "Knapp!" : won ? "Saubere Buckets." : "Nochmal versuchen?"}</Text>
      {tournament ? (
        <View style={styles.row}>
          <Pressable style={[styles.btn, { backgroundColor: "#ef4444" }]} onPress={onContinue}>
            <Text style={styles.btnText}>WEITER ZUM TURNIER ▶</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable style={[styles.btn, { backgroundColor: "#ef4444" }]} onPress={onRematch}>
            <Text style={styles.btnText}>REVANCHE</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: "rgba(255,255,255,0.12)" }]} onPress={onMenu}>
            <Text style={styles.btnText}>MENÜ</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,10,14,0.86)",
    justifyContent: "center",
    alignItems: "center",
  },
  head: { fontSize: 44, fontWeight: "900", letterSpacing: 2 },
  score: { color: "#fff", fontSize: 60, fontWeight: "900", marginVertical: 8, fontVariant: ["tabular-nums"] },
  sub: { color: "#9ca3af", fontSize: 16, marginBottom: 26 },
  row: { flexDirection: "row", gap: 16 },
  btn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 28 },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
});
