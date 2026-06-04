// Controls: a single full-screen touch surface that tracks ALL fingers at once
// (true multitouch) and maps them to a floating joystick (left) + action buttons
// (right). One surface = no responder competition, so joystick + buttons work
// simultaneously (fixes "no pass / no sprint while running").
import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InputManager } from "../game/InputManager";

interface Touch {
  pageX: number;
  pageY: number;
  identifier: number;
}

export function Controls({ input, onBall }: { input: InputManager; onBall: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [base, setBase] = useState({ x: insets.left + 110, y: height - 120 });
  const [active, setActive] = useState(false);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  const joyId = useRef<number | null>(null);
  const joyStart = useRef({ x: 0, y: 0 });
  const prev = useRef<Set<string>>(new Set());

  const R = 56;
  const zoneX = width * 0.45; // left of this = joystick zone

  const rX = width - insets.right;
  const buttons = [
    { id: "D", cx: rX - 95, cy: height - 95, r: 50, color: "#ef4444", label: "D", sub: onBall ? "WURF" : "STEAL", size: 88 },
    { id: "A", cx: rX - 100, cy: height - 215, r: 44, color: "#0ea5e9", label: "A", sub: onBall ? "SPRUNG" : "BLOCK", size: 74 },
    { id: "S", cx: rX - 190, cy: height - 150, r: 44, color: "#22c55e", label: "S", sub: onBall ? "PASS" : "WECHSEL", size: 74 },
    { id: "W", cx: rX - 270, cy: height - 110, r: 38, color: "#f59e0b", label: "W", sub: "SPRINT", size: 62 },
    { id: "X", cx: rX - 270, cy: height - 188, r: 38, color: "#7c3aed", label: "X", sub: onBall ? "CROSS" : "—", size: 62 },
    { id: "T", cx: rX - 355, cy: height - 150, r: 38, color: "#ec4899", label: "T", sub: onBall ? "TRICK" : "—", size: 62 },
  ];

  const recompute = (touches: Touch[]) => {
    // ---- joystick (floating, identified by touch id) ----
    let jt = joyId.current != null ? touches.find((t) => t.identifier === joyId.current) : undefined;
    if (!jt) {
      const cand = touches.find((t) => t.pageX < zoneX);
      if (cand) {
        joyId.current = cand.identifier;
        joyStart.current = { x: cand.pageX, y: cand.pageY };
        jt = cand;
      } else {
        joyId.current = null;
      }
    }
    if (jt) {
      let dx = jt.pageX - joyStart.current.x;
      let dy = jt.pageY - joyStart.current.y;
      const mag = Math.hypot(dx, dy);
      if (mag > R) {
        dx = (dx / mag) * R;
        dy = (dy / mag) * R;
      }
      setBase(joyStart.current);
      setKnob({ x: dx, y: dy });
      setActive(true);
      input.setMove(dx / R, dy / R);
    } else {
      setActive(false);
      setKnob({ x: 0, y: 0 });
      input.setMove(0, 0);
    }

    // ---- buttons ----
    const now = new Set<string>();
    for (const b of buttons) {
      for (const t of touches) {
        if (t.identifier === joyId.current) continue;
        if (Math.hypot(t.pageX - b.cx, t.pageY - b.cy) <= b.r + 16) {
          now.add(b.id);
          break;
        }
      }
    }
    input.setSprint(now.has("W"));
    input.setShoot(now.has("D"));
    input.setJump(now.has("A"));
    if (now.has("S") && !prev.current.has("S")) input.pressPass();
    if (now.has("X") && !prev.current.has("X")) input.pressSpecial();
    if (now.has("T") && !prev.current.has("T")) input.pressTrick();
    prev.current = now;

    const map: Record<string, boolean> = {};
    now.forEach((id) => (map[id] = true));
    setPressed(map);
  };

  const handle = (e: any) => recompute(e.nativeEvent.touches as Touch[]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      onTouchStart={handle}
      onTouchMove={handle}
      onTouchEnd={handle}
      onTouchCancel={handle}
    >
      {/* joystick */}
      <View style={[styles.jbase, { left: base.x - 72, top: base.y - 72, opacity: active ? 0.9 : 0.5 }]} />
      <View style={[styles.jknob, { left: base.x - 34 + knob.x, top: base.y - 34 + knob.y, opacity: active ? 1 : 0.5 }]} />

      {/* buttons */}
      {buttons.map((b) => (
        <View
          key={b.id}
          style={[
            styles.btn,
            {
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              left: b.cx - b.size / 2,
              top: b.cy - b.size / 2,
              backgroundColor: b.color,
              opacity: pressed[b.id] ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.label}>{b.label}</Text>
          <Text style={styles.sub}>{b.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  jbase: {
    position: "absolute",
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
  },
  jknob: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  btn: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  label: { color: "#fff", fontSize: 22, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.92)", fontSize: 9, fontWeight: "700", marginTop: 1 },
});
