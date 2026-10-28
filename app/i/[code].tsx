import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { addPendingCode } from "../../src/features/auth/pendingCodes";
import { hasProfile, useAuthState } from "../../src/features/auth/useAuthState";
import { errorMessage } from "../../src/lib/errors";
import { ErrorNote, PrimaryButton } from "../../src/ui/Form";
import { ScreenHeader } from "../../src/ui/ScreenHeader";
import { color, radius, space, type } from "../../src/ui/theme";

/**
 * Opened by https://domicircles.com/i/<code>: a listing someone shared outside
 * Domi. Signed-up people get access and go to the listing; others have the
 * code saved for signup, which grants access to request it.
 */
export default function SharedListingLink() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = (raw ?? "").toUpperCase().replace(/[\s-]/g, "");
  const state = useAuthState();
  const preview = useQuery(convexQuery(api.shares.preview, { code }));
  const redeem = useMutation(api.shares.redeem);
  const [error, setError] = useState<string | null>(null);

  // Signed up: redeem and go straight to the listing.
  useEffect(() => {
    if (!hasProfile(state)) return;
    redeem({ code })
      .then((r) => {
        if (r.ok && r.itemId) router.replace(`/item/${r.itemId}`);
        else setError("This listing is no longer available.");
      })
      .catch((e) => setError(errorMessage(e)));
  }, [state, code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Not signed up yet: remember the code for signup.
  useEffect(() => {
    if ((state === "signedOut" || state === "needsSignup") && preview.data?.available) addPendingCode("share", code);
  }, [state, code, preview.data]);

  const p = preview.data;
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader close />
      <ScrollView contentContainerStyle={styles.body}>
        {state === "loading" || hasProfile(state) || preview.isPending ? (
          error ? <ErrorNote message={error} /> : <ActivityIndicator color={color.bay} />
        ) : !p || !p.available ? (
          <Text style={type.title}>This one has already found a home.</Text>
        ) : (
          <View style={styles.card}>
            {p.photoUrl ? <Image source={{ uri: p.photoUrl }} style={styles.photo} /> : null}
            <View style={styles.freeTag}>
              <Text style={type.label}>Free{p.status === "pending" ? " · pending pickup" : ""}</Text>
            </View>
            <Text style={type.display}>{p.title}</Text>
            <Text style={type.body}>{p.description}</Text>
            <Text style={type.meta}>
              From {p.ownerName}
              {p.circleName ? ` in ${p.circleName}` : ""}
            </Text>
            <PrimaryButton
              title={state === "signedOut" ? "Sign in to request it" : "Finish signing up to request it"}
              onPress={() => router.replace(state === "signedOut" ? "/sign-in" : "/onboarding")}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.lg },
  card: { gap: space.md },
  photo: { width: "100%", aspectRatio: 4 / 5, borderRadius: radius.thing, backgroundColor: color.fog },
  freeTag: {
    alignSelf: "flex-start",
    backgroundColor: color.poppy,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
});
