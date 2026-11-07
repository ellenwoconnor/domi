// The Domi poppy (docs/brand/domi-mark.svg), as inline SVG for the website.
// Stem and calyx are Bay Blue on light backgrounds; tone "white" is for Bay Blue backgrounds.
const PATHS = (stem) =>
  `<path d="M100,170C129.9,133.69 121.24,81.59 98.98,61.75C83.5,55.22 60.68,60.91 50.08,73.94C39.74,101.92 56.55,151.98 100,170Z" fill="#D9501C" stroke="none"/>` +
  `<path d="M100,170C148.5,152.53 173.85,95.74 167.25,62.43C158.08,46.45 134.92,38.03 117.63,44.37C91.16,65.64 74.07,125.45 100,170Z" fill="#F2652B" stroke="none"/>` +
  `<path d="M100,170C146.01,184.56 195.11,156.51 207.61,127.81C209.05,110.63 195.89,91.13 179.42,86.03C148.14,86.87 103.73,121.89 100,170Z" fill="#F7894F" stroke="none"/>` +
  `<path d="M98.25,173.6 C92.99,184.38 87.68,190.69 80.58,196.13" stroke="${stem}" stroke-width="7" stroke-linecap="round" fill="none"/>` +
  `<path d="M87.37,159.39 Q94.74,180.79 116.13,173.42 Q98.25,173.6 87.37,159.39Z" fill="${stem}" stroke="none"/>` +
  `<path d="M113.04,177.47C111.59,180.45 104.38,179.92 96.93,176.29C89.49,172.66 84.63,167.3 86.08,164.32C87.53,161.34 94.75,161.87 102.19,165.51C109.64,169.14 114.5,174.5 113.04,177.47Z" fill="${stem}" stroke="none"/>`;

const VIEWBOX = "45.4 37.2 164 164";

/** Inline poppy for page markup; size it with CSS on `cls`. */
export const poppy = (cls, tone = "bay") =>
  `<svg class="${cls}" viewBox="${VIEWBOX}" aria-hidden="true">${PATHS(tone === "white" ? "#FFFFFF" : "#1F4E79")}</svg>`;

/** <link> for the browser tab icon. */
export const faviconLink = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">${PATHS("#1F4E79")}</svg>`,
)}">`;
