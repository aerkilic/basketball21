// PauseMenu: overlay shown when the game is paused (top-right pause button).
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useI18n } from "../i18n";

export function PauseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.pauseBtn} hitSlop={10}>
      <View style={styles.bar} />
      <View style={styles.bar} />
    </Pressable>
  );
}

export function PauseMenu({
  onResume,
  onSave,
  onQuit,
}: {
  onResume: () => void;
  onSave: () => Promise<void> | void;
  onQuit: () => void;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const doSave = async () => {
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("pause.title")}</Text>
        <Pressable style={[styles.btn, { backgroundColor: "#ef4444" }]} onPress={onResume}>
          <Text style={styles.btnText}>{t("pause.resume")}</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: "#2563eb" }]} onPress={doSave}>
          <Text style={styles.btnText}>{saved ? t("pause.saved") : t("pause.save")}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
          onPress={async () => {
            await onSave();
            onQuit();
          }}
        >
          <Text style={styles.btnText}>{t("pause.saveQuit")}</Text>
        </Pressable>
        <Pressable style={styles.quit} onPress={onQuit}>
          <Text style={styles.quitText}>{t("pause.quitNoSave")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pauseBtn: {
    position: "absolute",
    top: 16,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(10,12,16,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    zIndex: 50,
  },
  bar: { width: 5, height: 16, borderRadius: 2, backgroundColor: "#e5e7eb" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,10,14,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  card: {
    backgroundColor: "#11161f",
    borderRadius: 20,
    padding: 26,
    width: 320,
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 22,
  },
  btn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginBottom: 12 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  quit: { alignItems: "center", marginTop: 4 },
  quitText: { color: "#9ca3af", fontSize: 13 },
});
