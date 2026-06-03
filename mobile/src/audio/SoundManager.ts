// SoundManager: loads the procedurally-generated SFX and plays them on demand.
// Uses a tiny pool per sound so rapid repeats (dribble) can overlap.
import { Audio } from "expo-av";

export type SfxName =
  | "dribble"
  | "pass"
  | "shoot"
  | "swish"
  | "rimhit"
  | "dunk"
  | "block"
  | "steal"
  | "whistle"
  | "cheer"
  | "buzzer";

const FILES: Record<SfxName, any> = {
  dribble: require("../../assets/sounds/dribble.wav"),
  pass: require("../../assets/sounds/pass.wav"),
  shoot: require("../../assets/sounds/shoot.wav"),
  swish: require("../../assets/sounds/swish.wav"),
  rimhit: require("../../assets/sounds/rimhit.wav"),
  dunk: require("../../assets/sounds/dunk.wav"),
  block: require("../../assets/sounds/block.wav"),
  steal: require("../../assets/sounds/steal.wav"),
  whistle: require("../../assets/sounds/whistle.wav"),
  cheer: require("../../assets/sounds/cheer.wav"),
  buzzer: require("../../assets/sounds/buzzer.wav"),
};

const POOL = 3;

class Manager {
  private pools: Partial<Record<SfxName, Audio.Sound[]>> = {};
  private idx: Partial<Record<SfxName, number>> = {};
  private ready = false;
  private loading = false;

  async init() {
    if (this.ready || this.loading) return;
    this.loading = true;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
      const names = Object.keys(FILES) as SfxName[];
      await Promise.all(
        names.map(async (name) => {
          const arr: Audio.Sound[] = [];
          for (let i = 0; i < POOL; i++) {
            const { sound } = await Audio.Sound.createAsync(FILES[name], {
              shouldPlay: false,
              volume: 1,
            });
            arr.push(sound);
          }
          this.pools[name] = arr;
          this.idx[name] = 0;
        })
      );
      this.ready = true;
    } catch (e) {
      // audio is non-critical — never let it break the game
      console.warn("SoundManager init failed", e);
    } finally {
      this.loading = false;
    }
  }

  play(name: SfxName, volume = 1) {
    const pool = this.pools[name];
    if (!pool) return;
    const i = (this.idx[name] ?? 0) % pool.length;
    this.idx[name] = i + 1;
    const s = pool[i];
    s.setVolumeAsync(volume).catch(() => {});
    s.replayAsync().catch(() => {});
  }

  async unload() {
    for (const arr of Object.values(this.pools)) {
      for (const s of arr ?? []) await s.unloadAsync().catch(() => {});
    }
    this.pools = {};
    this.ready = false;
  }
}

export const Sound = new Manager();
