// StartScreen: landing page — new game, continue a saved game, and a controls recap.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SaveMeta } from "../game/storage";
import { useMenuInsets } from "./layout";

export function StartScreen({
  saveMeta,
  hasTournament,
  onNew,
  onContinue,
  onTournament,
}: {
  saveMeta: SaveMeta | null;
  hasTournament: boolean;
  onNew: () => void;
  onContinue: () => void;
  onTournament: () => void;
}) {
  const pad = useMenuInsets();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <Text style={styles.kicker}>STREET BASKETBALL</Text>
        <Text style={styles.title}>BASKETBALL 21</Text>
        <Text style={styles.sub}>2 gegen 2 · ein Korb · dein Court</Text>

        <Pressable style={styles.primary} onPress={onNew}>
          <Text style={styles.primaryText}>SCHNELLES SPIEL ▶</Text>
        </Pressable>

        <Pressable style={styles.career} onPress={onTournament}>
          <Text style={styles.careerText}>🏆 KARRIERE / TURNIER</Text>
          {hasTournament && <Text style={styles.careerMeta}>Turnier läuft — fortsetzen</Text>}
        </Pressable>

        {saveMeta && (
          <Pressable style={styles.secondary} onPress={onContinue}>
            <Text style={styles.secondaryText}>WEITERSPIELEN</Text>
            <Text style={styles.secondaryMeta}>
              {saveMeta.scoreUser} : {saveMeta.scoreCpu} · {saveMeta.mode}
            </Text>
          </Pressable>
        )}

        <View style={styles.help}>
          <Text style={styles.helpTitle}>STEUERUNG</Text>
          <Text style={styles.helpLine}>Joystick (links) laufen · W Sprint · X Crossover</Text>
          <Text style={styles.helpLine}>T = Trick (Zufall: No-Look-/Beine-Pass oder Drive zum Korb)</Text>
          <Text style={styles.helpLine}>Angriff: D halten = Wurf (Timing!) · S Pass · A Korbangriff</Text>
          <Text style={styles.helpLine}>Abwehr: A Block · D Steal · S Spieler wechseln</Text>
          <Text style={styles.helpLine}>Pause: oben rechts</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  kicker: { color: "#fbbf24", fontSize: 14, fontWeight: "800", letterSpacing: 4 },
  title: { color: "#fff", fontSize: 50, fontWeight: "900", letterSpacing: 2, marginTop: 4 },
  sub: { color: "#9ca3af", fontSize: 14, marginTop: 6, marginBottom: 24 },
  primary: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 54,
    paddingVertical: 18,
    borderRadius: 32,
    marginTop: 6,
  },
  primaryText: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: 2 },
  career: {
    marginTop: 14,
    backgroundColor: "rgba(251,191,36,0.16)",
    borderWidth: 1,
    borderColor: "#fbbf24",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  careerText: { color: "#fbbf24", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  careerMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  secondary: {
    marginTop: 16,
    backgroundColor: "rgba(37,99,235,0.18)",
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  secondaryText: { color: "#93c5fd", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  secondaryMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  help: {
    marginTop: 30,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    width: "100%",
    maxWidth: 560,
  },
  helpTitle: { color: "#fbbf24", fontWeight: "900", letterSpacing: 2, marginBottom: 8 },
  helpLine: { color: "#cbd5e1", fontSize: 13, marginVertical: 2 },
});
