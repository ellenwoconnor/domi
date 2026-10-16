import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

/**
 * The single Convex client for the app, wired into TanStack Query.
 *
 * EXPO_PUBLIC_CONVEX_URL is written to .env.local by `npx convex dev`.
 * If it points at a local backend (127.0.0.1 / localhost), we swap in the
 * dev machine's LAN address from the Expo dev server so a physical phone
 * can reach it. Cloud dev deployments (*.convex.cloud) are used as-is.
 */
function resolveConvexUrl(): string {
  const raw = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!raw) {
    throw new Error(
      "EXPO_PUBLIC_CONVEX_URL is not set. Run `npm run dev:backend` once to create .env.local, then restart Expo.",
    );
  }
  const url = new URL(raw);
  const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (isLoopback && devHost && devHost !== "localhost" && devHost !== "127.0.0.1") {
    url.hostname = devHost;
  }
  return url.toString().replace(/\/$/, "");
}

export const convex = new ConvexReactClient(resolveConvexUrl(), {
  unsavedChangesWarning: false,
});

const convexQueryClient = new ConvexQueryClient(convex);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});

convexQueryClient.connect(queryClient);
