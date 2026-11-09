import { useSyncExternalStore } from "react";

// True from the moment account deletion starts until the app is signed out.
// The root layout covers the screen meanwhile: the profile is gone a moment
// before the session is, and without the cover the signup screen flashes.
let closing = false;
const listeners = new Set<() => void>();

export function setAccountClosing(value: boolean) {
  if (closing === value) return;
  closing = value;
  listeners.forEach((l) => l());
}

export function useAccountClosing() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => closing,
  );
}
