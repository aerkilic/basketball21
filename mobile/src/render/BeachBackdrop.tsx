// Beach (Kızkalesi, Mersin): a sandy court by the Mediterranean with the iconic
// sea castle on a small island offshore. Fully procedural, no photo.
import React from "react";
import { COURT } from "../game/constants";

const WATER_Z = -12; // where the sand meets the sea
const CASTLE_Z = -30;

// ---- sandy beach the court sits on ----
export function BeachGround() {
  return (
    <group>
      {/* dry sand in front of the waterline */}
      <mesh position={[0, -0.02, (COURT.zFront + WATER_Z) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, COURT.zFront - WATER_Z]} />
        <meshStandardMaterial color="#e6d2a4" roughness={1} />
      </mesh>
      {/* darker wet sand strip at the waterline */}
      <mesh position={[0, -0.015, WATER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[300, 1.6]} />
        <meshStandardMaterial color="#c9ba8e" roughness={1} />
      </mesh>
    </group>
  );
}

// ---- one castle tower with a crenellated cap ----
function Tower({ x, z, h, r }: { x: number; z: number; h: number; r: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r * 1.05, h, 10]} />
        <meshStandardMaterial color="#cdb78c" roughness={1} />
      </mesh>
      <mesh position={[0, h + 0.2, 0]}>
        <cylinderGeometry args={[r * 1.15, r * 1.15, 0.5, 10]} />
        <meshStandardMaterial color="#b8a273" roughness={1} />
      </mesh>
    </group>
  );
}

export function BeachScene() {
  const w = 5; // castle wall half-extent
  return (
    <group>
      {/* the Mediterranean */}
      <mesh position={[0, -0.3, WATER_Z - 45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[320, 90]} />
        <meshStandardMaterial color="#1f9bbf" roughness={0.35} metalness={0.15} />
      </mesh>

      {/* Kızkalesi — the sea castle on its little island */}
      <group position={[0, 0, CASTLE_Z]}>
        {/* rocky island base just above the water */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[w + 2.5, w + 3.5, 1.6, 16]} />
          <meshStandardMaterial color="#6f665a" roughness={1} />
        </mesh>
        {/* curtain walls (a hollow square of four slabs) */}
        {[
          { x: 0, z: -w, lx: w * 2, lz: 0.8 },
          { x: 0, z: w, lx: w * 2, lz: 0.8 },
          { x: -w, z: 0, lx: 0.8, lz: w * 2 },
          { x: w, z: 0, lx: 0.8, lz: w * 2 },
        ].map((s, i) => (
          <mesh key={i} position={[s.x, 2.6, s.z]} castShadow>
            <boxGeometry args={[s.lx, 3, s.lz]} />
            <meshStandardMaterial color="#cdb78c" roughness={1} />
          </mesh>
        ))}
        {/* corner towers + a taller keep */}
        <Tower x={-w} z={-w} h={5} r={1} />
        <Tower x={w} z={-w} h={5} r={1} />
        <Tower x={-w} z={w} h={4.5} r={1} />
        <Tower x={w} z={w} h={4.5} r={1} />
        <Tower x={0} z={-w + 1.5} h={7} r={1.4} />
      </group>

      {/* a couple of distant headlands on the horizon */}
      <mesh position={[-34, 2, -60]}>
        <coneGeometry args={[12, 8, 6]} />
        <meshStandardMaterial color="#8a9a6b" roughness={1} />
      </mesh>
      <mesh position={[30, 2, -64]}>
        <coneGeometry args={[14, 9, 6]} />
        <meshStandardMaterial color="#7f8f60" roughness={1} />
      </mesh>
    </group>
  );
}
