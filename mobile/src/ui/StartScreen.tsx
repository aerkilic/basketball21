// StartScreen: landing page — new game, continue a saved game, and a controls recap.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SaveMeta } from "../game/storage";
import { useMenuInsets } from "./layout";
import { useI18n, LangSetting, SUPPORTED_LANGS, LANG_NAMES } from "../i18n";

function LanguagePicker() {
  const { t, setting, setSetting } = useI18n();
  const options: { key: LangSetting; label: string }[] = [
    { key: "system", label: t("lang.system") },
    ...SUPPORTED_LANGS.map((l) => ({ key: l as LangSetting, label: LANG_NAMES[l] })),
  ];
  return (
    <View style={styles.langWrap}>
      <Text style={styles.langLabel}>{t("lang.label")}</Text>
      <View style={styles.langRow}>
        {options.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => setSetting(o.key)}
            style={[styles.langChip, setting === o.key && styles.langChipActive]}
          >
            <Text style={[styles.langChipText, setting === o.key && styles.langChipTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

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
  const { t } = useI18n();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <Text style={styles.kicker}>{t("app.kicker")}</Text>
        <Text style={styles.title}>{t("app.title")}</Text>
        <Text style={styles.sub}>{t("start.sub")}</Text>

        <Pressable style={styles.primary} onPress={onNew}>
          <Text style={styles.primaryText}>{t("start.quickGame")}</Text>
        </Pressable>

        <Pressable style={styles.career} onPress={onTournament}>
          <Text style={styles.careerText}>{t("start.career")}</Text>
          {hasTournament && <Text style={styles.careerMeta}>{t("start.tournamentRunning")}</Text>}
        </Pressable>

        {saveMeta && (
          <Pressable style={styles.secondary} onPress={onContinue}>
            <Text style={styles.secondaryText}>{t("start.continue")}</Text>
            <Text style={styles.secondaryMeta}>
              {saveMeta.scoreUser} : {saveMeta.scoreCpu} ·{" "}
              {saveMeta.timeMode ? t("setup.time") : t("hud.target", { n: saveMeta.scoreTarget })}
            </Text>
          </Pressable>
        )}

        <View style={styles.help}>
          <Text style={styles.helpTitle}>{t("start.controls")}</Text>
          <Text style={styles.helpLine}>{t("start.ctrl1")}</Text>
          <Text style={styles.helpLine}>{t("start.ctrl2")}</Text>
          <Text style={styles.helpLine}>{t("start.ctrl3")}</Text>
          <Text style={styles.helpLine}>{t("start.ctrl4")}</Text>
          <Text style={styles.helpLine}>{t("start.ctrl5")}</Text>
        </View>

        <LanguagePicker />
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
  langWrap: { marginTop: 24, width: "100%", maxWidth: 560, alignItems: "center" },
  langLabel: { color: "#fbbf24", fontWeight: "900", letterSpacing: 2, fontSize: 12, marginBottom: 8 },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  langChipActive: { backgroundColor: "#fbbf24", borderColor: "#fbbf24" },
  langChipText: { color: "#e5e7eb", fontWeight: "800", fontSize: 13 },
  langChipTextActive: { color: "#1a1206" },
});
