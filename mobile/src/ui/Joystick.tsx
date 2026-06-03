// Joystick: a real touch joystick (left side). Outputs a normalized world-plane
// vector; up on the stick drives toward the hoop (-Z).
import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder } from "react-native";

const BASE = 140;
const KNOB = 64;
const R = (BASE - KNOB) / 2;

export function Joystick({ onMove }: { onMove: (x: number, z: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        let dx = gesture.dx;
        let dy = gesture.dy;
        const mag = Math.hypot(dx, dy);
        if (mag > R) {
          dx = (dx / mag) * R;
          dy = (dy / mag) * R;
        }
        setKnob({ x: dx, y: dy });
        onMove(dx / R, dy / R); // y down = +Z (toward camera), y up = -Z (toward hoop)
      },
      onPanResponderRelease: () => {
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      },
      onPanResponderTerminate: () => {
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      },
    })
  ).current;

  return (
    <View style={styles.base} {...responder.panHandlers}>
      <View style={styles.ring} />
      <View
        style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]}
      />
    </View>
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
