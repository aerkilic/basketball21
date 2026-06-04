// Generic city backdrop renderer. City-specific data lives in game/cityBackgrounds.ts,
// so adding a new venue is mostly configuration rather than a new renderer file.
import React from "react";
import * as THREE from "three";
import { COURT } from "../game/constants";
import { CityBackdropDefinition, LandmarkSpec } from "../game/cityBackgrounds";

function Cable({ from, to, color = "#dbe3ea" }: { from: [number, number, number]; to: [number, number, number]; color?: string }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={[q.x, q.y, q.z, q.w]}>
      <cylinderGeometry args={[0.055, 0.055, len, 6]} />
      <meshStandardMaterial color={color} metalness={0.25} roughness={0.6} />
    </mesh>
  );
}

export function CityBackdropGround({ backdrop }: { backdrop: CityBackdropDefinition }) {
  const courtMidZ = (COURT.zFront + COURT.zBack) / 2;
  return (
    <group>
      <mesh position={[0, -0.02, courtMidZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color={backdrop.groundColor} roughness={1} />
      </mesh>
      <mesh position={[0, 0.005, COURT.zBack - 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[48, 3.6]} />
        <meshStandardMaterial color={backdrop.groundAccent ?? backdrop.groundColor} roughness={1} />
      </mesh>
    </group>
  );
}

export function CityBackdropScene({ backdrop }: { backdrop: CityBackdropDefinition }) {
  return (
    <group>
      {backdrop.waterColor && (
        <mesh position={[0, -0.35, (backdrop.waterZ ?? -18) - 22]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[260, 56]} />
          <meshStandardMaterial color={backdrop.waterColor} roughness={0.42} metalness={0.16} />
        </mesh>
      )}

      {backdrop.landmarks.map((landmark, i) => (
        <Landmark key={`${backdrop.id}-${i}`} spec={landmark} />
      ))}
    </group>
  );
}

function Landmark({ spec }: { spec: LandmarkSpec }) {
  const x = spec.x ?? 0;
  const y = spec.y ?? 0;
  const z = spec.z ?? -24;
  const s = spec.scale ?? 1;
  const color = spec.color ?? "#c8b894";
  const accent = spec.accent ?? "#334155";

  return (
    <group position={[x, y, z]} scale={[s, s, s]}>
      {spec.kind === "gate" && <Gate color={color} accent={accent} />}
      {spec.kind === "cathedral" && <Cathedral color={color} accent={accent} />}
      {spec.kind === "tower" && <Tower color={color} accent={accent} />}
      {spec.kind === "bridge" && <Bridge color={color} accent={accent} />}
      {spec.kind === "palace" && <Palace color={color} accent={accent} />}
      {spec.kind === "skyline" && <Skyline color={color} accent={accent} />}
      {spec.kind === "castle" && <Castle color={color} accent={accent} />}
      {spec.kind === "domes" && <Domes color={color} accent={accent} />}
      {spec.kind === "stadium" && <Stadium color={color} accent={accent} />}
      {spec.kind === "mountain" && <Mountain color={color} accent={accent} />}
      {spec.kind === "blossoms" && <Blossoms color={color} accent={accent} />}
      {spec.kind === "stairs" && <Stairs color={color} accent={accent} />}
      {spec.kind === "harbor" && <Harbor color={color} accent={accent} />}
      {spec.kind === "townHall" && <TownHall color={color} accent={accent} />}
      {spec.kind === "opera" && <Opera color={color} accent={accent} />}
      {spec.kind === "monument" && <Monument color={color} accent={accent} />}
      {spec.kind === "oldTown" && <OldTown color={color} accent={accent} />}
    </group>
  );
}

function Gate({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      {[-4.5, -2.7, -0.9, 0.9, 2.7, 4.5].map((px) => (
        <mesh key={px} position={[px, 2.4, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.36, 4.8, 10]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 5.1, 0]} castShadow>
        <boxGeometry args={[10.8, 0.9, 1.5]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 5.9, 0]}>
        <boxGeometry args={[8.7, 0.5, 1.2]} />
        <meshStandardMaterial color={accent} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Cathedral({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[6.8, 5, 3.4]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {[-3.9, 3.9].map((px) => (
        <group key={px}>
          <mesh position={[px, 4.5, 0]} castShadow>
            <boxGeometry args={[1.9, 9, 2.2]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[px, 9.8, 0]} castShadow>
            <coneGeometry args={[1.25, 3, 4]} />
            <meshStandardMaterial color={accent} roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 6.2, 1.72]}>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial color="#dbeafe" />
      </mesh>
    </group>
  );
}

function Tower({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 3.7, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.15, 7.4, 12]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 7.9, 0]} castShadow>
        <cylinderGeometry args={[1.25, 1.25, 1.1, 12]} />
        <meshStandardMaterial color={accent} roughness={0.9} />
      </mesh>
      <mesh position={[0, 9.0, 0]} castShadow>
        <coneGeometry args={[1.2, 1.7, 8]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
    </group>
  );
}

function Bridge({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[34, 0.7, 2.6]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {[-11, 11].map((px) => (
        <mesh key={px} position={[px, 7.1, 0]} castShadow>
          <boxGeometry args={[0.9, 6.2, 1]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      ))}
      {[-11, 11].map((px) =>
        [-14, -8, -3, 3, 8, 14].map((ax) => <Cable key={`${px}-${ax}`} from={[px, 9.8, 0]} to={[ax, 4.8, 0]} color={accent} />)
      )}
    </group>
  );
}

function Palace({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[14, 4.4, 3]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {[-5, -3, -1, 1, 3, 5].map((px) => (
        <mesh key={px} position={[px, 2.5, 1.58]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 3.6, 8]} />
          <meshStandardMaterial color="#f4ead3" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 4.75, 0]} castShadow>
        <boxGeometry args={[15.2, 0.7, 3.3]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
    </group>
  );
}

function Skyline({ color, accent }: { color: string; accent: string }) {
  const blocks = [
    [-10, 8, 3],
    [-6, 12, 4],
    [-1.5, 17, 3],
    [3, 11, 3.5],
    [8, 14, 4],
    [13, 7, 3],
  ];
  return (
    <group>
      {blocks.map(([px, h, w], i) => (
        <mesh key={i} position={[px, h / 2, 0]} castShadow>
          <boxGeometry args={[w, h, w]} />
          <meshStandardMaterial color={i % 2 === 0 ? color : accent} roughness={0.9} metalness={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function Castle({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[13, 6, 7]} />
        <meshStandardMaterial color="#6f805b" roughness={1} />
      </mesh>
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[13, 3.2, 2.8]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {[-5.5, 5.5].map((px) => (
        <group key={px}>
          <mesh position={[px, 5.4, 0]} castShadow>
            <cylinderGeometry args={[1.05, 1.15, 4.2, 10]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[px, 8.0, 0]} castShadow>
            <coneGeometry args={[1.15, 1.5, 8]} />
            <meshStandardMaterial color={accent} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Domes({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[9, 3.4, 3.4]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 3.7, 0]} castShadow>
        <sphereGeometry args={[2.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
      {[-4.4, 4.4].map((px) => (
        <mesh key={px} position={[px, 4.0, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.34, 5.8, 10]} />
          <meshStandardMaterial color="#ead7aa" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Stadium({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 2.5, 0]} scale={[1.9, 0.45, 1]}>
        <torusGeometry args={[4.2, 0.8, 12, 48]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2.8, 0]} scale={[1.9, 0.35, 1]}>
        <torusGeometry args={[5.4, 0.18, 8, 48]} />
        <meshStandardMaterial color={accent} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Mountain({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 9, 0]} castShadow>
        <coneGeometry args={[17, 18, 7]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 15.2, 0.3]} castShadow>
        <coneGeometry args={[7.2, 6.5, 7]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
      <mesh position={[-14, 5, -2]} castShadow>
        <coneGeometry args={[9, 10, 6]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  );
}

function Blossoms({ color, accent }: { color: string; accent: string }) {
  const trees = [-15, -10, -5, 5, 10, 15];
  return (
    <group>
      {trees.map((px, i) => (
        <group key={px} position={[px, 0, i % 2 === 0 ? -1 : 1]}>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 2, 8]} />
            <meshStandardMaterial color="#6b4a2b" roughness={1} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[1.15, 12, 10]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[0.65, 2.85, 0]}>
            <sphereGeometry args={[0.75, 10, 8]} />
            <meshStandardMaterial color="#ffd6e7" roughness={1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.03, 2.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[35, 2.5]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
    </group>
  );
}

function Stairs({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0, 0.25 + i * 0.28, -i * 0.65]} castShadow>
          <boxGeometry args={[16 - i * 0.9, 0.28, 0.65]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 3.2, -5.4]} castShadow>
        <boxGeometry args={[9, 3.2, 2]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
    </group>
  );
}

function Harbor({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      {[-7, 5].map((px) => (
        <group key={px} position={[px, 0, 0]}>
          <mesh position={[0, 3.1, 0]} castShadow>
            <boxGeometry args={[0.6, 6.2, 0.6]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[2.6, 6.2, 0]} castShadow>
            <boxGeometry args={[5.8, 0.45, 0.45]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <Cable from={[5.3, 6.2, 0]} to={[4.2, 3.4, 0]} color={accent} />
        </group>
      ))}
    </group>
  );
}

function TownHall({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[13, 4.6, 3.2]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 5.0, 0]} castShadow>
        <boxGeometry args={[14, 0.9, 3.5]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
      <mesh position={[0, 6.8, 0]} castShadow>
        <boxGeometry args={[2.4, 5.2, 2.4]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 9.9, 0]} castShadow>
        <coneGeometry args={[1.45, 2.1, 4]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
      <mesh position={[0, 7.0, 1.23]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

function Opera({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[12, 4.2, 3]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 4.75, 0]} castShadow>
        <coneGeometry args={[6.8, 2.3, 4]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
      <mesh position={[0, 6.0, 0]} castShadow>
        <sphereGeometry args={[1.35, 14, 10]} />
        <meshStandardMaterial color="#d6b35d" roughness={0.8} metalness={0.15} />
      </mesh>
    </group>
  );
}

function Monument({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.48, 6.4, 12]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 6.9, 0]} castShadow>
        <sphereGeometry args={[0.85, 12, 10]} />
        <meshStandardMaterial color={accent} roughness={0.85} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[2.7, 0.7, 2.7]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  );
}

function OldTown({ color, accent }: { color: string; accent: string }) {
  return (
    <group>
      {[-6, -2, 2, 6].map((px, i) => (
        <mesh key={px} position={[px, 2.0 + i * 0.2, 0]} castShadow>
          <boxGeometry args={[3.2, 4 + (i % 2), 3]} />
          <meshStandardMaterial color={i % 2 === 0 ? color : "#d8bd8f"} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 5.5, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 7, 10]} />
        <meshStandardMaterial color="#e6d3aa" roughness={1} />
      </mesh>
      <mesh position={[0, 9.2, 0]} castShadow>
        <coneGeometry args={[0.8, 1.4, 10]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
    </group>
  );
}
