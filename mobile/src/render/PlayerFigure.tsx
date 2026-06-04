// PlayerFigure: a stylized humanoid built from primitives with procedural,
// sport-like animation driven entirely by the simulation's player state.
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Simulation } from "../game/Simulation";

const SKIN = "#b07a52";

export function PlayerFigure({ sim, index }: { sim: Simulation; index: number }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Group>(null);

  const p0 = sim.state.players[index];
  const jersey = p0.jersey;
  const h = p0.stats.height;

  useFrame((_, dt) => {
    const p = sim.state.players[index];
    const g = root.current;
    if (!g) return;

    g.position.set(p.pos.x, p.jumpY, p.pos.z);
    g.rotation.y = p.heading;

    const phase = p.animPhase * Math.PI * 2;
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const running = p.anim === "run" || p.anim === "dribble";
    // how high in the jump we are (0 ground .. 1 apex), used to time releases
    const air = Math.min(1, p.jumpY / 0.7);

    let legSwing = 0;
    let legSplit = 0; // legs apart (jump/dunk)
    let armSwingL = 0;
    let armSwingR = 0;
    let bodyLean = 0;
    let bodyTilt = 0;
    let crouch = 0; // lowers the torso (gather)
    let armRaiseL = 0;
    let armRaiseR = 0;

    if (running) {
      const gait = Math.min(1, speed / 4);
      legSwing = Math.sin(phase) * gait * 1.0;
      armSwingL = -legSwing * 0.7;
      armSwingR = legSwing * 0.7;
      bodyLean = 0.14 + Math.min(0.18, speed * 0.02);
    } else if (p.anim === "windup") {
      // gather: crouch, ball brought up to shoulder, elbows cocked
      armRaiseL = -1.9;
      armRaiseR = -2.2;
      bodyLean = -0.06;
      crouch = 0.18;
      legSplit = 0.15;
    } else if (p.anim === "jumpshot") {
      // extend fully as we rise, then a follow-through flick near apex
      const ext = 0.6 + air * 0.4;
      armRaiseL = -2.6 * ext;
      armRaiseR = -2.95 * ext - (air > 0.7 ? 0.25 : 0); // wrist snap
      bodyLean = -0.05 - air * 0.05;
      legSplit = 0.2 + air * 0.1;
    } else if (p.anim === "dunk") {
      // ball overhead on the way up, then a hard arm-slam down into the rim
      const prog = Math.max(0, Math.min(1, 1 - p.dunkT / 0.85));
      let slam: number;
      if (prog < 0.45) slam = -3.1; // reach high with the ball
      else if (prog < 0.7) slam = -3.1 + ((prog - 0.45) / 0.25) * 2.7; // chop down
      else slam = -0.4; // follow-through, hand through the hoop
      armRaiseR = slam;
      armRaiseL = -1.2;
      legSplit = 0.45;
      bodyLean = -0.1 + prog * 0.25;
    } else if (p.anim === "layup") {
      armRaiseR = -2.6;
      armRaiseL = -1.2;
      legSwing = 0.7;
      bodyLean = -0.1;
    } else if (p.anim === "jump") {
      // one-arm leap to contest — block / rebound / challenge a dunk
      armRaiseR = -3.0; // right arm reaches high
      armRaiseL = -0.5; // left arm stays low for balance
      legSplit = 0.22;
      bodyLean = -0.05;
    } else if (p.anim === "steal") {
      armRaiseR = -1.5; // reach in
      armSwingR = Math.sin(_.clock.elapsedTime * 30) * 0.3;
      bodyLean = 0.34;
    } else if (p.anim === "crossover") {
      // low handle swinging side to side through the legs
      armSwingL = Math.sin(phase) * 0.8;
      armSwingR = -armSwingL * 0.6;
      bodyTilt = Math.sin(phase) * 0.3;
      crouch = 0.22;
      legSplit = 0.3;
    } else if (p.anim === "fall") {
      bodyTilt = 1.2;
    } else {
      armSwingL = Math.sin(_.clock.elapsedTime * 2) * 0.05;
      armSwingR = -armSwingL;
    }

    if (lLeg.current) lLeg.current.rotation.x = legSwing - legSplit;
    if (rLeg.current) rLeg.current.rotation.x = -legSwing - legSplit;
    if (lArm.current) lArm.current.rotation.x = armRaiseL + armSwingL;
    if (rArm.current) rArm.current.rotation.x = armRaiseR + armSwingR;
    if (body.current) {
      body.current.rotation.x = bodyLean;
      body.current.rotation.z = bodyTilt;
      body.current.position.y = 0.95 * h - crouch * h;
    }

    if (marker.current) {
      marker.current.visible = p.isUserControlled && p.team === "USER";
      marker.current.rotation.y += dt * 2;
      marker.current.position.y = 2.5 * h + Math.sin(_.clock.elapsedTime * 4) * 0.08;
    }
  });

  return (
    <group ref={root}>
      {/* shadow blob */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} />
      </mesh>

      <group ref={body} position={[0, 0.95 * h, 0]}>
        {/* torso */}
        <mesh position={[0, 0.05 * h, 0]} castShadow>
          <capsuleGeometry args={[0.22 * h, 0.5 * h, 4, 10]} />
          <meshStandardMaterial color={jersey} roughness={0.6} />
        </mesh>
        {/* shoulders accent */}
        <mesh position={[0, 0.32 * h, 0]}>
          <boxGeometry args={[0.52 * h, 0.12 * h, 0.28 * h]} />
          <meshStandardMaterial color={jersey} roughness={0.6} />
        </mesh>
        {/* head */}
        <mesh position={[0, 0.62 * h, 0]} castShadow>
          <sphereGeometry args={[0.16 * h, 16, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} />
        </mesh>
        {/* headband */}
        <mesh position={[0, 0.68 * h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16 * h, 0.03 * h, 8, 16]} />
          <meshStandardMaterial color={p0.team === "USER" ? "#fbbf24" : "#fde68a"} />
        </mesh>

        {/* arms (pivot at shoulder) — with visible hands for blocks/steals */}
        <group ref={lArm} position={[-0.3 * h, 0.28 * h, 0]}>
          <mesh position={[0, -0.3 * h, 0]} castShadow>
            <capsuleGeometry args={[0.075 * h, 0.5 * h, 4, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.6 * h, 0]} castShadow>
            <sphereGeometry args={[0.11 * h, 12, 12]} />
            <meshStandardMaterial color={SKIN} roughness={0.65} />
          </mesh>
        </group>
        <group ref={rArm} position={[0.3 * h, 0.28 * h, 0]}>
          <mesh position={[0, -0.3 * h, 0]} castShadow>
            <capsuleGeometry args={[0.075 * h, 0.5 * h, 4, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.6 * h, 0]} castShadow>
            <sphereGeometry args={[0.11 * h, 12, 12]} />
            <meshStandardMaterial color={SKIN} roughness={0.65} />
          </mesh>
        </group>
      </group>

      {/* legs (pivot at hip) */}
      <group ref={lLeg} position={[-0.12 * h, 0.92 * h, 0]}>
        <mesh position={[0, -0.45 * h, 0]} castShadow>
          <capsuleGeometry args={[0.09 * h, 0.6 * h, 4, 8]} />
          <meshStandardMaterial color="#1f2937" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.82 * h, 0.06]}>
          <boxGeometry args={[0.16 * h, 0.1 * h, 0.32 * h]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>
      <group ref={rLeg} position={[0.12 * h, 0.92 * h, 0]}>
        <mesh position={[0, -0.45 * h, 0]} castShadow>
          <capsuleGeometry args={[0.09 * h, 0.6 * h, 4, 8]} />
          <meshStandardMaterial color="#1f2937" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.82 * h, 0.06]}>
          <boxGeometry args={[0.16 * h, 0.1 * h, 0.32 * h]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>

      {/* active-player marker: floating ring + arrow */}
      <group ref={marker} position={[0, 2.5 * h, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.05, 8, 20]} />
          <meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, -0.18, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.22, 4]} />
          <meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
