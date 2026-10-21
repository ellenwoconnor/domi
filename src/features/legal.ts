import * as Linking from "expo-linking";

// Where the Terms of Service and Privacy Policy live. Placeholders until the
// pages are published (M6); the terms version the app sends at signup comes
// from appConfig "terms_version" on the backend, so bump it there when the
// terms change.
export const LEGAL_URLS = {
  terms: "https://domi.example/terms",
  privacy: "https://domi.example/privacy",
} as const;

export function openLegal(which: keyof typeof LEGAL_URLS) {
  Linking.openURL(LEGAL_URLS[which]).catch(() => {});
}
