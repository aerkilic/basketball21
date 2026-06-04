// ProfileScreen: enter name + nickname and pick your club for a new tournament.
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";
import { TEAMS, Profile } from "../game/tournament";
import { LEFT_MARGIN } from "./layout";

export function ProfileScreen({
  onStart,
  onBack,
}: {
  onStart: (p: Profile) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [nick, setNick] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);

  const ready = name.trim().length > 0 && nick.trim().length > 0 && teamId;

  const TeamGrid = ({ group }: { group: "NORD" | "SUED" }) => (
    <View style={styles.grid}>
      {TEAMS.filter((t) => t.group === group).map((t) => (
        <Pressable
          key={t.id}
          onPress={() => setTeamId(t.id)}
          style={[styles.team, teamId === t.id && styles.teamActive]}
        >
          <View style={[styles.swatch, { backgroundColor: t.color }]} />
          <Text style={[styles.teamCity, teamId === t.id && styles.teamCityActive]}>{t.city}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingLeft: LEFT_MARGIN }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>‹ Zurück</Text>
          </Pressable>
          <Text style={styles.title}>KARRIERE</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Dein Name"
          placeholderTextColor="#6b7280"
          maxLength={18}
        />
        <Text style={styles.label}>Nickname</Text>
        <TextInput
          style={styles.input}
          value={nick}
          onChangeText={setNick}
          placeholder="z. B. Ballin"
          placeholderTextColor="#6b7280"
          maxLength={14}
        />

        <Text style={styles.section}>Dein Verein — Gruppe Süd</Text>
        <TeamGrid group="SUED" />
        <Text style={styles.section}>Gruppe Nord</Text>
        <TeamGrid group="NORD" />

        <Pressable
          style={[styles.play, !ready && styles.playOff]}
          disabled={!ready}
          onPress={() => onStart({ name: name.trim(), nickname: nick.trim(), teamId: teamId! })}
        >
          <Text style={styles.playText}>TURNIER STARTEN ▶</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0b1018" },
  scroll: { paddingVertical: 24, paddingHorizontal: 22 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { paddingVertical: 6, paddingRight: 10 },
  backText: { color: "#93c5fd", fontSize: 15, fontWeight: "700" },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: 2 },
  label: { color: "#cbd5e1", fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  section: { color: "#fbbf24", fontSize: 13, fontWeight: "900", letterSpacing: 2, marginTop: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    minWidth: 130,
  },
  teamActive: { borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.14)" },
  swatch: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  teamCity: { color: "#e5e7eb", fontWeight: "800", fontSize: 15 },
  teamCityActive: { color: "#fbbf24" },
  play: {
    marginTop: 28,
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  playOff: { backgroundColor: "rgba(255,255,255,0.12)" },
  playText: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
});
