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

// perceived brightness of a #rrggbb colour (0..1)
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// a coloured score; very dark team colours get a white "bubble" so the number reads
function Score({ value, color }: { value: number; color: string }) {
  const dark = luminance(color) < 0.28;
  if (dark) {
    return (
      <View style={styles.scoreBubble}>
        <Text style={[styles.score, { color }]}>{value}</Text>
      </View>
    );
  }
  return <Text style={[styles.score, { color }]}>{value}</Text>;
}

export function Hud({ hud, foulsEnabled }: { hud: HudSnapshot; foulsEnabled: boolean }) {
  const userBall = hud.possession === "USER";
  const { t } = useI18n();

  // scoreboard order: HOME team on the left, AWAY team on the right
  const user = { name: hud.userName, score: hud.scoreUser, color: hud.userColor, ball: userBall, fouls: hud.foulUser };
  const cpu = { name: hud.cpuName, score: hud.scoreCpu, color: hud.cpuColor, ball: !userBall, fouls: hud.foulCpu };
  const home = hud.homeIsUser ? user : cpu;
  const away = hud.homeIsUser ? cpu : user;

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
          <View style={[styles.team, home.ball && styles.has]}>
            <Text style={styles.teamName}>{home.name} 🏠</Text>
            <Score value={home.score} color={home.color} />
            {home.ball && <Text style={styles.dot}>●</Text>}
          </View>
          <View style={styles.middle}>
            {hud.mode === "time" ? (
              <Text style={styles.clock}>{fmtClock(hud.clock)}</Text>
            ) : (
              <Text style={styles.target}>{t("hud.target", { n: hud.scoreTarget })}</Text>
            )}
            {foulsEnabled && (
              <Text style={styles.fouls}>{t("hud.fouls", { a: home.fouls, b: away.fouls })}</Text>
            )}
          </View>
          <View style={[styles.team, away.ball && styles.has]}>
            {away.ball && <Text style={styles.dot}>●</Text>}
            <Score value={away.score} color={away.color} />
            <Text style={styles.teamName}>{away.name}</Text>
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
  scoreBubble: {
    backgroundColor: "#fff",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
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
