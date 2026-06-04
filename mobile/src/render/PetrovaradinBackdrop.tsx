// Petrovaradin: a fortress terrace above the Danube, with the clock tower and
// layered ramparts behind the court. Procedural geometry only.
import React from "react";
import { COURT } from "../game/constants";

const RIVER_Z = -17;
const FORTRESS_Z = -27;

export function PetrovaradinGround() {
  return (
    <group>
      {/* stone terrace the court sits on */}
      <mesh position={[0, -0.02, (COURT.zFront + RIVER_Z) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, COURT.zFront - RIVER_Z]} />
        <meshStandardMaterial color="#8f8572" roughness={1} />
      </mesh>
      {/* low parapet before the river drop, kept behind the hoop line */}
      <mesh position={[0, 0.45, RIVER_Z + 1.2]} castShadow>
        <boxGeometry args={[46, 0.9, 0.8]} />
        <meshStandardMaterial color="#b9ad91" roughness={1} />
      </mesh>
    </group>
  );
}

function Wall({
  x,
  y,
  z,
  w,
  h,
  d,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}) {
  const merlons = Math.max(3, Math.floor(w / 2.8));
  return (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#c7b996" roughness={1} />
      </mesh>
      {Array.from({ length: merlons }, (_, i) => {
        const px = -w / 2 + 1.2 + (i * (w - 2.4)) / Math.max(1, merlons - 1);
        return (
          <mesh key={i} position={[px, h / 2 + 0.35, 0]} castShadow>
            <boxGeometry args={[0.8, 0.7, d + 0.1]} />
            <meshStandardMaterial color="#d1c4a3" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

function ClockTower() {
  return (
    <group position={[14, 0, FORTRESS_Z + 1]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[4.2, 4.4, 4.2]} />
        <meshStandardMaterial color="#d7c59d" roughness={1} />
      </mesh>
      <mesh position={[0, 5.6, 0]} castShadow>
        <boxGeometry args={[2.4, 3.4, 2.4]} />
        <meshStandardMaterial color="#efe4c8" roughness={1} />
      </mesh>
      <mesh position={[0, 6.1, 1.23]}>
        <circleGeometry args={[0.72, 24]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 8.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.9, 2.4, 4]} />
        <meshStandardMaterial color="#8f3f2f" roughness={1} />
      </mesh>
    </group>
  );
}

export function PetrovaradinScene() {
  return (
    <group>
      {/* Danube below the fortress terrace */}
      <mesh position={[0, -0.35, RIVER_Z - 23]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 58]} />
        <meshStandardMaterial color="#456f86" roughness={0.45} metalness={0.16} />
      </mesh>

      {/* far bank and low city silhouette */}
      <mesh position={[0, 0.2, -52]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 16]} />
        <meshStandardMaterial color="#627653" roughness={1} />
      </mesh>
      {[
        { x: -34, h: 7, w: 5 },
        { x: -27, h: 10, w: 6 },
        { x: -19, h: 6, w: 5 },
        { x: 30, h: 8, w: 5 },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, -51]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color="#a7adb2" roughness={1} />
        </mesh>
      ))}

      {/* fortress hill and layered ramparts */}
      <mesh position={[7, 2.8, FORTRESS_Z + 1]} castShadow>
        <coneGeometry args={[22, 7.5, 7]} />
        <meshStandardMaterial color="#72835d" roughness={1} />
      </mesh>
      <Wall x={0} y={4.6} z={FORTRESS_Z + 4} w={34} h={2.2} d={2.4} />
      <Wall x={-10} y={6.5} z={FORTRESS_Z - 1.5} w={24} h={2.1} d={2.2} />
      <Wall x={17} y={6.2} z={FORTRESS_Z - 2.8} w={18} h={2} d={2.2} />
      <ClockTower />

      {/* side rampart hints so the court still stays open in the middle */}
      <Wall x={-25} y={2.2} z={-13.5} w={11} h={1.6} d={2} />
      <Wall x={27} y={2.2} z={-14} w={12} h={1.6} d={2} />
    </group>
  );
}
