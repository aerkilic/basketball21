import { BackdropKind, CityBackdropKind } from "./constants";

export type CityBackdropId = CityBackdropKind;

export type LandmarkKind =
  | "gate"
  | "cathedral"
  | "tower"
  | "bridge"
  | "palace"
  | "skyline"
  | "castle"
  | "domes"
  | "stadium"
  | "mountain"
  | "blossoms"
  | "stairs"
  | "harbor"
  | "townHall"
  | "opera"
  | "monument"
  | "oldTown";

export interface LandmarkSpec {
  kind: LandmarkKind;
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  color?: string;
  accent?: string;
}

export interface CityBackdropDefinition {
  id: CityBackdropId;
  name: string;
  sky: string;
  groundColor: string;
  groundAccent?: string;
  waterColor?: string;
  waterZ?: number;
  hemiSky?: string;
  hemiGround?: string;
  sunColor?: string;
  sunPosition?: [number, number, number];
  landmarks: LandmarkSpec[];
}

export const CITY_BACKDROP_FALLBACK: BackdropKind = "classic";

export const CITY_BACKDROPS: Record<CityBackdropId, CityBackdropDefinition> = {
  munichMarienplatz: {
    id: "munichMarienplatz",
    name: "Munich Marienplatz",
    sky: "#b8d8ef",
    groundColor: "#8f8a78",
    groundAccent: "#b5aa8b",
    hemiSky: "#d9eefb",
    hemiGround: "#8e8067",
    sunColor: "#fff0cf",
    sunPosition: [-8, 14, -6],
    landmarks: [{ kind: "townHall", x: 0, z: -23, scale: 1.25, color: "#7d6a55", accent: "#1f2937" }],
  },
  stuttgartPalace: {
    id: "stuttgartPalace",
    name: "Stuttgart Schlossplatz",
    sky: "#bfdcf1",
    groundColor: "#8b9477",
    groundAccent: "#c4b089",
    hemiSky: "#dbeefa",
    hemiGround: "#677554",
    sunColor: "#fff2d0",
    landmarks: [
      { kind: "palace", x: 0, z: -25, scale: 1.25, color: "#d4c09a", accent: "#6b4a2b" },
      { kind: "monument", x: -12, z: -14, scale: 0.8, color: "#d7c48f", accent: "#374151" },
    ],
  },
  frankfurtSkyline: {
    id: "frankfurtSkyline",
    name: "Frankfurt Skyline",
    sky: "#bfd8ed",
    groundColor: "#777b72",
    groundAccent: "#a7a08f",
    waterColor: "#456f86",
    waterZ: -18,
    hemiSky: "#d8ecf8",
    hemiGround: "#666b5b",
    landmarks: [{ kind: "skyline", x: 0, z: -36, scale: 1.25, color: "#9aa3ad", accent: "#dbeafe" }],
  },
  nurembergCastle: {
    id: "nurembergCastle",
    name: "Nuremberg Castle",
    sky: "#c5dff0",
    groundColor: "#8c816e",
    groundAccent: "#a58f70",
    landmarks: [{ kind: "castle", x: 0, z: -25, scale: 1.25, color: "#b99a76", accent: "#7c2d12" }],
  },
  hamburgHarbor: {
    id: "hamburgHarbor",
    name: "Hamburg Harbor",
    sky: "#b9d7eb",
    groundColor: "#77736a",
    groundAccent: "#9da0a2",
    waterColor: "#3d6d88",
    waterZ: -15,
    landmarks: [
      { kind: "harbor", x: -10, z: -25, scale: 1.05, color: "#b45309", accent: "#dbeafe" },
      { kind: "opera", x: 15, z: -31, scale: 0.75, color: "#d8dee5", accent: "#8aa1b2" },
    ],
  },
  berlinGate: {
    id: "berlinGate",
    name: "Berlin Brandenburg Gate",
    sky: "#c4dff3",
    groundColor: "#8d8674",
    groundAccent: "#b8a886",
    landmarks: [{ kind: "gate", x: 0, z: -24, scale: 1.35, color: "#d6c39b", accent: "#b8893d" }],
  },
  cologneCathedral: {
    id: "cologneCathedral",
    name: "Cologne Cathedral",
    sky: "#bdcede",
    groundColor: "#7e7d75",
    groundAccent: "#a9a195",
    waterColor: "#4b7182",
    waterZ: -18,
    landmarks: [{ kind: "cathedral", x: 0, z: -31, scale: 1.25, color: "#4b5563", accent: "#d1d5db" }],
  },
  bremenTownHall: {
    id: "bremenTownHall",
    name: "Bremen Town Hall",
    sky: "#c7dfee",
    groundColor: "#8b8171",
    groundAccent: "#b6a17e",
    landmarks: [
      { kind: "townHall", x: -4, z: -24, scale: 1.0, color: "#9b6043", accent: "#2f3a45" },
      { kind: "monument", x: 10, z: -16, scale: 0.7, color: "#5f4c3b", accent: "#f8fafc" },
    ],
  },
  istanbulBosphorus: {
    id: "istanbulBosphorus",
    name: "Istanbul Bosphorus",
    sky: "#aad5ee",
    groundColor: "#8e806b",
    groundAccent: "#b9a179",
    waterColor: "#237da4",
    waterZ: -16,
    hemiSky: "#dff4ff",
    hemiGround: "#8d7860",
    landmarks: [{ kind: "bridge", x: 0, z: -27, scale: 1.2, color: "#e5e7eb", accent: "#f97316" }],
  },
  istanbulGalata: {
    id: "istanbulGalata",
    name: "Istanbul Galata",
    sky: "#aed8ee",
    groundColor: "#8d7c67",
    groundAccent: "#bfa27a",
    waterColor: "#2d7f9d",
    waterZ: -15,
    landmarks: [
      { kind: "tower", x: -9, z: -25, scale: 1.15, color: "#d6c0a0", accent: "#6b3f2a" },
      { kind: "bridge", x: 9, z: -27, scale: 0.78, color: "#cbd5e1", accent: "#f59e0b" },
    ],
  },
  istanbulDolmabahce: {
    id: "istanbulDolmabahce",
    name: "Istanbul Dolmabahce",
    sky: "#acd4ee",
    groundColor: "#8a806d",
    groundAccent: "#d5c7a3",
    waterColor: "#2b7898",
    waterZ: -16,
    landmarks: [{ kind: "palace", x: 0, z: -25, scale: 1.35, color: "#e4d7bb", accent: "#6b7280" }],
  },
  trabzonSumela: {
    id: "trabzonSumela",
    name: "Trabzon Sumela",
    sky: "#b8d8e8",
    groundColor: "#617153",
    groundAccent: "#87986c",
    landmarks: [
      { kind: "mountain", x: 0, z: -39, scale: 1.2, color: "#60735c", accent: "#d9c7a3" },
      { kind: "palace", x: -13, z: -26, scale: 0.72, color: "#c3a071", accent: "#5f3a1f" },
    ],
  },
  ankaraAtakule: {
    id: "ankaraAtakule",
    name: "Ankara Atakule",
    sky: "#c6def0",
    groundColor: "#9a876d",
    groundAccent: "#c4aa7d",
    landmarks: [{ kind: "tower", x: 0, z: -25, scale: 1.35, color: "#d9d4c2", accent: "#ef4444" }],
  },
  bursaUludag: {
    id: "bursaUludag",
    name: "Bursa Uludag",
    sky: "#c4dff1",
    groundColor: "#6f8060",
    groundAccent: "#9fb37d",
    landmarks: [
      { kind: "mountain", x: 6, z: -40, scale: 1.15, color: "#7e8a76", accent: "#eef5f8" },
      { kind: "domes", x: -10, z: -24, scale: 0.8, color: "#c8b37a", accent: "#1f6b4a" },
    ],
  },
  konyaMevlana: {
    id: "konyaMevlana",
    name: "Konya Mevlana",
    sky: "#c1dcef",
    groundColor: "#a28d68",
    groundAccent: "#d1bd91",
    landmarks: [{ kind: "domes", x: 0, z: -25, scale: 1.05, color: "#d3b97c", accent: "#149a83" }],
  },
  izmirClockTower: {
    id: "izmirClockTower",
    name: "Izmir Clock Tower",
    sky: "#9ed0ec",
    groundColor: "#92816c",
    groundAccent: "#cfb88c",
    waterColor: "#2383a8",
    waterZ: -18,
    landmarks: [{ kind: "tower", x: 0, z: -22, scale: 1.05, color: "#d5b27c", accent: "#31515f" }],
  },
  belgradeKalemegdan: {
    id: "belgradeKalemegdan",
    name: "Belgrade Kalemegdan",
    sky: "#bdd9eb",
    groundColor: "#7d816d",
    groundAccent: "#a69b7b",
    waterColor: "#4b7287",
    waterZ: -18,
    landmarks: [{ kind: "castle", x: 0, z: -26, scale: 1.18, color: "#b69d7d", accent: "#7b5d3d" }],
  },
  nisFortress: {
    id: "nisFortress",
    name: "Nis Fortress",
    sky: "#c3dfef",
    groundColor: "#7f806a",
    groundAccent: "#aa9b7d",
    landmarks: [{ kind: "castle", x: 0, z: -24, scale: 1.05, color: "#bfa17a", accent: "#6b4a2b" }],
  },
  kragujevacMemorial: {
    id: "kragujevacMemorial",
    name: "Kragujevac Memorial Park",
    sky: "#c6e2ef",
    groundColor: "#6f835c",
    groundAccent: "#9ab477",
    landmarks: [{ kind: "monument", x: 0, z: -22, scale: 1.4, color: "#b8bcc0", accent: "#475569" }],
  },
  noviPazarOldTown: {
    id: "noviPazarOldTown",
    name: "Novi Pazar Old Town",
    sky: "#c2dfee",
    groundColor: "#8b7d67",
    groundAccent: "#b79a74",
    landmarks: [{ kind: "oldTown", x: 0, z: -24, scale: 1.05, color: "#c5a47a", accent: "#0f766e" }],
  },
  suboticaTownHall: {
    id: "suboticaTownHall",
    name: "Subotica Town Hall",
    sky: "#c2dced",
    groundColor: "#89766a",
    groundAccent: "#bc9472",
    landmarks: [{ kind: "townHall", x: 0, z: -25, scale: 1.2, color: "#ad5f45", accent: "#1e3a8a" }],
  },
  kyivMaidan: {
    id: "kyivMaidan",
    name: "Kyiv Maidan",
    sky: "#bed9ee",
    groundColor: "#827f72",
    groundAccent: "#b7aa88",
    landmarks: [
      { kind: "monument", x: 0, z: -23, scale: 1.45, color: "#d8c48d", accent: "#2563eb" },
      { kind: "skyline", x: 18, z: -38, scale: 0.7, color: "#b8bfc7", accent: "#f8fafc" },
    ],
  },
  lvivOpera: {
    id: "lvivOpera",
    name: "Lviv Opera",
    sky: "#c5dcef",
    groundColor: "#897b6d",
    groundAccent: "#b8a07b",
    landmarks: [{ kind: "opera", x: 0, z: -24, scale: 1.18, color: "#d6c39a", accent: "#2f3a45" }],
  },
  dniproRiver: {
    id: "dniproRiver",
    name: "Dnipro River",
    sky: "#b7d8ec",
    groundColor: "#7a806f",
    groundAccent: "#9ea98a",
    waterColor: "#3c7c9c",
    waterZ: -15,
    landmarks: [
      { kind: "bridge", x: 0, z: -26, scale: 1.0, color: "#d1d5db", accent: "#60a5fa" },
      { kind: "skyline", x: -20, z: -40, scale: 0.75, color: "#a3aab2", accent: "#dbeafe" },
    ],
  },
  donetskArena: {
    id: "donetskArena",
    name: "Donetsk Arena",
    sky: "#bdd9eb",
    groundColor: "#7b8068",
    groundAccent: "#aebf7e",
    landmarks: [{ kind: "stadium", x: 0, z: -25, scale: 1.2, color: "#d1d5db", accent: "#f97316" }],
  },
  uzhhorodBlossom: {
    id: "uzhhorodBlossom",
    name: "Uzhhorod Blossoms",
    sky: "#c6e3f2",
    groundColor: "#738a63",
    groundAccent: "#a8b982",
    waterColor: "#5b8fa3",
    waterZ: -15,
    landmarks: [{ kind: "blossoms", x: 0, z: -20, scale: 1.0, color: "#f3b7d0", accent: "#50764d" }],
  },
  odesaPotemkin: {
    id: "odesaPotemkin",
    name: "Odesa Potemkin Stairs",
    sky: "#a9d5ef",
    groundColor: "#8b806e",
    groundAccent: "#c2ad84",
    waterColor: "#247ca5",
    waterZ: -20,
    landmarks: [{ kind: "stairs", x: 0, z: -25, scale: 1.15, color: "#c8b797", accent: "#374151" }],
  },
};

export const CITY_BACKGROUNDS_BY_CITY: Record<string, BackdropKind[]> = {
  munich: ["munichMarienplatz"],
  stuttgart: ["stuttgartPalace"],
  frankfurt: ["frankfurtSkyline"],
  nuremberg: ["nurembergCastle"],
  hamburg: ["hamburgHarbor"],
  berlin: ["berlinGate"],
  cologne: ["cologneCathedral"],
  bremen: ["bremenTownHall"],
  istanbul: ["istanbulBosphorus", "istanbulGalata", "istanbulDolmabahce"],
  istanbulGalata: ["istanbulGalata", "istanbulBosphorus"],
  istanbulKadikoy: ["istanbulBosphorus"],
  istanbulBesiktas: ["istanbulDolmabahce", "istanbulBosphorus"],
  trabzon: ["trabzonSumela"],
  kayseri: ["erciyes"],
  mersin: ["beach"],
  ankara: ["ankaraAtakule"],
  bursa: ["bursaUludag"],
  konya: ["konyaMevlana"],
  izmir: ["izmirClockTower"],
  belgrade: ["belgradeKalemegdan"],
  noviSad: ["novisad", "petrovaradin"],
  nis: ["nisFortress"],
  kragujevac: ["kragujevacMemorial"],
  noviPazar: ["noviPazarOldTown"],
  subotica: ["suboticaTownHall"],
  kyiv: ["kyivMaidan"],
  lviv: ["lvivOpera"],
  dnipro: ["dniproRiver"],
  donetsk: ["donetskArena"],
  uzhhorod: ["uzhhorodBlossom"],
  odesa: ["odesaPotemkin"],
};

export const TEAM_CITY_KEYS: Record<string, string> = {
  muc: "munich",
  stu: "stuttgart",
  fra: "frankfurt",
  nue: "nuremberg",
  ham: "hamburg",
  ber: "berlin",
  koe: "cologne",
  bre: "bremen",
  tr_gs: "istanbulGalata",
  tr_fb: "istanbulKadikoy",
  tr_bjk: "istanbulBesiktas",
  tr_tra: "trabzon",
  tr_kay: "kayseri",
  tr_mer: "mersin",
  tr_ank: "ankara",
  tr_bur: "bursa",
  tr_kon: "konya",
  tr_izm: "izmir",
  rs_bg: "belgrade",
  rs_ns: "noviSad",
  rs_nis: "nis",
  rs_kg: "kragujevac",
  rs_np: "noviPazar",
  rs_su: "subotica",
  ua_kyiv: "kyiv",
  ua_lviv: "lviv",
  ua_dnipro: "dnipro",
  ua_donetsk: "donetsk",
  ua_uzh: "uzhhorod",
  ua_odesa: "odesa",
};

export function cityBackdropById(backdrop: BackdropKind): CityBackdropDefinition | null {
  return (CITY_BACKDROPS as Partial<Record<BackdropKind, CityBackdropDefinition>>)[backdrop] ?? null;
}

export function backdropsForTeam(teamId: string): BackdropKind[] {
  const cityKey = TEAM_CITY_KEYS[teamId];
  if (!cityKey) return [CITY_BACKDROP_FALLBACK];
  return CITY_BACKGROUNDS_BY_CITY[cityKey] ?? [CITY_BACKDROP_FALLBACK];
}

export function backdropForTeam(teamId: string, random: () => number = Math.random): BackdropKind {
  const options = backdropsForTeam(teamId);
  return options[Math.floor(random() * options.length)] ?? CITY_BACKDROP_FALLBACK;
}
