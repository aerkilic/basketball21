// GameCanvas: the expo-gl backed R3F canvas hosting the 3D scene. The clear colour
// switches to a soft sunrise sky for the Cappadocia backdrop.
import React from "react";
import { Canvas } from "@react-three/fiber/native";
import { Simulation } from "../game/Simulation";
import { BackdropKind } from "../game/constants";
import { cityBackdropById } from "../game/cityBackgrounds";
import { Scene, HudSnapshot } from "./Scene";

const GAME_CAMERA_FOV = 56;
const GAME_CAMERA_Z = 7.4;

export function GameCanvas({
  sim,
  onHud,
  backdrop = "classic",
}: {
  sim: Simulation;
  onHud: (s: HudSnapshot) => void;
  backdrop?: BackdropKind;
}) {
  const cityBackdrop = cityBackdropById(backdrop);
  const sky =
    cityBackdrop?.sky ??
    (backdrop === "cappadocia"
      ? "#dce6ec"
      : backdrop === "novisad"
      ? "#9ec6e6"
      : backdrop === "beach"
      ? "#7fc4e8"
      : backdrop === "erciyes"
      ? "#c8dceb"
      : backdrop === "petrovaradin"
      ? "#b8d4e6"
      : "#1f2530");
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      camera={{ position: [0, 8.6, GAME_CAMERA_Z], fov: GAME_CAMERA_FOV, near: 0.1, far: 200 }}
      onCreated={(state) => {
        state.gl.setClearColor(sky);
      }}
    >
      <Scene sim={sim} onHud={onHud} backdrop={backdrop} />
    </Canvas>
  );
}
