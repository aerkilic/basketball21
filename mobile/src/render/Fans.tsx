// Fans: instanced crowd stands around the court in the home team's colours. They
// bob constantly, jump on big moments (screen-shake "hype"), and rise to their feet
// to jeer when the opponent has the ball (crowdAgitation).
import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Simulation } from "../game/Simulation";
import { COURT, BackdropKind } from "../game/constants";

interface FanDef {
  x: number;
  z: number;
  baseY: number;
  phase: number;
  scale: number;
  shade: number; // brightness variation for the jersey colour
  riseThreshold: number; // agitation level at which this fan stands up (staggers the wave)
  stand: number; // smoothed 0..1 standing factor, mutated each frame
}

const SKIN = "#c89a6a";

export function Fans({ sim, backdrop = "classic" }: { sim: Simulation; backdrop?: BackdropKind }) {
  // on the beach the crowd sits only on the left/right stands so the sea is open
  const sideOnly = backdrop === "beach";
  const slabColor = backdrop === "beach" ? "#b98a52" : "#374151";
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const lastColor = useRef("");

  const fans = useMemo<FanDef[]>(() => {
    const out: FanDef[] = [];
    const add = (x: number, z: number) =>
      out.push({
        x: x + (Math.random() - 0.5) * 0.3,
        z: z + (Math.random() - 0.5) * 0.2,
        baseY: 0.55,
        phase: Math.random() * Math.PI * 2,
        scale: 0.85 + Math.random() * 0.3,
        shade: 0.75 + Math.random() * 0.5,
        riseThreshold: 0.15 + Math.random() * 0.7, // some pop up early, some never quite
        stand: 0,
      });
    // rows behind the hoop (skipped on the beach so the sea stays visible)
    if (!sideOnly) {
      for (let r = 0; r < 3; r++) {
        for (let x = -7; x <= 7; x += 1.4) add(x, COURT.zBack - 1.0 - r * 1.1);
      }
    }
    // left + right stands (always)
    for (let r = 0; r < 2; r++) {
      for (let z = COURT.zBack; z <= COURT.zFront; z += 1.7) {
        add(-COURT.halfWidth - 1.0 - r * 1.0, z);
        add(COURT.halfWidth + 1.0 + r * 1.0, z);
      }
    }
    return out;
  }, [sideOnly]);

  const count = fans.length;

  // set head colours once (uniform skin)
  useEffect(() => {
    const h = heads.current;
    if (!h) return;
    tmpColor.set(SKIN);
    for (let i = 0; i < count; i++) h.setColorAt(i, tmpColor);
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
  }, [count, tmpColor]);

  useFrame((_, _dt) => {
    const g = sim.state;
    const b = bodies.current;
    const h = heads.current;
    if (!b || !h) return;

    // recolour bodies to the home jersey when it changes
    const homeColor = g.homeIsUser ? g.players[0].jersey : g.players[2].jersey;
    if (homeColor !== lastColor.current) {
      lastColor.current = homeColor;
      const base = new THREE.Color(homeColor);
      for (let i = 0; i < count; i++) {
        tmpColor.copy(base).multiplyScalar(fans[i].shade);
        b.setColorAt(i, tmpColor);
      }
      if (b.instanceColor) b.instanceColor.needsUpdate = true;
    }

    const t = _.clock.elapsedTime;
    const hype = g.shake;
    const agit = g.crowdAgitation || 0; // 0..1: opponent has the ball -> crowd on its feet
    const lerp = Math.min(1, _dt * 4); // smoothing for the stand transition
    for (let i = 0; i < count; i++) {
      const f = fans[i];
      // each fan stands once agitation passes their personal threshold; the spread
      // makes the crowd rise as a staggered wave rather than all at once
      const wantStand = agit > f.riseThreshold ? 1 : 0;
      f.stand += (wantStand - f.stand) * lerp;
      // bob harder both on screen-shake hype and while standing/jeering
      const bobAmp = 0.05 + hype * 0.55 + f.stand * 0.22;
      const bob = Math.abs(Math.sin(t * (3 + f.stand * 2.5) + f.phase)) * bobAmp;
      const y = f.baseY + f.stand * 0.3 + bob; // standing lifts the whole body up
      dummy.position.set(f.x, y, f.z);
      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.34 * f.scale;
      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
    }
    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* bleacher slabs — back slab dropped on the beach so the sea stays open */}
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

      <instancedMesh ref={bodies} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.32, 0.4, 0.24]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
