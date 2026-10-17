import { Platform } from "react-native";

/**
 * Domi design tokens (mockup v1).
 * Ink-blue on clean white, with one loud accent: the yellow "porch tag"
 * that marks each listing, like a free-stuff sign taped to a box on the curb.
 */
export const color = {
  paper: "#FFFFFF",
  surface: "#F1F3F6",
  line: "#E1E5EB",
  ink: "#172033",
  inkSoft: "#5B6475",
  inkFaint: "#8A93A3",
  tag: "#FFCF33",
  tagInk: "#3A2E00",
  circle: "#1F7A5C",
  circleSoft: "#E3F2EC",
  pending: "#9A5B00",
  pendingSoft: "#FFF1D6",
} as const;

/** Soft placeholder backgrounds standing in for item photos. */
export const tileTints = [
  "#DCEBFF",
  "#FFE3E0",
  "#E2F4E6",
  "#F1E6FF",
  "#FFF0CC",
  "#DFF3F5",
] as const;

const display = Platform.select({ ios: "Avenir Next", default: undefined });

export const type = {
  display: { fontFamily: display, fontWeight: "700" as const, letterSpacing: -0.6 },
  heading: { fontFamily: display, fontWeight: "600" as const, letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, color: color.ink },
  meta: { fontSize: 13, lineHeight: 18, color: color.inkSoft },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
