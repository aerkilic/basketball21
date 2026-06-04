// ActionButtons: right-side diamond (A/S/W/D) + a dedicated X (crossover) button.
// Built on react-native-gesture-handler so taps register reliably even while the
// left thumb is dragging the joystick (true multitouch — fixes "no pass while moving").
import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { InputManager } from "../game/InputManager";

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
  const [pressed, setPressed] = useState(false);
  const inRef = useRef(onIn);
  const outRef = useRef(onOut);
  inRef.current = onIn;
  outRef.current = onOut;

  // LongPress with zero min duration fires immediately on touch-down and is
  // independent of the RN responder system, so it co-exists with the joystick.
  const gesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(0)
        .maxDistance(10000)
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
          setPressed(true);
          inRef.current();
        })
        .onFinalize(() => {
          setPressed(false);
          outRef.current?.();
        }),
    []
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[
          styles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: pressed ? 0.65 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </GestureDetector>
  );
}

export function ActionButtons({ input, onBall }: Props) {
  return (
    <View style={styles.wrap}>
      {/* dedicated crossover + sprint column */}
      <View style={styles.crossCol}>
        <Btn label="X" sub={onBall ? "CROSS" : "—"} color="#7c3aed" size={60} onIn={() => input.pressSpecial()} />
        <Btn
          label="W"
          sub="SPRINT"
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
            sub={onBall ? "SPRUNG" : "BLOCK"}
            color="#0ea5e9"
            onIn={() => input.setJump(true)}
            onOut={() => input.setJump(false)}
          />
        </View>
        <View style={[styles.dRow, styles.midRow]}>
          <Btn label="S" sub={onBall ? "PASS" : "WECHSEL"} color="#22c55e" onIn={() => input.pressPass()} />
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.dRow}>
          <Btn
            label="D"
            sub={onBall ? "WURF" : "STEAL"}
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
