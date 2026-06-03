// Court: the rubber street court, painted lines, and a bit of schoolyard scenery.
import React from "react";
import { COURT, HOOP, THREE_POINT_DIST } from "../game/constants";

const LINE = "#f1f5f9";
const Y = 0.02;

function Stripe({
  x,
  z,
  w,
  l,
  color = LINE,
  rot = 0,
}: {
  x: number;
  z: number;
  w: number;
  l: number;
  color?: string;
  rot?: number;
}) {
  return (
    <mesh position={[x, Y, z]} rotation={[-Math.PI / 2, 0, rot]}>
      <planeGeometry args={[w, l]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

export function Court() {
  const w = COURT.halfWidth * 2;
  const courtLen = COURT.zFront - COURT.zBack;
  const courtMidZ = (COURT.zFront + COURT.zBack) / 2;
  const basketZ = HOOP.rim.z;

  return (
    <group>
      {/* asphalt surround */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#3a3f45" roughness={1} />
      </mesh>

      {/* rubber court surface */}
      <mesh position={[0, 0, courtMidZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 0.6, courtLen + 0.6]} />
        <meshStandardMaterial color="#2f7d52" roughness={0.95} />
      </mesh>

      {/* painted key (the paint) */}
      <mesh position={[0, 0.011, basketZ + 1.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 4.2]} />
        <meshStandardMaterial color="#b1402f" roughness={0.95} />
      </mesh>

      {/* court perimeter — front line (z=zFront) is the mid-court OUT line */}
      <Stripe x={0} z={COURT.zFront - 0.06} w={w} l={0.16} color="#fde047" />
      <Stripe x={-COURT.halfWidth + 0.1} z={courtMidZ} w={0.12} l={courtLen} />
      <Stripe x={COURT.halfWidth - 0.1} z={courtMidZ} w={0.12} l={courtLen} />
      {/* baseline under the hoop */}
      <Stripe x={0} z={basketZ - 0.35} w={w} l={0.12} />

      {/* three-point arc */}
      <group position={[0, 0.012, basketZ]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[THREE_POINT_DIST, 0.06, 8, 64, Math.PI]} />
          <meshStandardMaterial color={LINE} roughness={0.9} />
        </mesh>
      </group>
      {/* short corner connectors */}
      <Stripe x={-THREE_POINT_DIST} z={(basketZ + (basketZ - 0.35)) / 2} w={0.1} l={0.7} />
      <Stripe x={THREE_POINT_DIST} z={(basketZ + (basketZ - 0.35)) / 2} w={0.1} l={0.7} />

      {/* key outline */}
      <Stripe x={-1.8} z={basketZ + 1.9} w={0.1} l={4.2} />
      <Stripe x={1.8} z={basketZ + 1.9} w={0.1} l={4.2} />
      <Stripe x={0} z={basketZ + 4.0} w={3.6} l={0.1} />
      {/* free-throw circle */}
      <group position={[0, 0.012, basketZ + 4.0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.4, 0.05, 8, 40]} />
          <meshStandardMaterial color={LINE} roughness={0.9} />
        </mesh>
      </group>

      <Scenery />
    </group>
  );
}

// Simple street/schoolyard backdrop: chain-link fence behind the hoop and a couple
// of distant building blocks for atmosphere.
function Scenery() {
  return (
    <group>
      {/* fence behind hoop */}
      <mesh position={[0, 1.6, COURT.zBack - 0.5]}>
        <planeGeometry args={[18, 3.2]} />
        <meshStandardMaterial color="#5b6168" transparent opacity={0.28} wireframe />
      </mesh>
      {/* side fences */}
      <mesh position={[-COURT.halfWidth - 0.6, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 2.8]} />
        <meshStandardMaterial color="#5b6168" transparent opacity={0.2} wireframe />
      </mesh>
      <mesh position={[COURT.halfWidth + 0.6, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 2.8]} />
        <meshStandardMaterial color="#5b6168" transparent opacity={0.2} wireframe />
      </mesh>

      {/* distant buildings */}
      {[
        { x: -16, z: -16, w: 8, h: 12, c: "#4b5563" },
        { x: -6, z: -20, w: 7, h: 16, c: "#525b69" },
        { x: 6, z: -19, w: 9, h: 10, c: "#454d59" },
        { x: 17, z: -15, w: 8, h: 14, c: "#4b5563" },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={b.c} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
