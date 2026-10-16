import { QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { convex, queryClient } from "../src/lib/convex";

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </ConvexProvider>
  );
}
