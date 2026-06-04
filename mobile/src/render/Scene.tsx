// Scene: lights + all 3D objects, plus the central Stepper that advances the
// simulation, drives the broadcast camera and fires audio/HUD updates.
import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Simulation } from "../game/Simulation";
import { Court } from "./Court";
import { Hoop } from "./Hoop";
import { BallMesh } from "./BallMesh";
import { PlayerFigure } from "./PlayerFigure";
import { Fans } from "./Fans";
import { Sound, SfxName } from "../audio/SoundManager";
import { GameEvent } from "../game/types";
import { BackdropKind } from "../game/constants";
import { cityBackdropById } from "../game/cityBackgrounds";
import { CappadociaScene } from "./CappadociaBackdrop";
import { NoviSadScene } from "./NoviSadBackdrop";
import { BeachScene } from "./BeachBackdrop";
import { ErciyesScene } from "./ErciyesBackdrop";
import { PetrovaradinScene } from "./PetrovaradinBackdrop";
import { CityBackdropScene } from "./CityBackdrop";

export interface HudSnapshot {
  scoreUser: number;
  scoreCpu: number;
  foulUser: number;
  foulCpu: number;
  phase: string;
  possession: string;
  winner: string | null;
  draw: boolean;
  mode: string;
  scoreTarget: number;
  clock: number;
  userName: string;
  cpuName: string;
  homeIsUser: boolean;
  messages: { key: string; params?: Record<string, string | number> }[];
}

const EVENT_SFX: Partial<Record<GameEvent["type"], SfxName>> = {
  swish: "swish",
  rimhit: "rimhit",
  dunk: "dunk",
  block: "block",
  steal: "steal",
  pass: "pass",
  dribble: "dribble",
  shoot: "shoot",
  whistle: "whistle",
  foul: "whistle",
  cheer: "cheer",
  chant: "chant",
  buzzer: "buzzer",
};

const CAMERA_BACK_OFFSET = 0.6;
const OUTDOOR_CAMERA_TARGET_Y = 2.0; // look mostly at the court, a little sky above
const OUTDOOR_FOV = 60; // slightly wider than indoors, but not zoomed far out
const INDOOR_FOV = 56;

function Stepper({ sim, onHud }: { sim: Simulation; onHud: (s: HudSnapshot) => void }) {
  const { camera } = useThree();
  const lastHud = useRef("");
  const camTarget = useRef(new THREE.Vector3());

  useFrame((_, dtRaw) => {
    if (sim.paused) return; // frozen — no step, no audio, no camera move
    sim.step(dtRaw);
    const g = sim.state;

    // ---- audio ----
    for (const e of g.events) {
      const sfx = EVENT_SFX[e.type];
      if (!sfx) continue;
      let vol = e.type === "dribble" ? 0.5 : 1;
      if (e.data?.crowd) vol = e.data?.soft ? 0.35 : 0.5; // crowd ambience softer
      if (e.type === "chant") vol = 0.6; // home-crowd chants stay present
      Sound.play(sfx, vol);
    }

    // ---- broadcast camera: frames the upper (in-bounds) half, pans with action ----
    const b = g.ball.pos;
    const tx = THREE.MathUtils.clamp(b.x * 0.7, -5, 5);
    const tz = THREE.MathUtils.clamp(b.z, -6.5, 1.4);
    const shake = g.shake;
    const sx = (Math.random() - 0.5) * shake * 0.6;
    const sy = (Math.random() - 0.5) * shake * 0.6;

    // outdoor backdrops tilt the camera up a bit so the horizon/scenery is in view
    const outdoor =
      g.backdrop === "cappadocia" ||
      g.backdrop === "novisad" ||
      g.backdrop === "beach" ||
      g.backdrop === "erciyes" ||
      g.backdrop === "petrovaradin" ||
      !!cityBackdropById(g.backdrop);

    // zoom out for outdoor backdrops (wider lens + a touch more distance/height) so
    // the whole court stays in frame alongside the scenery
    const cam = camera as THREE.PerspectiveCamera;
    const wantFov = outdoor ? OUTDOOR_FOV : INDOOR_FOV;
    if (Math.abs(cam.fov - wantFov) > 0.1) {
      cam.fov = wantFov;
      cam.updateProjectionMatrix();
    }

    // camera follows the action: stronger pan with the ball, and dollies toward the
    // rim as play drives in (z follow), with a snappier follow speed
    const follow = 0.12;
    const desiredX = tx * 0.6 + sx;
    // outdoor: a touch higher (slight bird's-eye) and close, not pulled far back
    const desiredY = (outdoor ? 9.0 : 8.6) + sy;
    const desiredZ = tz * 0.5 + (outdoor ? 7.2 : 6.8) + CAMERA_BACK_OFFSET;
    camera.position.x += (desiredX - camera.position.x) * follow;
    camera.position.y += (desiredY - camera.position.y) * follow;
    camera.position.z += (desiredZ - camera.position.z) * follow;

    const targetY = outdoor ? OUTDOOR_CAMERA_TARGET_Y : 1.2;
    camTarget.current.set(
      camTarget.current.x + (tx * 0.9 - camTarget.current.x) * follow,
      camTarget.current.y + (targetY - camTarget.current.y) * follow,
      camTarget.current.z + (tz * 0.55 - 3.2 - camTarget.current.z) * follow
    );
    camera.lookAt(camTarget.current);

    // ---- HUD push (throttled by change) ----
    const snap: HudSnapshot = {
      scoreUser: g.score.USER,
      scoreCpu: g.score.CPU,
      foulUser: g.fouls.USER,
      foulCpu: g.fouls.CPU,
      phase: g.phase,
      possession: g.possession,
      winner: g.winner,
      draw: g.draw,
      mode: g.mode,
      scoreTarget: g.scoreTarget,
      clock: Math.ceil(g.clock),
      userName: g.userName,
      cpuName: g.cpuName,
      homeIsUser: g.homeIsUser,
      messages: g.messages.map((m) => ({ key: m.key, params: m.params })),
    };
    const key = JSON.stringify(snap);
    if (key !== lastHud.current) {
      lastHud.current = key;
      onHud(snap);
    }
  });

  return null;
}

export function Scene({
  sim,
  onHud,
  backdrop = "classic",
}: {
  sim: Simulation;
  onHud: (s: HudSnapshot) => void;
  backdrop?: BackdropKind;
}) {
  const cappadocia = backdrop === "cappadocia";
  const novisad = backdrop === "novisad";
  const beach = backdrop === "beach";
  const erciyes = backdrop === "erciyes";
  const petrovaradin = backdrop === "petrovaradin";
  const cityBackdrop = cityBackdropById(backdrop);
  const outdoor = cappadocia || novisad || beach || erciyes || petrovaradin || !!cityBackdrop;
  return (
    <>
      <Stepper sim={sim} onHud={onHud} />

      {/* warm sunrise (Cappadocia), bright seaside daylight (Novi Sad / beach), cool arena otherwise */}
      <ambientLight intensity={outdoor ? 0.95 : 0.65} />
      <hemisphereLight
        args={
          cappadocia
            ? ["#ffe6c4", "#b59a73", 0.8]
            : novisad
            ? ["#cfe3f2", "#5f6b4f", 0.85]
            : beach
            ? ["#dff1ff", "#d8c79a", 0.9]
            : erciyes
            ? ["#e8f5ff", "#cdd6dc", 0.9]
            : petrovaradin
            ? ["#d8ecf8", "#8b876f", 0.88]
            : cityBackdrop
            ? [cityBackdrop.hemiSky ?? "#d9eefb", cityBackdrop.hemiGround ?? "#8b8068", 0.88]
            : ["#bcd4ff", "#3a3326", 0.6]
        }
      />
      <directionalLight
        position={
          cappadocia
            ? [10, 10, -16]
            : novisad
            ? [-12, 16, 4]
            : beach
            ? [8, 15, -6]
            : erciyes
            ? [-8, 15, -10]
            : petrovaradin
            ? [-10, 14, -4]
            : cityBackdrop
            ? cityBackdrop.sunPosition ?? [-8, 14, -6]
            : [6, 14, 6]
        }
        color={
          cappadocia
            ? "#ffdca8"
            : beach
            ? "#fff4e0"
            : erciyes
            ? "#eef8ff"
            : petrovaradin
            ? "#f2ead8"
            : cityBackdrop
            ? cityBackdrop.sunColor ?? "#fff3d8"
            : "#ffffff"
        }
        intensity={outdoor ? 1.1 : 1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* light haze only on the classic arena; outdoor backdrops stay clear */}
      {!outdoor && <fog attach="fog" args={["#1f2530", 22, 46]} />}

      {cappadocia && <CappadociaScene />}
      {novisad && <NoviSadScene />}
      {beach && <BeachScene />}
      {erciyes && <ErciyesScene />}
      {petrovaradin && <PetrovaradinScene />}
      {cityBackdrop && <CityBackdropScene backdrop={cityBackdrop} />}

      <Court backdrop={backdrop} />
      <Fans sim={sim} backdrop={backdrop} />
      <Hoop sim={sim} />
      <BallMesh sim={sim} />
      {sim.state.players.map((_, i) => (
        <PlayerFigure key={i} sim={sim} index={i} />
      ))}
    </>
  );
}
