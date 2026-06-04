// Hoop: pole, backboard and the live rim+net (BasketNetAnimation).
import React from "react";
import { HOOP } from "../game/constants";
import { Simulation } from "../game/Simulation";
import { BasketNetAnimation } from "./BasketNetAnimation";
import { ShotClock } from "./ShotClock";

export function Hoop({ sim }: { sim: Simulation }) {
  const rim = HOOP.rim;
  return (
    <group>
      {/* pole */}
      <mesh position={[0, 1.6, HOOP.poleZ]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 3.2, 12]} />
        <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* support arm */}
      <mesh position={[0, 3.3, (HOOP.poleZ + HOOP.backboardZ) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, Math.abs(HOOP.backboardZ - HOOP.poleZ), 8]} />
        <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* backboard */}
      <mesh position={[0, 3.55, HOOP.backboardZ]} castShadow>
        <boxGeometry args={[1.85, 1.15, 0.06]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.92} roughness={0.3} />
      </mesh>
      {/* backboard border + target square */}
      <mesh position={[0, 3.55, HOOP.backboardZ + 0.04]}>
        <boxGeometry args={[1.85, 1.15, 0.01]} />
        <meshStandardMaterial color="#111827" wireframe />
      </mesh>
      <mesh position={[0, 3.25, HOOP.backboardZ + 0.05]}>
        <boxGeometry args={[0.6, 0.45, 0.01]} />
        <meshStandardMaterial color="#dc2626" wireframe />
      </mesh>

      {/* 24-second shot clock on top of the backboard */}
      <ShotClock sim={sim} />

      {/* rim + net live animation */}
      <BasketNetAnimation sim={sim} position={[rim.x, rim.y, rim.z]} />
    </group>
  );
}
