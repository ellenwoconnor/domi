/**
 * Domi design tokens, from "Domi Circles — Brand Strategy" (Oct 2026):
 * Neighborhood Modern on clean white, in Fog & Poppy.
 *
 * - Poppy means generosity: free items, thank-yous, the logo dot. Never warnings.
 * - Text on Poppy is always Ink (white on Poppy fails contrast).
 * - Keep the blue deep and muted. No bright blue anywhere.
 */
export const color = {
  white: "#FFFFFF",
  bay: "#1F4E79", // primary: wordmark, buttons, navigation, selected states
  poppy: "#F2652B", // accent: giving moments only
  blush: "#FDE8DE", // warm tint: highlights, celebrations, empty states
  fog: "#EAF0F4", // cool tint: photo backgrounds, chips, search
  ink: "#18222E", // text and icons
  inkSoft: "#4C5866",
  inkFaint: "#86919E",
  line: "#DDE4EA",
} as const;

/** Font family names, registered in app/_layout.tsx. */
export const font = {
  // Fraunces Italic: headlines, item captions, the curator's voice
  curator: "Fraunces_600SemiBold_Italic",
  curatorLight: "Fraunces_400Regular_Italic",
  // Figtree: wordmark, interface, prices, times, buttons
  ui: "Figtree_400Regular",
  uiMedium: "Figtree_500Medium",
  uiSemi: "Figtree_600SemiBold",
  uiBold: "Figtree_700Bold",
  wordmark: "Figtree_800ExtraBold",
} as const;

export const type = {
  display: { fontFamily: font.curator, fontSize: 34, lineHeight: 40, color: color.ink },
  title: { fontFamily: font.curator, fontSize: 22, lineHeight: 28, color: color.ink },
  objectLabel: { fontFamily: font.curator, fontSize: 17, lineHeight: 22, color: color.ink },
  caption: { fontFamily: font.curatorLight, fontSize: 16, lineHeight: 23, color: color.inkSoft },
  body: { fontFamily: font.ui, fontSize: 16, lineHeight: 24, color: color.ink },
  meta: { fontFamily: font.ui, fontSize: 13.5, lineHeight: 19, color: color.inkSoft },
  label: { fontFamily: font.uiSemi, fontSize: 14, lineHeight: 18, color: color.ink },
  button: { fontFamily: font.uiSemi, fontSize: 17, color: color.white },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 } as const;
// Circles mean people and community; rounded rectangles mean things.
export const radius = { thing: 16, control: 14, sheet: 24, pill: 999 } as const;
