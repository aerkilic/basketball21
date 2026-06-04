// ActionButtons: right-side diamond (A/S/W/D) + a dedicated X (crossover) button.
// Uses react-native-gesture-handler's Pressable so taps register reliably even
// while the left thumb is dragging the joystick (true multitouch).
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { InputManager } from "../game/InputManager";
import { useI18n } from "../i18n";

interface Props {
  input: InputManager;
  onBall: boolean; // whether the user's player currently has the ball
}

function Btn({
  label,
  sub,
  color,
  onIn,
  onOut,
  size = 72,
}: {
  label: string;
  sub: string;
  color: string;
  onIn: () => void;
  onOut?: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPressIn={onIn}
      onPressOut={onOut}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </Pressable>
  );
}

export function ActionButtons({ input, onBall }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.wrap}>
      {/* dedicated crossover + sprint column */}
      <View style={styles.crossCol}>
        <Btn label="X" sub={onBall ? t("btn.cross") : t("btn.none")} color="#7c3aed" size={60} onIn={() => input.pressSpecial()} />
        <Btn
          label="W"
          sub={t("btn.sprint")}
          color="#f59e0b"
          size={60}
          onIn={() => input.setSprint(true)}
          onOut={() => input.setSprint(false)}
        />
      </View>

      {/* action diamond */}
      <View style={styles.diamond}>
        <View style={styles.dRow}>
          <Btn
            label="A"
            sub={onBall ? t("btn.jump") : t("btn.block")}
            color="#0ea5e9"
            onIn={() => input.setJump(true)}
            onOut={() => input.setJump(false)}
          />
        </View>
        <View style={[styles.dRow, styles.midRow]}>
          <Btn label="S" sub={onBall ? t("btn.pass") : t("btn.switch")} color="#22c55e" onIn={() => input.pressPass()} />
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.dRow}>
          <Btn
            label="D"
            sub={onBall ? t("btn.shoot") : t("btn.steal")}
            color="#ef4444"
            size={86}
            onIn={() => input.setShoot(true)}
            onOut={() => input.setShoot(false)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", gap: 14 },
  crossCol: { gap: 14, marginBottom: 8 },
  diamond: { alignItems: "center" },
  dRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  midRow: { gap: 14, marginVertical: 8 },
  btn: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    elevation: 6,
  },
  label: { color: "#fff", fontSize: 22, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.92)", fontSize: 9, fontWeight: "700", marginTop: 1 },
});
