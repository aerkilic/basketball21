// IntroScreen: plays the first 8 seconds of challenge.mp4 on launch, then continues
// to the main menu. Tapping anywhere ends the video immediately.
import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Sound } from "../audio/SoundManager";

const MAX_MS = 8000; // only the first 8 seconds

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    Sound.init(); // sets the audio mode so the intro plays even in iOS silent mode
    const id = setTimeout(finish, MAX_MS); // hard cap even if the video stalls
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.root}>
      <Video
        source={require("../../assets/challenge.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={(s: AVPlaybackStatus) => {
          if (!s.isLoaded) {
            if ((s as { error?: string }).error) finish();
            return;
          }
          if (s.didJustFinish || (s.positionMillis ?? 0) >= MAX_MS) finish();
        }}
      />
      {/* transparent overlay on top so a tap anywhere skips the intro */}
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
});
