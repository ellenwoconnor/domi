import { ConvexAuthProvider, useConvexAuth } from "@convex-dev/auth/react";
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Figtree_800ExtraBold } from "@expo-google-fonts/figtree/800ExtraBold";
import { Fraunces_400Regular_Italic } from "@expo-google-fonts/fraunces/400Regular_Italic";
import { Fraunces_600SemiBold_Italic } from "@expo-google-fonts/fraunces/600SemiBold_Italic";
import { convexQuery } from "@convex-dev/react-query";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
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

/**
 * Three states, each with its own screens:
 * signed out → sign-in; signed in without a profile → onboarding; onboarded → the app.
 */
function AppStack() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { data: me } = useQuery(convexQuery(api.profiles.me, isAuthenticated ? {} : "skip"));
  const profileLoading = isAuthenticated && me === undefined;
  const onboarded = isAuthenticated && me?.needsSignup === false;
  const loading = isLoading || profileLoading;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.white } }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="fulfill/[wishId]" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
