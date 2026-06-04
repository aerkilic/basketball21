// Shared layout helper for the menu/selection screens. Uses the real safe-area
// insets so content clears the landscape notch (earpiece + camera) on either side.
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useMenuInsets() {
  const insets = useSafeAreaInsets();
  return {
    paddingLeft: Math.max(insets.left + 22, 30),
    paddingRight: Math.max(insets.right + 22, 30),
  };
}
