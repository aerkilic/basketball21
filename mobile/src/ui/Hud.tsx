// Hud: scoreboard, possession, fouls and the big center game message.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { HudSnapshot } from "../render/Scene";
import { useI18n, TFunc } from "../i18n";

// localize an in-game message, resolving team codes in {by}/{to}/{who} params
function renderMessage(
  t: TFunc,
  hud: HudSnapshot,
  m: { key: string; params?: Record<string, string | number> }
): string {
  const p: Record<string, string | number> = { ...(m.params ?? {}) };
  for (const k of ["by", "to", "who"]) {
    if (p[k] === "USER") p[k] = hud.userName;
    else if (p[k] === "CPU") p[k] = hud.cpuName;
  }
  return t(m.key, p);
}

function fmtClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function Hud({ hud, foulsEnabled }: { hud: HudSnapshot; foulsEnabled: boolean }) {
  const userBall = hud.possession === "USER";
  const { t } = useI18n();
  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.topRow}>
        {/* hints (foul / traveling / points …) to the LEFT of the scoreboard */}
        <View style={styles.msgSide}>
          {hud.messages[0] ? (
            <View style={styles.msgWrap}>
              <Text style={styles.msg}>{renderMessage(t, hud, hud.messages[0])}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.board}>
          <View style={[styles.team, userBall && styles.has]}>
            <Text style={styles.teamName}>
              {hud.userName}
              {hud.homeIsUser ? " 🏠" : ""}
            </Text>
            <Text style={[styles.score, { color: "#60a5fa" }]}>{hud.scoreUser}</Text>
            {userBall && <Text style={styles.dot}>●</Text>}
          </View>
          <View style={styles.middle}>
            {hud.mode === "time" ? (
              <Text style={styles.clock}>{fmtClock(hud.clock)}</Text>
            ) : (
              <Text style={styles.target}>{t("hud.target", { n: hud.scoreTarget })}</Text>
            )}
            {foulsEnabled && (
              <Text style={styles.fouls}>{t("hud.fouls", { a: hud.foulUser, b: hud.foulCpu })}</Text>
            )}
          </View>
          <View style={[styles.team, !userBall && styles.has]}>
            {!userBall && <Text style={styles.dot}>●</Text>}
            <Text style={[styles.score, { color: "#f87171" }]}>{hud.scoreCpu}</Text>
            <Text style={styles.teamName}>
              {hud.cpuName}
              {!hud.homeIsUser ? " 🏠" : ""}
            </Text>
          </View>
        </View>

        {/* spacer mirrors the hint column so the scoreboard stays centred */}
        <View style={styles.msgSide} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 10,
  },
  msgSide: { flex: 1, alignItems: "flex-end", justifyContent: "center" },
  board: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10,12,16,0.78)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  team: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 78, justifyContent: "center" },
  has: {},
  teamName: { color: "#e5e7eb", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  score: { fontSize: 24, fontWeight: "900", fontVariant: ["tabular-nums"] },
  dot: { color: "#fbbf24", fontSize: 11 },
  middle: { alignItems: "center", marginHorizontal: 10 },
  target: { color: "#fbbf24", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  clock: { color: "#fbbf24", fontSize: 16, fontWeight: "900", fontVariant: ["tabular-nums"] },
  fouls: { color: "#9ca3af", fontSize: 10, marginTop: 1 },
  msgWrap: {
    backgroundColor: "rgba(250,204,21,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 10,
  },
  msg: { color: "#1a1206", fontSize: 16, fontWeight: "900", letterSpacing: 0.5, textAlign: "right" },
});
