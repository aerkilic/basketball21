// BallMesh: the basketball + a motion trail during a shot. Reads sim ball state.
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Simulation } from "../game/Simulation";
import { BALL_RADIUS } from "../game/constants";

const TRAIL = 8;

export function BallMesh({ sim }: { sim: Simulation }) {
  const g = useRef<THREE.Group>(null);
  const trailRefs = useRef<(THREE.Mesh | null)[]>([]);
  const history = useRef<THREE.Vector3[]>(
    Array.from({ length: TRAIL }, () => new THREE.Vector3())
  );

  useFrame(() => {
    const b = sim.state.ball;
    if (!g.current) return;
    g.current.position.set(b.pos.x, b.pos.y, b.pos.z);

    const speed = Math.hypot(b.vel.x, b.vel.z);
    if (speed > 0.1) {
      g.current.rotation.x += b.vel.z * 0.06;
      g.current.rotation.z -= b.vel.x * 0.06;
    } else {
      g.current.rotation.y = b.spin;
    }

    // motion trail only while the ball is a live shot
    const show = b.mode === "flight";
    const h = history.current;
    if (show) {
      // shift history
      for (let i = h.length - 1; i > 0; i--) h[i].copy(h[i - 1]);
      h[0].set(b.pos.x, b.pos.y, b.pos.z);
    }
    for (let i = 0; i < TRAIL; i++) {
      const m = trailRefs.current[i];
      if (!m) continue;
      if (show) {
        m.position.copy(h[i]);
        const t = 1 - i / TRAIL;
        const s = t * 0.85;
        m.scale.setScalar(s);
        (m.material as THREE.MeshBasicMaterial).opacity = t * 0.4;
        m.visible = true;
      } else {
        m.visible = false;
      }
    }
  });

  return (
    <>
      <group ref={g}>
        <mesh castShadow>
          <sphereGeometry args={[BALL_RADIUS, 20, 20]} />
          <meshStandardMaterial color="#e2682a" roughness={0.7} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[BALL_RADIUS, 0.006, 6, 24]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh>
          <torusGeometry args={[BALL_RADIUS, 0.006, 6, 24]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[BALL_RADIUS, 0.006, 6, 24]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* trail */}
      {Array.from({ length: TRAIL }).map((_, i) => (
        <mesh key={i} ref={(m) => (trailRefs.current[i] = m)} visible={false}>
          <sphereGeometry args={[BALL_RADIUS, 8, 8]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
