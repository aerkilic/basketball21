// TournamentScreen: the career hub — group tables, knockout bracket, next match.
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import {
  Tournament,
  groupStandings,
  getPlayerFixture,
  teamById,
  StandRow,
  Fixture,
  GroupKey,
} from "../game/tournament";
import { useMenuInsets } from "./layout";
import { useI18n } from "../i18n";

export function TournamentScreen({
  t,
  onPlayNext,
  onNewTournament,
  onExit,
}: {
  t: Tournament;
  onPlayNext: () => void;
  onNewTournament: () => void;
  onExit: () => void;
}) {
  const pad = useMenuInsets();
  const { t: tr } = useI18n();
  const me = t.profile.teamId;
  const next = getPlayerFixture(t);
  const sf = t.knockouts.filter((f) => f.stage === "SF");
  const fin = t.knockouts.find((f) => f.stage === "FINAL");

  // the player's own matches across the group stage, in order (results + upcoming)
  const mySchedule = t.fixtures
    .filter((f) => f.home === me || f.away === me)
    .sort((a, b) => a.round - b.round);

  const Table = ({ group, title }: { group: GroupKey; title: string }) => {
    const rows = groupStandings(t, group);
    return (
      <View style={styles.tableBox}>
        <Text style={styles.tableTitle}>{title}</Text>
        <View style={styles.thead}>
          <Text style={[styles.th, styles.cClub]}>{tr("table.club")}</Text>
          <Text style={styles.th}>{tr("table.played")}</Text>
          <Text style={styles.th}>{tr("table.won")}</Text>
          <Text style={styles.th}>{tr("table.lost")}</Text>
          <Text style={[styles.th, styles.cPts]}>{tr("table.points")}</Text>
        </View>
        {rows.map((r, i) => (
          <Row key={r.teamId} r={r} pos={i} mine={r.teamId === me} qualifies={i < 2} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, pad]}>
        <View style={styles.header}>
          <Pressable onPress={onExit} style={styles.back}>
            <Text style={styles.backText}>{tr("common.menu")}</Text>
          </Pressable>
          <Text style={styles.title}>{tr("tour.title")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.you}>
          {t.profile.nickname} · {teamById(me).city}
        </Text>

        {/* Next match / result */}
        {t.phase === "DONE" ? (
          <View style={styles.champ}>
            <Text style={styles.champLabel}>{tr("tour.championLabel")}</Text>
            <Text style={styles.champTeam}>{teamById(t.championId!).city}</Text>
            <Text style={styles.champSub}>
              {t.championId === me ? tr("tour.youWonTournament") : tr("tour.tournamentOver")}
            </Text>
            <Pressable style={styles.play} onPress={onNewTournament}>
              <Text style={styles.playText}>{tr("tour.newTournament")}</Text>
            </Pressable>
          </View>
        ) : next ? (
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>
              {t.phase === "GROUP"
                ? tr("tour.groupPhase", { r: t.round, n: t.rounds })
                : t.phase === "SF"
                ? tr("tour.semifinal")
                : tr("tour.final")}
            </Text>
            <View style={styles.nextRow}>
              <Text style={[styles.nextTeam, next.home === me && styles.nextMine]}>
                {teamById(next.home).city}
              </Text>
              <Text style={styles.vs}>{tr("tour.vs")}</Text>
              <Text style={[styles.nextTeam, next.away === me && styles.nextMine]}>
                {teamById(next.away).city}
              </Text>
            </View>
            <Text style={styles.homeInfo}>
              {next.home === me ? tr("tour.home") : tr("tour.away")}
            </Text>
            <Pressable style={styles.play} onPress={onPlayNext}>
              <Text style={styles.playText}>{tr("tour.startMatch")}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* the player's schedule: past results + upcoming fixtures */}
        <View style={styles.tableBox}>
          <Text style={styles.tableTitle}>{tr("tour.schedule")}</Text>
          {mySchedule.map((f) => (
            <KoLine key={f.id} f={f} me={me} label={tr("tour.roundShort", { r: f.round })} />
          ))}
        </View>

        <Table group="A" title={tr("tour.groupA")} />
        <Table group="B" title={tr("tour.groupB")} />

        {sf.length > 0 && (
          <View style={styles.bracket}>
            <Text style={styles.tableTitle}>{tr("tour.koRound")}</Text>
            {sf.map((f, i) => (
              <KoLine key={f.id} f={f} me={me} label={tr("tour.sfShort", { n: i + 1 })} />
            ))}
            {fin && <KoLine f={fin} me={me} label={tr("tour.final")} />}
          </View>
        )}

        {t.phase !== "DONE" && (
          <Pressable style={styles.newCareer} onPress={onNewTournament}>
            <Text style={styles.newCareerText}>{tr("tour.newTournament")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ r, pos, mine, qualifies }: { r: StandRow; pos: number; mine: boolean; qualifies: boolean }) {
  return (
    <View style={[styles.tr, mine && styles.trMine]}>
      <View style={[styles.cClub, styles.clubCell]}>
        <View style={[styles.qDot, { backgroundColor: qualifies ? "#22c55e" : "transparent" }]} />
        <View style={[styles.swatch, { backgroundColor: teamById(r.teamId).color }]} />
        <Text style={[styles.td, styles.clubName, mine && styles.tdMine]} numberOfLines={1}>
          {teamById(r.teamId).city}
        </Text>
      </View>
      <Text style={styles.td}>{r.played}</Text>
      <Text style={styles.td}>{r.won}</Text>
      <Text style={styles.td}>{r.lost}</Text>
      <Text style={[styles.td, styles.cPts, styles.pts]}>{r.points}</Text>
    </View>
  );
}

function KoLine({ f, me, label }: { f: Fixture; me: string; label: string }) {
  const done = f.played;
  // colour the score from the player's perspective when they took part
  let scoreColor = "#fff";
  if (done && (f.home === me || f.away === me)) {
    const myScore = f.home === me ? f.homeScore : f.awayScore;
    const oppScore = f.home === me ? f.awayScore : f.homeScore;
    scoreColor = myScore > oppScore ? "#4ade80" : "#f87171";
  }
  return (
    <View style={styles.koRow}>
      <Text style={styles.koLabel}>{label}</Text>
      <Text style={[styles.koTeam, f.home === me && styles.nextMine]}>{teamById(f.home).city}</Text>
      <Text style={[styles.koScore, { color: scoreColor }]}>
        {done ? `${f.homeScore}:${f.awayScore}` : "–"}
      </Text>
      <Text style={[styles.koTeam, f.away === me && styles.nextMine]}>{teamById(f.away).city}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { paddingVertical: 20, paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerSpacer: { width: 60 },
  back: { paddingVertical: 6 },
  backText: { color: "#93c5fd", fontSize: 14, fontWeight: "700" },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  you: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 2, marginBottom: 12 },
  nextCard: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  nextLabel: { color: "#fbbf24", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
  nextTeam: { color: "#e5e7eb", fontSize: 20, fontWeight: "900" },
  nextMine: { color: "#fbbf24" },
  vs: { color: "#6b7280", fontSize: 14, fontWeight: "700" },
  homeInfo: { color: "#cbd5e1", fontSize: 13, marginTop: 6 },
  play: {
    marginTop: 14,
    backgroundColor: "#ef4444",
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: 26,
  },
  playText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  champ: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  champLabel: { color: "#fbbf24", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  champTeam: { color: "#fff", fontSize: 34, fontWeight: "900", marginTop: 4 },
  champSub: { color: "#cbd5e1", fontSize: 13, marginTop: 4 },
  tableBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tableTitle: { color: "#fbbf24", fontSize: 13, fontWeight: "900", letterSpacing: 2, marginBottom: 8 },
  thead: { flexDirection: "row", paddingBottom: 6, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  th: { color: "#9ca3af", fontSize: 12, fontWeight: "800", width: 34, textAlign: "center" },
  cClub: { flex: 1, textAlign: "left" },
  cPts: { width: 40 },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: 7 },
  trMine: { backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 8 },
  clubCell: { flexDirection: "row", alignItems: "center", gap: 7 },
  qDot: { width: 6, height: 6, borderRadius: 3 },
  swatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  td: { color: "#e5e7eb", fontSize: 13, width: 34, textAlign: "center" },
  clubName: { flex: 1, textAlign: "left", fontWeight: "700" },
  tdMine: { color: "#fbbf24" },
  pts: { fontWeight: "900", color: "#fff" },
  bracket: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  newCareer: {
    marginTop: 18,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.6)",
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  newCareerText: { color: "#f87171", fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  koRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  koLabel: { color: "#9ca3af", fontSize: 11, fontWeight: "800", width: 52 },
  koTeam: { color: "#e5e7eb", fontSize: 14, fontWeight: "700", flex: 1, textAlign: "center" },
  koScore: { color: "#fff", fontSize: 14, fontWeight: "900", width: 48, textAlign: "center" },
});
