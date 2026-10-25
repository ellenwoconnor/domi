import * as Linking from "expo-linking";

// The Terms of Service and Privacy Policy are pages on domicircles.com, served
// by the Worker in web/ (text in web/src/legal.js). The terms version the app
// sends at signup comes from appConfig "terms_version" on the backend
// (convex/init.ts); bump it there when the terms change.
export const LEGAL_URLS = {
  terms: "https://domicircles.com/terms",
  privacy: "https://domicircles.com/privacy",
} as const;

export function openLegal(which: keyof typeof LEGAL_URLS) {
  Linking.openURL(LEGAL_URLS[which]).catch(() => {});
}
