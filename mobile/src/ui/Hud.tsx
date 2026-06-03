// Hud: scoreboard, possession, fouls and the big center game message.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { HudSnapshot } from "../render/Scene";

function fmtClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function Hud({ hud, foulsEnabled }: { hud: HudSnapshot; foulsEnabled: boolean }) {
  const userBall = hud.possession === "USER";
  return (
    <View pointerEvents="none" style={styles.root}>
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
            <Text style={styles.target}>BIS {hud.scoreTarget}</Text>
          )}
          {foulsEnabled && (
            <Text style={styles.fouls}>
              Fouls {hud.foulUser} : {hud.foulCpu}
            </Text>
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

      {hud.messages[0] ? (
        <View style={styles.msgWrap}>
          <Text style={styles.msg}>{hud.messages[0]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  board: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "rgba(10,12,16,0.78)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  team: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 110, justifyContent: "center" },
  has: {},
  teamName: { color: "#e5e7eb", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  score: { fontSize: 34, fontWeight: "900", fontVariant: ["tabular-nums"] },
  dot: { color: "#fbbf24", fontSize: 14 },
  middle: { alignItems: "center", marginHorizontal: 14 },
  target: { color: "#fbbf24", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  clock: { color: "#fbbf24", fontSize: 20, fontWeight: "900", fontVariant: ["tabular-nums"] },
  fouls: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  msgWrap: {
    marginTop: 18,
    backgroundColor: "rgba(250,204,21,0.92)",
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 12,
  },
  msg: { color: "#1a1206", fontSize: 22, fontWeight: "900", letterSpacing: 1 },
});
