import { QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { convex, queryClient } from "../src/lib/convex";
import { color } from "../src/ui/theme";

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="item/[id]" />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </ConvexProvider>
  );
}
