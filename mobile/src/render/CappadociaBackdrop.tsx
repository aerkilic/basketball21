// Cappadocia: a fully procedural backdrop — a sandy desert floor, tuff "fairy
// chimney" rock spires around the court, drifting hot-air balloons in the sky and a
// soft sunrise sun. No photo / no canvas transparency, so it always renders.
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COURT } from "../game/constants";

// ---- ground ----
export function CappadociaGround() {
  const courtMidZ = (COURT.zFront + COURT.zBack) / 2;
  return (
    <mesh position={[0, -0.02, courtMidZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[260, 260]} />
      <meshStandardMaterial color="#cbb893" roughness={1} />
    </mesh>
  );
}

// ---- a single tuff rock spire (mushroom-capped fairy chimney) ----
function Rock({ x, z, h, r, s = 1 }: { x: number; z: number; h: number; r: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={[s, s, s]}>
      {/* tapered body — narrower at the top */}
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r * 0.42, r, h, 10]} />
        <meshStandardMaterial color="#d9c39c" roughness={1} />
      </mesh>
      {/* darker basalt cap */}
      <mesh position={[0, h + r * 0.25, 0]} castShadow>
        <sphereGeometry args={[r * 0.62, 10, 8]} />
        <meshStandardMaterial color="#7d6a4d" roughness={1} />
      </mesh>
    </group>
  );
}

// ---- low, wide mesas on the far horizon ----
function Mesa({ x, z, w, h }: { x: number; z: number; w: number; h: number }) {
  return (
    <mesh position={[x, h / 2, z]}>
      <cylinderGeometry args={[w * 0.8, w, h, 7]} />
      <meshStandardMaterial color="#c0a87f" roughness={1} />
    </mesh>
  );
}

// ---- a drifting hot-air balloon ----
function Balloon({
  x,
  z,
  baseY,
  color,
  phase,
  speed,
  drift,
}: {
  x: number;
  z: number;
  baseY: number;
  color: string;
  phase: number;
  speed: number;
  drift: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = ref.current;
    if (!g) return;
    g.position.y = baseY + Math.sin(t * speed + phase) * 0.7;
    g.position.x = x + Math.sin(t * speed * 0.25 + phase) * drift;
  });
  return (
    <group ref={ref} position={[x, baseY, z]}>
      {/* envelope */}
      <mesh scale={[1, 1.22, 1]}>
        <sphereGeometry args={[1.5, 18, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* bottom taper toward the basket */}
      <mesh position={[0, -1.55, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.6, 0.9, 14]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* basket */}
      <mesh position={[0, -2.25, 0]}>
        <boxGeometry args={[0.45, 0.4, 0.45]} />
        <meshStandardMaterial color="#6b4a2b" roughness={1} />
      </mesh>
    </group>
  );
}

const ROCKS: { x: number; z: number; h: number; r: number; s?: number }[] = [
  // first row behind the hoop
  { x: -7, z: -12, h: 5, r: 1.2 },
  { x: -4, z: -13, h: 6.5, r: 1.4 },
  { x: -1, z: -14.5, h: 8, r: 1.6 },
  { x: 2, z: -13, h: 5, r: 1.2 },
  { x: 4.5, z: -14, h: 7, r: 1.5 },
  { x: 7, z: -12.5, h: 5.5, r: 1.3 },
  // second, taller row further back
  { x: -11, z: -18, h: 7.5, r: 1.6 },
  { x: -6, z: -19, h: 9, r: 1.8 },
  { x: -1, z: -21, h: 10, r: 2.0 },
  { x: 4, z: -19.5, h: 8.5, r: 1.7 },
  { x: 9, z: -18, h: 7, r: 1.5 },
  { x: 13, z: -20, h: 8, r: 1.7 },
  { x: -15, z: -19, h: 6.5, r: 1.4 },
  // left side of the court
  { x: -11, z: -6, h: 5, r: 1.3 },
  { x: -13, z: -1, h: 6, r: 1.4 },
  { x: -12.5, z: 4, h: 4.5, r: 1.1 },
  { x: -16, z: 1, h: 5.5, r: 1.3 },
  // right side of the court
  { x: 11, z: -6, h: 5.5, r: 1.35 },
  { x: 13, z: -1, h: 6.5, r: 1.5 },
  { x: 12.5, z: 4, h: 4.5, r: 1.1 },
  { x: 16, z: 1, h: 6, r: 1.4 },
  // small clustered chimneys for density
  { x: -2.5, z: -16.5, h: 3.5, r: 0.8, s: 1 },
  { x: 1, z: -17, h: 3, r: 0.7, s: 1 },
  { x: 6.5, z: -16, h: 3.8, r: 0.9, s: 1 },
];

const MESAS: { x: number; z: number; w: number; h: number }[] = [
  { x: -22, z: -30, w: 9, h: 7 },
  { x: -6, z: -38, w: 12, h: 9 },
  { x: 14, z: -34, w: 10, h: 8 },
  { x: 28, z: -28, w: 8, h: 6 },
];

const BALLOON_COLORS = ["#e23b3b", "#2f6fdc", "#f0a500", "#e7641f", "#16a3a3", "#7c3aed", "#d81e8a"];
const BALLOONS = Array.from({ length: 11 }, (_, i) => {
  // spread across the sky behind / around the court
  const x = -18 + (i * 37) / 11 + (i % 2 === 0 ? 1.5 : -1.5);
  const z = -26 + (i % 4) * 5;
  const baseY = 9 + ((i * 1.7) % 11);
  return {
    x,
    z,
    baseY,
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    phase: (i * 1.3) % (Math.PI * 2),
    speed: 0.25 + (i % 3) * 0.08,
    drift: 0.8 + (i % 4) * 0.4,
  };
});

export function CappadociaScene() {
  return (
    <group>
      {/* sunrise sun + soft halo, far on the horizon */}
      <mesh position={[8, 12, -70]}>
        <circleGeometry args={[7, 40]} />
        <meshBasicMaterial color="#ffe6b0" toneMapped={false} />
      </mesh>
      <mesh position={[8, 12, -71]}>
        <circleGeometry args={[12, 40]} />
        <meshBasicMaterial color="#ffd98a" transparent opacity={0.28} toneMapped={false} />
      </mesh>

      {MESAS.map((m, i) => (
        <Mesa key={`m${i}`} {...m} />
      ))}
      {ROCKS.map((r, i) => (
        <Rock key={`r${i}`} {...r} />
      ))}
      {BALLOONS.map((b, i) => (
        <Balloon key={`b${i}`} {...b} />
      ))}
    </group>
  );
}
