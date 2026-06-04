// Shared layout constants for the menu/selection screens.
import { Dimensions } from "react-native";

// dp is ~physical at 160dpi: 1cm ≈ 63dp. Target ~5cm left margin in landscape,
// capped so content stays usable on smaller screens.
const CM = 63;
const { width } = Dimensions.get("window");

export const LEFT_MARGIN = Math.round(Math.min(5 * CM, width * 0.34));
