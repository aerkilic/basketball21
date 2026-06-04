// Novi Sad: a procedural backdrop — a riverside quay with the Danube behind the
// court, a cable-stayed bridge (Most slobode) spanning it, and the Petrovaradin
// fortress on the far bank. Fully 3D, no photo.
import React from "react";
import * as THREE from "three";
import { COURT } from "../game/constants";

const BANK_Z = -11; // where the quay meets the water
const BRIDGE_Z = -24; // distance of the bridge across the river
const DECK_Y = 5; // deck height above the water
const PYLON_X = 14;
const PYLON_TOP = 15; // mast top — kept in frame for the tilted outdoor camera
const DECK_LEN = 110;

// ---- ground: a stone quay in front of the river ----
export function NoviSadGround() {
  return (
    <group>
      {/* quay / embankment the court sits on */}
      <mesh position={[0, -0.02, (COURT.zFront + BANK_Z) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, COURT.zFront - BANK_Z]} />
        <meshStandardMaterial color="#9a9582" roughness={1} />
      </mesh>
      {/* quay wall down to the water at the bank edge */}
      <mesh position={[0, -0.6, BANK_Z]}>
        <boxGeometry args={[260, 1.3, 0.8]} />
        <meshStandardMaterial color="#7e7a6d" roughness={1} />
      </mesh>
    </group>
  );
}

// a single straight cable between two points (cylinder oriented along the segment)
function Cable({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={[q.x, q.y, q.z, q.w]}>
      <cylinderGeometry args={[0.08, 0.08, len, 6]} />
      <meshStandardMaterial color="#d7dbe0" metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

function Pylon({ x }: { x: number }) {
  const top: [number, number, number] = [x, PYLON_TOP, BRIDGE_Z];
  const half = DECK_LEN / 2;
  // fan cables from the mast top to deck anchor points on both sides
  const anchors = [-24, -18, -12, -6, 6, 12, 18, 24]
    .map((dx) => x + dx)
    .filter((ax) => ax >= -half && ax <= half);
  return (
    <group>
      <mesh position={[x, PYLON_TOP / 2, BRIDGE_Z]} castShadow>
        <boxGeometry args={[1.5, PYLON_TOP, 1.7]} />
        <meshStandardMaterial color="#eceef0" roughness={0.7} />
      </mesh>
      {anchors.map((ax, i) => (
        <Cable key={i} from={top} to={[ax, DECK_Y + 0.5, BRIDGE_Z]} />
      ))}
    </group>
  );
}

// ---- the river + bridge + far bank ----
export function NoviSadScene() {
  return (
    <group>
      {/* Danube */}
      <mesh position={[0, -0.35, BANK_Z - 24]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 60]} />
        <meshStandardMaterial color="#3f6d8c" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* bridge deck */}
      <mesh position={[0, DECK_Y, BRIDGE_Z]} castShadow>
        <boxGeometry args={[DECK_LEN, 0.9, 4]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.8} />
      </mesh>
      {/* deck railings */}
      <mesh position={[0, DECK_Y + 0.55, BRIDGE_Z - 1.8]}>
        <boxGeometry args={[DECK_LEN, 0.6, 0.18]} />
        <meshStandardMaterial color="#c4c9ce" />
      </mesh>
      <mesh position={[0, DECK_Y + 0.55, BRIDGE_Z + 1.8]}>
        <boxGeometry args={[DECK_LEN, 0.6, 0.18]} />
        <meshStandardMaterial color="#c4c9ce" />
      </mesh>
      {/* support piers into the water */}
      {[-PYLON_X, PYLON_X].map((x) => (
        <mesh key={x} position={[x, DECK_Y / 2 - 0.4, BRIDGE_Z]}>
          <boxGeometry args={[2.2, DECK_Y + 0.8, 2.2]} />
          <meshStandardMaterial color="#b7bbbf" roughness={0.9} />
        </mesh>
      ))}

      <Pylon x={-PYLON_X} />
      <Pylon x={PYLON_X} />

      {/* far bank strip */}
      <mesh position={[0, 0.2, -52]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 16]} />
        <meshStandardMaterial color="#6e7d54" roughness={1} />
      </mesh>

      {/* Petrovaradin fortress: a hill with a clock tower on the right bank */}
      <group position={[26, 0, -46]}>
        <mesh position={[0, 3, 0]} castShadow>
          <coneGeometry args={[9, 7, 6]} />
          <meshStandardMaterial color="#7c8a5e" roughness={1} />
        </mesh>
        {/* rampart block */}
        <mesh position={[0, 6.6, 0]}>
          <boxGeometry args={[6, 2.2, 6]} />
          <meshStandardMaterial color="#c9bda0" roughness={1} />
        </mesh>
        {/* clock tower */}
        <mesh position={[0, 9.6, 0]} castShadow>
          <boxGeometry args={[1.8, 4.4, 1.8]} />
          <meshStandardMaterial color="#e6ddc8" roughness={1} />
        </mesh>
        <mesh position={[0, 12.2, 0]}>
          <coneGeometry args={[1.5, 1.6, 4]} />
          <meshStandardMaterial color="#7a3b2e" roughness={1} />
        </mesh>
      </group>

      {/* a few distant city blocks on the left bank */}
      {[
        { x: -30, h: 9, w: 5 },
        { x: -22, h: 13, w: 6 },
        { x: -14, h: 8, w: 5 },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, -50]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color="#9fa6ad" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
