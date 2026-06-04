// ShotClock: a two-digit 7-segment shot-clock readout mounted on top of the
// backboard. Reads sim.state.shotClock each frame and lights the segments. Turns
// amber in the final seconds.
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HOOP, SHOT_CLOCK } from "../game/constants";
import { Simulation } from "../game/Simulation";

// which of the 7 segments [a b c d e f g] are lit for each digit
//   aaa
//  f   b
//   ggg
//  e   c
//   ddd
const DIGIT_SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgecd",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  " ": "",
};

// segment local geometry: [x, y, z] position and [w, h, d] size
const T = 0.04; // segment thickness
const D = 0.05; // depth
const SEGS: { L: string; pos: [number, number, number]; size: [number, number, number] }[] = [
  { L: "a", pos: [0, 0.17, 0], size: [0.15, T, D] },
  { L: "g", pos: [0, 0, 0], size: [0.15, T, D] },
  { L: "d", pos: [0, -0.17, 0], size: [0.15, T, D] },
  { L: "f", pos: [-0.09, 0.085, 0], size: [T, 0.15, D] },
  { L: "b", pos: [0.09, 0.085, 0], size: [T, 0.15, D] },
  { L: "e", pos: [-0.09, -0.085, 0], size: [T, 0.15, D] },
  { L: "c", pos: [0.09, -0.085, 0], size: [T, 0.15, D] },
];

export function ShotClock({ sim }: { sim: Simulation }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ff3b30",
        emissive: "#ff1a1a",
        emissiveIntensity: 1.1,
        roughness: 0.5,
      }),
    []
  );
  // refs: segs.current[digitIndex][segmentLetter] = mesh
  const segs = useRef<Record<number, Partial<Record<string, THREE.Mesh>>>>({ 0: {}, 1: {} });

  useFrame(() => {
    const raw = sim.state.shotClock;
    const v = Math.max(0, Math.min(SHOT_CLOCK, Math.ceil(Number.isFinite(raw) ? raw : SHOT_CLOCK)));
    const tens = v >= 10 ? String(Math.floor(v / 10)) : " "; // blank leading zero
    const ones = String(v % 10);
    const onT = DIGIT_SEGMENTS[tens] ?? "";
    const onO = DIGIT_SEGMENTS[ones] ?? "";
    for (const { L } of SEGS) {
      const mt = segs.current[0][L];
      if (mt) mt.visible = onT.includes(L);
      const mo = segs.current[1][L];
      if (mo) mo.visible = onO.includes(L);
    }
    // amber + brighter glow in the final seconds
    const urgent = v <= 5;
    mat.color.set(urgent ? "#ffd60a" : "#ff3b30");
    mat.emissive.set(urgent ? "#ffae00" : "#ff1a1a");
    mat.emissiveIntensity = urgent ? 1.5 : 1.1;
  });

  const digit = (di: number, x: number) => (
    <group position={[x, 0, 0]}>
      {SEGS.map(({ L, pos, size }) => (
        <mesh
          key={L}
          position={pos}
          material={mat}
          ref={(m) => {
            if (m) segs.current[di][L] = m;
          }}
        >
          <boxGeometry args={size} />
        </mesh>
      ))}
    </group>
  );

  // sit just above the backboard, facing the court (+z)
  return (
    <group position={[0, 4.45, HOOP.backboardZ + 0.06]}>
      {/* dark housing behind the digits */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[0.66, 0.5, 0.08]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
      </mesh>
      {digit(0, -0.14)}
      {digit(1, 0.14)}
    </group>
  );
}
