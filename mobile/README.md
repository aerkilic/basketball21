# Basketball 21 — Mobile (Expo + Three.js)

Ein 3D Street-Basketball-Spiel: **2 gegen 2**, ein Korb, bis **21 Punkte**.
Schnell, direkt, mit Dreiern, Crossovers, Blocks, Fouls und lebendigem Netz + Sound.

## Tech-Stack
- **Expo SDK 54** / React Native 0.81 / React 19
- **3D:** `three` + `@react-three/fiber/native` auf `expo-gl`
- **Audio:** `expo-av` mit prozedural erzeugten Sound-Effekten
- **Touch:** `react-native-gesture-handler` (Joystick)

## Start
```bash
cd mobile
npm install
npx expo start
```
> **Wichtig:** Das Spiel nutzt `expo-gl` (3D). Expo Go kann je nach Version
> reichen; für volle Performance/Schatten am besten ein **Development Build**:
> ```bash
> npx expo run:ios      # oder
> npx expo run:android
> ```
> Gerät im **Querformat** halten.

## Steuerung
- **Joystick (links):** Laufen. Hoch = Richtung Korb.
- **W:** Sprint (halten)
- **X:** Spezial-Dribbling / Crossover (durch die Beine — hilft am Gegner vorbei)
- **Angriff** (eigenes Team am Ball):
  - **D halten** = Wurf. Je nach **Timing** (ca. 0,55 s = perfekt) steigt die Trefferchance.
    Kurzer Tipp auf D = Wurf antäuschen (Pump-Fake).
  - **Sprungwurf:** erst **A** (springen), dann **D** in der Luft auslösen.
  - **Drive-Dunk:** zum Korb laufen und **D halten** → der große Spieler dunkt.
  - **S** = Pass zum Mitspieler
  - Achtung **Schrittfehler:** aufnehmen und seitlich/rückwärts laufen = Ballverlust.
- **Abwehr** (Gegner am Ball):
  - **A** = Springen / Block / **Rebound in der Luft greifen**
  - **D** = Steal-Versuch (schlechtes Timing/Stand → Foul möglich)
  - **S** = aktiven Verteidiger wechseln (Standard: näher am Ball)

**Halbfeld:** Gespielt wird nur in der oberen Hälfte (Richtung Korb). Geht der Ball
über die gelbe Mittellinie oder zur Seite raus → **Aus**, Einwurf für das andere Team.

Der **aktive Spieler** ist mit gelbem Ring + Pfeil markiert.
**Pause** (Speichern / Beenden): Button oben rechts.

## Menü & Modi
- **Startseite:** Neues Spiel oder gespeicherten Stand **Weiterspielen**
- **Setup-Screen:** Modus, Schwierigkeit, Fouls, Teams & Trikots auswählen, dann Ladebalken
- **Spielmodus:**
  - **Punkte** — bis 7 / 11 / 15 / **21** (Default) / 31
  - **Zeit** — 5 / 10 / 15 / 20 Minuten (Uhr läuft nur bei lebendem Ball; höchster Punktestand gewinnt, sonst Unentschieden)
- **Team-/Spielerauswahl:** Classic (Center+Guard), Twin Towers, Speed, Allround — für beide Teams
- **Trikotauswahl:** Farbe für eigenes Team und Gegner
- **Speichern/Laden:** im Pause-Menü speichern; auf der Startseite weiterspielen (`AsyncStorage`)

## Karriere / Turnier
- **Profil:** Name + Nickname eingeben, einen von **8 Vereinen** wählen.
- **2 Gruppen à 4** (doppelte Runde, Hin- und Rückspiel, Heim/Auswärts zufällig ausgelost):
  - **Süd:** München, Stuttgart, Frankfurt, Nürnberg
  - **Nord:** Hamburg, Berlin, Köln, Bremen
- **Punkte:** Sieg = 2, Niederlage = 1. Die **ersten beiden** jeder Gruppe kommen weiter.
- **Halbfinale** (je 1 Spiel): 1. Nord – 2. Süd und 2. Nord – 1. Süd. **Finale:** 1 Spiel.
- Du spielst die Partien deines Vereins selbst (3D), die übrigen werden simuliert.
- **Ewige Tabelle:** über alle Turniere kumuliert, inkl. Titel — persistent gespeichert.
- **Heimspiel-Atmosphäre:** Fans in Vereinsfarben, Jubel beim Heim-Team, **Pfiffe gegen den Gegner**, sobald dieser den Ball hat. Bei Treffern hüpfen die Fans.

## Spielertypen
- **Center (BIG):** stark unter dem Korb, gut bei Block/Rebound/Dunk, langsamer, schwache Dreier
- **Guard (SMALL):** schnell, bestes Dribbling, sehr gute Dreier, schwach bei Block/Dunk
- (Gegner: zwei ausgewogene NORMAL-Spieler)

## Projektstruktur
```
src/
  game/            reine Spiel-Logik (kein React)
    Simulation.ts        ein Schritt der Game-Loop, verdrahtet alle Systeme
    InputManager.ts      Touch-Eingaben -> InputFrame mit Edge-Detection
    GameState.ts         Zustand + Factory
    constants.ts / types.ts / math.ts
    systems/
      PlayerController.ts   Bewegung, Sprung, Kollision, Animationszustand
      BallController.ts     Ballphysik (Flug, lose, Pass, Dribble), Korb/Brett, Treffer
      ShotSystem.ts         Aufladen, Timing, Wurfarten, Trefferwahrscheinlichkeit
      PassSystem.ts         Pass + Spielerwechsel
      DribbleSystem.ts      Crossover + Dribble-Sound
      DefenseSystem.ts      Steal + Block
      FoulSystem.ts         Foul-Erkennung + Zähler
      SimpleTeamAI.ts       eigener Mitspieler (freilaufen/cutten/helfen)
      CPUOpponentAI.ts      Gegner-Team (Offense + Defense, schwierigkeitsabhängig)
      GameMode21.ts         Punkte (2/3), Ballbesitz, Phasen, Sieg bei 21
  render/          3D-Darstellung (react-three-fiber)
    GameCanvas.tsx / Scene.tsx   Canvas, Licht, Kamera-Follow, Sim-Step, Audio
    Court.tsx / Hoop.tsx / BasketNetAnimation.tsx   Platz, Korb, Verlet-Netz
    PlayerFigure.tsx / BallMesh.tsx
  ui/              Joystick, ActionButtons, Hud, Start-/GameOver-Screen
  audio/SoundManager.ts
```

## Sound-Effekte neu generieren
Die WAVs in `assets/sounds/` werden prozedural erzeugt:
```bash
python3 scripts/gen_sounds.py   # benötigt numpy
```
