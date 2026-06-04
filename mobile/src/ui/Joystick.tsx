// Joystick: a real touch joystick (left side) on react-native-gesture-handler so it
// works simultaneously with the action buttons (true multitouch). Up = toward hoop (-Z).
import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

const BASE = 140;
const KNOB = 64;
const R = (BASE - KNOB) / 2;

export function Joystick({ onMove }: { onMove: (x: number, z: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onUpdate((e) => {
          let dx = e.translationX;
          let dy = e.translationY;
          const mag = Math.hypot(dx, dy);
          if (mag > R) {
            dx = (dx / mag) * R;
            dy = (dy / mag) * R;
          }
          setKnob({ x: dx, y: dy });
          moveRef.current(dx / R, dy / R);
        })
        .onFinalize(() => {
          setKnob({ x: 0, y: 0 });
          moveRef.current(0, 0);
        }),
    []
  );

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.base}>
        <View style={styles.ring} />
        <View style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    width: BASE,
    height: BASE,
    borderRadius: BASE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    width: BASE,
    height: BASE,
    borderRadius: BASE / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
});
