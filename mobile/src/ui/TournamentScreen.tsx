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

export function TournamentScreen({
  t,
  onPlayNext,
  onShowEternal,
  onNewTournament,
  onExit,
}: {
  t: Tournament;
  onPlayNext: () => void;
  onShowEternal: () => void;
  onNewTournament: () => void;
  onExit: () => void;
}) {
  const pad = useMenuInsets();
  const me = t.profile.teamId;
  const next = getPlayerFixture(t);
  const sf = t.knockouts.filter((f) => f.stage === "SF");
  const fin = t.knockouts.find((f) => f.stage === "FINAL");

  const Table = ({ group, title }: { group: GroupKey; title: string }) => {
    const rows = groupStandings(t, group);
    return (
      <View style={styles.tableBox}>
        <Text style={styles.tableTitle}>{title}</Text>
        <View style={styles.thead}>
          <Text style={[styles.th, styles.cClub]}>Verein</Text>
          <Text style={styles.th}>Sp</Text>
          <Text style={styles.th}>S</Text>
          <Text style={styles.th}>N</Text>
          <Text style={[styles.th, styles.cPts]}>Pkt</Text>
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
            <Text style={styles.backText}>‹ Menü</Text>
          </Pressable>
          <Text style={styles.title}>TURNIER</Text>
          <Pressable onPress={onShowEternal} style={styles.back}>
            <Text style={styles.backText}>Ewige Tab. ›</Text>
          </Pressable>
        </View>
        <Text style={styles.you}>
          {t.profile.nickname} · {teamById(me).city}
        </Text>

        {/* Next match / result */}
        {t.phase === "DONE" ? (
          <View style={styles.champ}>
            <Text style={styles.champLabel}>🏆 MEISTER</Text>
            <Text style={styles.champTeam}>{teamById(t.championId!).city}</Text>
            <Text style={styles.champSub}>
              {t.championId === me ? "Du hast das Turnier gewonnen!" : "Turnier beendet."}
            </Text>
            <Pressable style={styles.play} onPress={onNewTournament}>
              <Text style={styles.playText}>NEUES TURNIER</Text>
            </Pressable>
          </View>
        ) : next ? (
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>
              {t.phase === "GROUP" ? `GRUPPENPHASE · Runde ${t.round}/6` : t.phase === "SF" ? "HALBFINALE" : "FINALE"}
            </Text>
            <View style={styles.nextRow}>
              <Text style={[styles.nextTeam, next.home === me && styles.nextMine]}>
                {teamById(next.home).city}
              </Text>
              <Text style={styles.vs}>vs</Text>
              <Text style={[styles.nextTeam, next.away === me && styles.nextMine]}>
                {teamById(next.away).city}
              </Text>
            </View>
            <Text style={styles.homeInfo}>
              {next.home === me ? "🏠 Heimspiel" : "✈️ Auswärtsspiel"}
            </Text>
            <Pressable style={styles.play} onPress={onPlayNext}>
              <Text style={styles.playText}>SPIEL STARTEN ▶</Text>
            </Pressable>
          </View>
        ) : null}

        <Table group="NORD" title="GRUPPE NORD" />
        <Table group="SUED" title="GRUPPE SÜD" />

        {sf.length > 0 && (
          <View style={styles.bracket}>
            <Text style={styles.tableTitle}>K.-O.-RUNDE</Text>
            {sf.map((f, i) => (
              <KoLine key={f.id} f={f} me={me} label={`HF ${i + 1}`} />
            ))}
            {fin && <KoLine f={fin} me={me} label="FINALE" />}
          </View>
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
  return (
    <View style={styles.koRow}>
      <Text style={styles.koLabel}>{label}</Text>
      <Text style={[styles.koTeam, f.home === me && styles.nextMine]}>{teamById(f.home).city}</Text>
      <Text style={styles.koScore}>{done ? `${f.homeScore}:${f.awayScore}` : "–"}</Text>
      <Text style={[styles.koTeam, f.away === me && styles.nextMine]}>{teamById(f.away).city}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { paddingVertical: 20, paddingHorizontal: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  koRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  koLabel: { color: "#9ca3af", fontSize: 11, fontWeight: "800", width: 52 },
  koTeam: { color: "#e5e7eb", fontSize: 14, fontWeight: "700", flex: 1, textAlign: "center" },
  koScore: { color: "#fff", fontSize: 14, fontWeight: "900", width: 48, textAlign: "center" },
});
