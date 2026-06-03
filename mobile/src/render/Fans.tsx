// Fans: instanced crowd stands around the court in the home team's colours. They
// bob constantly and jump on big moments (driven by the screen-shake "hype").
import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Simulation } from "../game/Simulation";
import { COURT } from "../game/constants";

interface FanDef {
  x: number;
  z: number;
  baseY: number;
  phase: number;
  scale: number;
  shade: number; // brightness variation for the jersey colour
}

const SKIN = "#c89a6a";

export function Fans({ sim }: { sim: Simulation }) {
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
      });
    for (let r = 0; r < 3; r++) {
      for (let x = -7; x <= 7; x += 1.4) add(x, COURT.zBack - 1.0 - r * 1.1);
    }
    for (let r = 0; r < 2; r++) {
      for (let z = COURT.zBack; z <= COURT.zFront; z += 1.7) {
        add(-COURT.halfWidth - 1.0 - r * 1.0, z);
        add(COURT.halfWidth + 1.0 + r * 1.0, z);
      }
    }
    return out;
  }, []);

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
    for (let i = 0; i < count; i++) {
      const f = fans[i];
      const bob = Math.abs(Math.sin(t * 3 + f.phase)) * (0.05 + hype * 0.55);
      const y = f.baseY + bob;
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
      {/* bleacher slabs */}
      <mesh position={[0, 0.2, COURT.zBack - 2.0]}>
        <boxGeometry args={[16, 0.4, 3.6]} />
        <meshStandardMaterial color="#374151" roughness={1} />
      </mesh>
      <mesh position={[-COURT.halfWidth - 1.6, 0.2, (COURT.zBack + COURT.zFront) / 2]}>
        <boxGeometry args={[2.4, 0.4, COURT.zFront - COURT.zBack]} />
        <meshStandardMaterial color="#374151" roughness={1} />
      </mesh>
      <mesh position={[COURT.halfWidth + 1.6, 0.2, (COURT.zBack + COURT.zFront) / 2]}>
        <boxGeometry args={[2.4, 0.4, COURT.zFront - COURT.zBack]} />
        <meshStandardMaterial color="#374151" roughness={1} />
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
