import { ConvexAuthProvider, useConvexAuth } from "@convex-dev/auth/react";
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Figtree_800ExtraBold } from "@expo-google-fonts/figtree/800ExtraBold";
import { Fraunces_400Regular_Italic } from "@expo-google-fonts/fraunces/400Regular_Italic";
import { Fraunces_600SemiBold_Italic } from "@expo-google-fonts/fraunces/600SemiBold_Italic";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { secureStorage } from "../src/lib/authStorage";
import { convex, queryClient } from "../src/lib/convex";
import { color } from "../src/ui/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold_Italic,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      <QueryClientProvider client={queryClient}>
        {fontsReady ? <AppStack /> : null}
        <StatusBar style="dark" />
      </QueryClientProvider>
    </ConvexAuthProvider>
  );
}

/** Signed-out people only see sign-in; signed-in people never see it. */
function AppStack() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.white } }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="fulfill/[wishId]" options={{ presentation: "fullScreenModal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
