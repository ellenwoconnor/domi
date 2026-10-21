import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "@convex-dev/auth/react";

// Session tokens live in the iOS Keychain / Android Keystore, so a signed-in
// user stays signed in across app restarts.
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

export const secureStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(safeKey(key)),
  setItem: (key, value) => SecureStore.setItemAsync(safeKey(key), value),
  removeItem: (key) => SecureStore.deleteItemAsync(safeKey(key)),
};
