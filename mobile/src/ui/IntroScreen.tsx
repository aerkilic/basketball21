// IntroScreen: plays intro.mp4 on launch, starting at second 3, then continues to
// the main menu. Tapping anywhere ends the video immediately.
import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Sound } from "../audio/SoundManager";

const START_MS = 3000; // begin playback at second 3
const SAFETY_MS = 30000; // hard cap so the intro can never hang the launch

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  const video = useRef<Video>(null);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    Sound.init(); // sets the audio mode so the intro plays even in iOS silent mode
    const id = setTimeout(finish, SAFETY_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.root}>
      <Video
        ref={video}
        source={require("../../assets/intro.mp4")}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onLoad={() => {
          video.current?.setPositionAsync(START_MS).catch(() => {});
        }}
        onPlaybackStatusUpdate={(s: AVPlaybackStatus) => {
          if (!s.isLoaded) {
            if ((s as { error?: string }).error) finish();
            return;
          }
          if (s.didJustFinish) finish();
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
