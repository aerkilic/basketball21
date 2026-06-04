#!/usr/bin/env python3
"""Procedurally synthesize the game's sound effects as small mono 16-bit WAVs.
Run: python3 scripts/gen_sounds.py  (outputs into ../assets/sounds)."""
import os, struct, wave
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
os.makedirs(OUT, exist_ok=True)


def env(n, attack=0.005, decay=0.2, sustain=0.0, release=0.05):
    t = np.linspace(0, 1, n)
    e = np.ones(n)
    a = int(attack * n)
    d = int(decay * n)
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    if d > 0:
        e[a:a + d] = np.linspace(1, sustain if sustain > 0 else 0.0001, d)
    if sustain <= 0:
        e[a + d:] = np.exp(-np.linspace(0, 6, max(1, n - a - d)))
    return e


def expdecay(n, k=6):
    return np.exp(-np.linspace(0, k, n))


def tone(freq, n, kind="sine"):
    t = np.arange(n) / SR
    if kind == "sine":
        return np.sin(2 * np.pi * freq * t)
    if kind == "square":
        return np.sign(np.sin(2 * np.pi * freq * t))
    if kind == "saw":
        return 2 * (t * freq - np.floor(0.5 + t * freq))
    return np.sin(2 * np.pi * freq * t)


def noise(n):
    return np.random.uniform(-1, 1, n)


def lp(x, a=0.2):
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def hp(x, a=0.2):
    return x - lp(x, a)


def save(name, data, vol=0.8):
    data = data / (np.max(np.abs(data)) + 1e-9) * vol
    pcm = (data * 32767).astype(np.int16)
    path = os.path.join(OUT, name + ".wav")
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", path, len(pcm), "samples")


def dur(sec):
    return int(sec * SR)


# --- dribble: low thud ---
n = dur(0.13)
d = tone(150, n) * expdecay(n, 9) + tone(90, n) * expdecay(n, 7) * 0.6
save("dribble", d, 0.7)

# --- pass: quick swish ---
n = dur(0.12)
p = hp(noise(n), 0.45) * expdecay(n, 10)
save("pass", p, 0.6)

# --- shoot release whoosh ---
n = dur(0.2)
s = hp(noise(n), 0.3) * np.linspace(0.2, 1, n) * expdecay(n, 5)
save("shoot", s, 0.5)

# --- swish (made basket): filtered noise sweep ---
n = dur(0.32)
sw = hp(noise(n), 0.6)
sw *= np.concatenate([np.linspace(0, 1, dur(0.05)), expdecay(n - dur(0.05), 7)])
save("swish", sw, 0.85)

# --- rim hit: metallic ping ---
n = dur(0.22)
r = (tone(1180, n) + 0.6 * tone(1760, n) + 0.4 * tone(2630, n)) * expdecay(n, 12)
r += noise(n) * expdecay(n, 25) * 0.3
save("rimhit", r, 0.7)

# --- dunk: powerful low boom + rattle ---
n = dur(0.45)
boom = (tone(70, n) + tone(110, n) * 0.7) * expdecay(n, 5)
rattle = (tone(1200, n) + tone(1700, n)) * np.abs(np.sin(np.linspace(0, 40, n))) * expdecay(n, 8) * 0.4
save("dunk", boom + rattle, 1.0)

# --- block: sharp slap ---
n = dur(0.1)
b = noise(n) * expdecay(n, 18) + tone(220, n) * expdecay(n, 14) * 0.5
save("block", b, 0.8)

# --- steal: tick + swipe ---
n = dur(0.13)
st = hp(noise(n), 0.5) * expdecay(n, 12)
st[: dur(0.01)] += 1.0
save("steal", st, 0.6)

# --- whistle: clear referee pea-whistle (pure tone + fast trill, crisp attack) ---
n = dur(0.5)
t = np.arange(n) / SR
trill = 1.0 + 0.18 * (np.sin(2 * np.pi * 16 * t) > 0)  # fast on/off "pea" warble
f0 = 3150.0
wh = np.sin(2 * np.pi * f0 * t * trill) + 0.35 * np.sin(2 * np.pi * 2 * f0 * t * trill)
wh += np.sin(2 * np.pi * (f0 * 1.5) * t) * 0.12  # airy overtone for clarity
# crisp attack, steady body, quick release — two short pips read very clearly
amp = np.ones(n)
a = dur(0.008)
amp[:a] = np.linspace(0, 1, a)
amp[-dur(0.06):] *= np.linspace(1, 0, dur(0.06))
wh *= amp
save("whistle", wh, 0.85)

# --- chant: rhythmic home-crowd "let's go" (pulsed crowd voices) ---
n = dur(2.0)
t = np.arange(n) / SR
bed = lp(noise(n), 0.04) * 0.5  # crowd murmur bed
beat = 1.6  # chant pulses per second
pulse = (np.sin(2 * np.pi * beat * t) * 0.5 + 0.5) ** 3  # punchy on-beats
voice = (np.sin(2 * np.pi * 196 * t) + 0.6 * np.sin(2 * np.pi * 247 * t)
         + 0.4 * np.sin(2 * np.pi * 392 * t))  # low vocal "ohh" chord
ch = (bed + voice * 0.5) * pulse
ch += hp(noise(n), 0.6) * 0.08 * pulse  # clap-like sparkle on the beat
ch *= np.concatenate([np.linspace(0, 1, dur(0.3)), np.ones(n - dur(0.6)), np.linspace(1, 0, dur(0.3))])
save("chant", ch, 0.7)

# --- cheer: crowd swell (filtered noise) ---
n = dur(0.9)
cr = lp(noise(n), 0.05)
cr *= np.concatenate([np.linspace(0, 1, dur(0.25)), np.ones(dur(0.3)), np.linspace(1, 0, n - dur(0.55))])
# add a little sparkle
cr += hp(noise(n), 0.7) * 0.2 * np.concatenate([np.linspace(0, 1, dur(0.2)), expdecay(n - dur(0.2), 3)])
save("cheer", cr, 0.7)

# --- buzzer: harsh square ---
n = dur(0.7)
bz = tone(200, n, "square") * 0.6 + tone(203, n, "square") * 0.4
bz *= env(n, 0.005, 0.0, 0.95, 0.05)
save("buzzer", bz, 0.7)

print("done")
