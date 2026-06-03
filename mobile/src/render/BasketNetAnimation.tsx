// BasketNetAnimation: a lightweight verlet-simulated net hanging from the rim,
// plus rim shake. Reacts to made shots (hoopFx) and the ball passing through.
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Simulation } from "../game/Simulation";
import { HOOP, BALL_RADIUS } from "../game/constants";

const STRANDS = 12;
const LEVELS = 5; // including fixed top ring
const NET_HEIGHT = 0.5;
const BOTTOM_RADIUS = 0.1;

interface Node {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
  fixed: boolean;
}

export function BasketNetAnimation({
  sim,
  position,
}: {
  sim: Simulation;
  position: [number, number, number];
}) {
  const rimGroup = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.LineSegments>(null);

  // Build nodes (local space, rim plane at y=0, hanging down -y).
  const { nodes, constraintPairs, restLen, renderPairs } = useMemo(() => {
    const nodes: Node[] = [];
    const R = HOOP.rimRadius;
    for (let s = 0; s < STRANDS; s++) {
      const a = (s / STRANDS) * Math.PI * 2;
      for (let l = 0; l < LEVELS; l++) {
        const t = l / (LEVELS - 1);
        const radius = R * (1 - t) + BOTTOM_RADIUS * t;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const y = -NET_HEIGHT * t;
        nodes.push({ x, y, z, px: x, py: y, pz: z, rx: x, ry: y, rz: z, fixed: l === 0 });
      }
    }
    const idx = (s: number, l: number) => s * LEVELS + l;
    const constraintPairs: [number, number][] = [];
    const restLen: number[] = [];
    const renderPairs: [number, number][] = [];
    for (let s = 0; s < STRANDS; s++) {
      for (let l = 0; l < LEVELS - 1; l++) {
        const a = idx(s, l);
        const b = idx(s, l + 1);
        constraintPairs.push([a, b]);
        restLen.push(dist(nodes[a], nodes[b]));
        renderPairs.push([a, b]); // vertical strand
        // diagonal mesh links (render only) form the visible net diamonds
        renderPairs.push([a, idx((s + 1) % STRANDS, l + 1)]);
        renderPairs.push([idx((s + 1) % STRANDS, l), b]);
      }
      // horizontal ring links (skip top fixed ring — it's rigid already)
      for (let l = 1; l < LEVELS; l++) {
        const a = idx(s, l);
        const b = idx((s + 1) % STRANDS, l);
        constraintPairs.push([a, b]);
        restLen.push(dist(nodes[a], nodes[b]));
        renderPairs.push([a, b]);
      }
    }
    return { nodes, constraintPairs, restLen, renderPairs };
  }, []);

  const positions = useMemo(() => new Float32Array(renderPairs.length * 2 * 3), [renderPairs]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.033, dtRaw);
    const g = sim.state.hoopFx;

    // ---- rim shake ----
    if (rimGroup.current) {
      const t = _.clock.elapsedTime;
      const sh = g.rimShake;
      rimGroup.current.position.x = position[0] + Math.sin(t * 40) * 0.03 * sh;
      rimGroup.current.position.y = position[1] - Math.abs(Math.sin(t * 35)) * 0.04 * sh;
      rimGroup.current.rotation.z = Math.sin(t * 38) * 0.05 * sh;
    }

    // ---- net verlet ----
    const damp = 0.92;
    const pull = g.netImpulse; // 0..1 decaying — pulls net down & swings
    const swing = g.netSwingDir;

    // ball position in net-local space
    const b = sim.state.ball.pos;
    const blx = b.x - position[0];
    const bly = b.y - position[1];
    const blz = b.z - position[2];
    const ballNear =
      sim.state.ball.mode === "flight" || sim.state.ball.mode === "loose"
        ? bly < 0.1 && bly > -NET_HEIGHT - 0.3 && Math.hypot(blx, blz) < HOOP.rimRadius + 0.2
        : false;

    for (const n of nodes) {
      if (n.fixed) continue;
      const t = -n.ry / NET_HEIGHT; // 0 top .. 1 bottom
      // verlet integrate
      const vx = (n.x - n.px) * damp;
      const vy = (n.y - n.py) * damp;
      const vz = (n.z - n.pz) * damp;
      n.px = n.x;
      n.py = n.y;
      n.pz = n.z;

      // forces
      let ax = (n.rx - n.x) * 60; // spring to rest shape
      let ay = (n.ry - n.y) * 60 - 9.0; // gravity
      let az = (n.rz - n.z) * 60;
      // made-shot pull: yank lower nodes down + swing sideways
      ay -= pull * 30 * t;
      ax += swing * pull * 22 * t;

      n.x += vx + ax * dt * dt;
      n.y += vy + ay * dt * dt;
      n.z += vz + az * dt * dt;

      // ball pushes the net outward/down as it passes through
      if (ballNear) {
        const dx = n.x - blx;
        const dy = n.y - bly;
        const dz = n.z - blz;
        const d = Math.hypot(dx, dy, dz);
        const rad = BALL_RADIUS + 0.05;
        if (d < rad) {
          const push = (rad - d) / rad;
          const inv = 1 / (d || 0.001);
          n.x += dx * inv * push * 0.08;
          n.y -= push * 0.06;
          n.z += dz * inv * push * 0.08;
        }
      }
    }

    // constraints (few iterations)
    for (let it = 0; it < 3; it++) {
      for (let k = 0; k < constraintPairs.length; k++) {
        const [ia, ib] = constraintPairs[k];
        const a = nodes[ia];
        const nb = nodes[ib];
        const dx = nb.x - a.x;
        const dy = nb.y - a.y;
        const dz = nb.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 0.0001;
        const diff = (d - restLen[k]) / d;
        const ma = a.fixed ? 0 : nb.fixed ? 1 : 0.5;
        const mb = nb.fixed ? 0 : a.fixed ? 1 : 0.5;
        a.x += dx * diff * ma;
        a.y += dy * diff * ma;
        a.z += dz * diff * ma;
        nb.x -= dx * diff * mb;
        nb.y -= dy * diff * mb;
        nb.z -= dz * diff * mb;
      }
    }

    // write line vertices
    const arr = positions;
    let o = 0;
    for (const [ia, ib] of renderPairs) {
      const a = nodes[ia];
      const nb = nodes[ib];
      arr[o++] = a.x;
      arr[o++] = a.y;
      arr[o++] = a.z;
      arr[o++] = nb.x;
      arr[o++] = nb.y;
      arr[o++] = nb.z;
    }
    const geo = lineRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (geo) {
      const attr = geo.getAttribute("position") as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }
  });

  return (
    <group ref={rimGroup} position={position}>
      {/* rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[HOOP.rimRadius, 0.032, 12, 28]} />
        <meshStandardMaterial color="#ff7a1a" emissive="#ff5500" emissiveIntensity={0.35} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* net — bright white mesh of diamonds */}
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </lineSegments>
    </group>
  );
}

function dist(a: Node, b: Node) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
