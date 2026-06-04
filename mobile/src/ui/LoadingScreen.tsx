// LoadingScreen: animated progress bar shown while the match spins up.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useI18n } from "../i18n";

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const done = useRef(false);
  const { t: tr } = useI18n();

  useEffect(() => {
    const startedAt = Date.now();
    const DURATION = 1300;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / DURATION);
      setProgress(t);
      if (t >= 1 && !done.current) {
        done.current = true;
        clearInterval(id);
        onDone();
      }
    }, 30);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>{tr("app.kicker")}</Text>
      <Text style={styles.title}>{tr("app.title")}</Text>
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
      <Text style={styles.tip}>{tr("loading.tip")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018", justifyContent: "center", alignItems: "center" },
  kicker: { color: "#fbbf24", fontSize: 13, fontWeight: "800", letterSpacing: 4 },
  title: { color: "#fff", fontSize: 40, fontWeight: "900", letterSpacing: 2, marginBottom: 30 },
  barOuter: {
    width: 280,
    height: 14,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  barInner: { height: "100%", backgroundColor: "#ef4444", borderRadius: 8 },
  pct: { color: "#e5e7eb", fontSize: 14, fontWeight: "800", marginTop: 10 },
  tip: { color: "#6b7280", fontSize: 12, marginTop: 16 },
});
