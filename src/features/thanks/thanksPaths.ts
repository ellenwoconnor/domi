// The thank-you poppy (docs/brand/domi-thanks.svg): the logo's poppy leaning 46° on a
// long stem. Paths are pre-rotated, like PoppyMark's.
export const THANKS_VIEWBOX = "48 54 172 250";
export const THANKS_ASPECT = 172 / 250;
/** Where the petals meet the calyx, as a transformOrigin inside the box (the bloom grows from here). */
export const THANKS_ORIGIN = "27.7% 48.1%";
export const THANKS_STEM = "M95.68,174.17 C59.72,208.9 45.33,284.17 52.52,300";
export const THANKS_PETALS = [
  { d: "M100,170C140.52,146.1 150.2,94.19 136.07,67.93C123.75,56.5 100.36,54.04 85.94,62.66C66.66,85.41 65.33,138.2 100,170Z", fill: "#D9501C" },
  { d: "M100,170C151.55,170.17 194.8,125.48 199.98,91.92C196.83,73.77 177.96,57.93 159.53,57.98C127.38,68.91 90.88,119.27 100,170Z", fill: "#F2652B" },
  { d: "M100,170C138.25,199.42 193.99,189.85 215.55,167.16C222.77,151.51 217.08,128.69 203.35,118.26C173.67,108.35 119.96,126.07 100,170Z", fill: "#F7894F" },
] as const;
export const THANKS_CALYX = ["M91.76,155.71 Q91.37,178.34 113.99,178.73 Q97.12,172.78 91.76,155.71Z", "M109.7,181.48C107.32,183.79 100.72,180.82 94.96,174.86C89.21,168.9 86.48,162.21 88.86,159.9C91.24,157.6 97.84,160.57 103.6,166.53C109.35,172.49 112.08,179.18 109.7,181.48Z"] as const;
