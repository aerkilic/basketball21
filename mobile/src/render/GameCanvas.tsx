// GameCanvas: the expo-gl backed R3F canvas hosting the 3D scene.
import React from "react";
import { Canvas } from "@react-three/fiber/native";
import { Simulation } from "../game/Simulation";
import { Scene, HudSnapshot } from "./Scene";

export function GameCanvas({
  sim,
  onHud,
}: {
  sim: Simulation;
  onHud: (s: HudSnapshot) => void;
}) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      camera={{ position: [0, 8.6, 6.8], fov: 52, near: 0.1, far: 60 }}
      onCreated={(state) => {
        state.gl.setClearColor("#1f2530");
      }}
    >
      <Scene sim={sim} onHud={onHud} />
    </Canvas>
  );
}
