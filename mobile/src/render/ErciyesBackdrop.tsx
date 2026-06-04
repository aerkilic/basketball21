// Erciyes: a snowy mountain backdrop inspired by Mount Erciyes near Kayseri.
// Procedural geometry only, so it renders without external image assets.
import React from "react";
import * as THREE from "three";
import { COURT } from "../game/constants";

const MOUNTAIN_Z = -42;
const LIFT_Z = -18;

export function ErciyesGround() {
  const courtMidZ = (COURT.zFront + COURT.zBack) / 2;
  return (
    <group>
      <mesh position={[0, -0.02, courtMidZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#dce5ea" roughness={1} />
      </mesh>
      <mesh position={[0, 0.005, COURT.zBack - 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[42, 3.4]} />
        <meshStandardMaterial color="#c5d1d8" roughness={1} />
      </mesh>
    </group>
  );
}

function Cable({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={[q.x, q.y, q.z, q.w]}>
      <cylinderGeometry args={[0.055, 0.055, len, 6]} />
      <meshStandardMaterial color="#d9e1e7" metalness={0.25} roughness={0.55} />
    </mesh>
  );
}

function Pine({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={[s, s, s]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1.1, 6]} />
        <meshStandardMaterial color="#5b3d24" roughness={1} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <coneGeometry args={[0.8, 1.7, 8]} />
        <meshStandardMaterial color="#1f5a49" roughness={1} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <coneGeometry args={[0.55, 1.25, 8]} />
        <meshStandardMaterial color="#2d6b56" roughness={1} />
      </mesh>
    </group>
  );
}

export function ErciyesScene() {
  return (
    <group>
      {/* main volcanic cone */}
      <mesh position={[0, 13, MOUNTAIN_Z]}>
        <coneGeometry args={[26, 28, 7]} />
        <meshStandardMaterial color="#8795a1" roughness={1} />
      </mesh>
      <mesh position={[0, 23, MOUNTAIN_Z + 0.2]}>
        <coneGeometry args={[11, 10, 7]} />
        <meshStandardMaterial color="#f5f8fb" roughness={0.95} />
      </mesh>

      {/* side ridges around the main peak */}
      {[
        { x: -25, z: -39, r: 15, h: 14, c: "#9aa7ad" },
        { x: 24, z: -40, r: 16, h: 16, c: "#95a2aa" },
        { x: -44, z: -45, r: 18, h: 11, c: "#aab4ba" },
        { x: 43, z: -47, r: 19, h: 12, c: "#a6b0b6" },
      ].map((m, i) => (
        <mesh key={i} position={[m.x, m.h / 2, m.z]}>
          <coneGeometry args={[m.r, m.h, 6]} />
          <meshStandardMaterial color={m.c} roughness={1} />
        </mesh>
      ))}

      {/* ski lift line in the distance, low enough to keep the court readable */}
      <Cable from={[-20, 4.2, LIFT_Z]} to={[18, 8.6, MOUNTAIN_Z + 7]} />
      <Cable from={[-20, 3.7, LIFT_Z]} to={[18, 8.1, MOUNTAIN_Z + 7]} />
      {[
        { x: -20, y: 2.1, z: LIFT_Z },
        { x: -7, y: 3.7, z: -26 },
        { x: 7, y: 5.5, z: -34 },
        { x: 18, y: 7.1, z: MOUNTAIN_Z + 7 },
      ].map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <cylinderGeometry args={[0.22, 0.22, 4.2, 8]} />
          <meshStandardMaterial color="#cbd5de" roughness={0.8} />
        </mesh>
      ))}

      {/* tree line set wide to the sides, leaving the hoop area open */}
      {[
        [-18, -10, 0.9],
        [-23, -14, 1.1],
        [-29, -7, 0.8],
        [-34, -12, 1],
        [18, -10, 0.9],
        [23, -14, 1.15],
        [30, -8, 0.85],
        [35, -13, 1],
      ].map(([x, z, s], i) => (
        <Pine key={i} x={x} z={z} s={s} />
      ))}
    </group>
  );
}
