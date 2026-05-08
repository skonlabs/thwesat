import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpace } from "@remotion/google-fonts/SpaceGrotesk";

export const inter = loadInter("normal", { weights: ["400", "500", "600", "700", "800", "900"] }).fontFamily;
export const display = loadSpace("normal", { weights: ["500", "700"] }).fontFamily;

export const C = {
  navy: "#1B1740",
  navyDeep: "#100C2A",
  gold: "#FFBE5C",
  goldDeep: "#E8A33A",
  emerald: "#10b981",
  emeraldDeep: "#047857",
  paper: "#FAF7F2",
  ink: "#0F0B22",
  muted: "#6B6685",
  border: "#E4DFD2",
  card: "#FFFFFF",
  red: "#E84B4B",
  blue: "#3B82F6",
};
