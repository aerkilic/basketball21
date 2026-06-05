// Fans: instanced crowd in the home team's colours. Figures vary in size and shape
// (men / women / children), have varied skin and hair, bob/stand with the action,
// and many of them wave home-coloured flags.
import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Simulation } from "../game/Simulation";
import { COURT, BackdropKind } from "../game/constants";

type FanKind = "m" | "f" | "c";

interface FanDef {
  x: number;
  z: number;
  baseY: number;
  phase: number;
  shade: number; // brightness variation for the shirt colour
  riseThreshold: number;
  stand: number; // smoothed 0..1 standing factor, mutated each frame
  kind: FanKind;
  bw: number; // body width multiplier
  bh: number; // body height multiplier
  headMul: number;
  skin: string;
  hair: string | null; // null = no hair (cap/bald)
  flag: boolean;
}

const SKINS = ["#f1c27d", "#e8b98c", "#d49a6a", "#c68642", "#8d5524", "#a8754a"];
const HAIRS = ["#2b2118", "#1a1a1a", "#4a2f1a", "#6b4423", "#caa64b", "#9a9a9a", null, null];
const POLE = "#6b7280";

function makeKind(kind: FanKind) {
  const j = (a: number, b: number) => a + Math.random() * (b - a);
  if (kind === "c") return { bw: j(0.7, 0.85), bh: j(0.55, 0.72), headMul: j(0.95, 1.08) };
  if (kind === "f") return { bw: j(0.8, 0.92), bh: j(0.92, 1.04), headMul: j(0.9, 0.98) };
  return { bw: j(1.0, 1.18), bh: j(1.0, 1.16), headMul: j(0.98, 1.06) }; // man
}

export function Fans({ sim, backdrop = "classic" }: { sim: Simulation; backdrop?: BackdropKind }) {
  const sideOnly = backdrop === "beach";
  const slabColor = backdrop === "beach" ? "#b98a52" : "#374151";
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const hairs = useRef<THREE.InstancedMesh>(null);
  const poles = useRef<THREE.InstancedMesh>(null);
  const cloths = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const lastColor = useRef("");
  const lastClothColor = useRef("");

  const fans = useMemo<FanDef[]>(() => {
    const out: FanDef[] = [];
    const add = (x: number, z: number) => {
      const r = Math.random();
      const kind: FanKind = r < 0.45 ? "m" : r < 0.78 ? "f" : "c";
      const dims = makeKind(kind);
      out.push({
        x: x + (Math.random() - 0.5) * 0.35,
        z: z + (Math.random() - 0.5) * 0.25,
        baseY: 0.5,
        phase: Math.random() * Math.PI * 2,
        shade: 0.78 + Math.random() * 0.44,
        riseThreshold: 0.15 + Math.random() * 0.7,
        stand: 0,
        kind,
        ...dims,
        skin: SKINS[Math.floor(Math.random() * SKINS.length)],
        hair: HAIRS[Math.floor(Math.random() * HAIRS.length)],
        // adults wave flags (not kids)
        flag: kind !== "c" && Math.random() < 0.4,
      });
    };
    if (!sideOnly) {
      for (let r = 0; r < 3; r++) {
        for (let x = -7; x <= 7; x += 1.3) add(x, COURT.zBack - 1.0 - r * 1.1);
      }
    }
    for (let r = 0; r < 2; r++) {
      for (let z = COURT.zBack; z <= COURT.zFront; z += 1.6) {
        add(-COURT.halfWidth - 1.0 - r * 1.0, z);
        add(COURT.halfWidth + 1.0 + r * 1.0, z);
      }
    }
    return out;
  }, [sideOnly]);

  const count = fans.length;
  const flagOwners = useMemo(() => fans.map((f, i) => (f.flag ? i : -1)).filter((i) => i >= 0), [fans]);
  const flagCount = Math.max(1, flagOwners.length);
  const fanY = useMemo(() => new Float32Array(count), [count]);

  // skin + hair colours are fixed per fan
  useEffect(() => {
    const h = heads.current;
    const hr = hairs.current;
    for (let i = 0; i < count; i++) {
      if (h) h.setColorAt(i, tmpColor.set(fans[i].skin));
      if (hr) hr.setColorAt(i, tmpColor.set(fans[i].hair ?? fans[i].skin));
    }
    if (h?.instanceColor) h.instanceColor.needsUpdate = true;
    if (hr?.instanceColor) hr.instanceColor.needsUpdate = true;
  }, [count, fans, tmpColor]);

  useFrame((_, _dt) => {
    const g = sim.state;
    const b = bodies.current;
    const h = heads.current;
    const hr = hairs.current;
    const pl = poles.current;
    const cl = cloths.current;
    if (!b || !h || !hr) return;

    // shirts + flags use the HOME team's colour (home crowd). At your home games
    // that's your team; at away games it's the opponent's.
    const fanColor = g.homeIsUser ? g.players[0].jersey : g.players[2].jersey;
    const base = new THREE.Color(fanColor);
    if (fanColor !== lastColor.current) {
      lastColor.current = fanColor;
      for (let i = 0; i < count; i++) b.setColorAt(i, tmpColor.copy(base).multiplyScalar(fans[i].shade));
      if (b.instanceColor) b.instanceColor.needsUpdate = true;
    }
    // recolour flags independently (their mesh may mount a frame after the bodies)
    if (cl && fanColor !== lastClothColor.current) {
      lastClothColor.current = fanColor;
      for (let s = 0; s < flagOwners.length; s++)
        cl.setColorAt(s, tmpColor.copy(base).multiplyScalar(fans[flagOwners[s]].shade));
      if (cl.instanceColor) cl.instanceColor.needsUpdate = true;
    }

    const t = _.clock.elapsedTime;
    const hype = g.shake;
    const agit = g.crowdAgitation || 0;
    const lerp = Math.min(1, _dt * 4);
    for (let i = 0; i < count; i++) {
      const f = fans[i];
      const wantStand = agit > f.riseThreshold ? 1 : 0;
      f.stand += (wantStand - f.stand) * lerp;
      const bobAmp = 0.05 + hype * 0.55 + f.stand * 0.22;
      const bob = Math.abs(Math.sin(t * (3 + f.stand * 2.5) + f.phase)) * bobAmp;
      const y = f.baseY + f.stand * 0.3 + bob;
      fanY[i] = y;
      // body (non-uniform: width vs height -> body types)
      dummy.position.set(f.x, y, f.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(f.bw, f.bh, f.bw);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      // head sits on top of the body
      const headY = y + 0.21 * f.bh + 0.12 * f.headMul;
      dummy.position.set(f.x, headY, f.z);
      dummy.scale.setScalar(f.headMul);
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
      // hair cap (scaled to ~0 when bald)
      dummy.position.set(f.x, headY + 0.07 * f.headMul, f.z);
      dummy.scale.set(f.hair ? f.headMul : 0.0001, f.hair ? f.headMul : 0.0001, f.hair ? f.headMul : 0.0001);
      dummy.updateMatrix();
      hr.setMatrixAt(i, dummy.matrix);
    }
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    hr.instanceMatrix.needsUpdate = true;

    // raised, waving flags in the home colour
    if (pl && cl) {
      for (let s = 0; s < flagOwners.length; s++) {
        const f = fans[flagOwners[s]];
        const y = fanY[flagOwners[s]];
        const sway = Math.sin(t * 2.2 + f.phase) * 0.28;
        const wave = Math.sin(t * 4 + f.phase) * 0.7;
        const baseTop = y + 0.3;
        dummy.position.set(f.x, baseTop + 0.7, f.z);
        dummy.rotation.set(0, 0, sway);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        pl.setMatrixAt(s, dummy.matrix);
        dummy.position.set(f.x + 0.36 + sway * 0.6, baseTop + 1.2, f.z);
        dummy.rotation.set(0, wave, sway);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        cl.setMatrixAt(s, dummy.matrix);
      }
      pl.instanceMatrix.needsUpdate = true;
      cl.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {!sideOnly && (
        <mesh position={[0, 0.2, COURT.zBack - 2.0]}>
          <boxGeometry args={[16, 0.4, 3.6]} />
          <meshStandardMaterial color={slabColor} roughness={1} />
        </mesh>
      )}
      <mesh position={[-COURT.halfWidth - 1.6, 0.2, (COURT.zBack + COURT.zFront) / 2]}>
        <boxGeometry args={[2.4, 0.4, COURT.zFront - COURT.zBack]} />
        <meshStandardMaterial color={slabColor} roughness={1} />
      </mesh>
      <mesh position={[COURT.halfWidth + 1.6, 0.2, (COURT.zBack + COURT.zFront) / 2]}>
        <boxGeometry args={[2.4, 0.4, COURT.zFront - COURT.zBack]} />
        <meshStandardMaterial color={slabColor} roughness={1} />
      </mesh>

      {/* shirts (team colour) */}
      <instancedMesh ref={bodies} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.3, 0.42, 0.22]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {/* heads (skin tone) */}
      <instancedMesh ref={heads} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {/* hair caps */}
      <instancedMesh ref={hairs} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.125, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>

      {/* flag poles + waving cloths (home colours) */}
      <instancedMesh ref={poles} args={[undefined, undefined, flagCount]}>
        <cylinderGeometry args={[0.024, 0.024, 1.4, 5]} />
        <meshStandardMaterial color={POLE} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={cloths} args={[undefined, undefined, flagCount]}>
        <boxGeometry args={[0.72, 0.46, 0.03]} />
        <meshStandardMaterial roughness={0.7} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
