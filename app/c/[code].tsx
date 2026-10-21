import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthState } from "../../src/features/auth/useAuthState";
import { JoinCard } from "../../src/features/circles/JoinCard";
import { ScreenHeader } from "../../src/ui/ScreenHeader";
import { color, space } from "../../src/ui/theme";

/** Opened by https://domicircles.com/c/<code> (or domi://c/<code>), in any sign-in state. */
export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const state = useAuthState();
  if (state === "loading") return <SafeAreaView style={styles.screen} />;
  const mode = state === "onboarded" ? "member" : state === "signedOut" ? "signIn" : "onboarding";
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader close />
      <ScrollView contentContainerStyle={styles.body}>
        <JoinCard code={normalize(code ?? "")} mode={mode} />
      </ScrollView>
    </SafeAreaView>
  );
}

const normalize = (c: string) => c.toUpperCase().replace(/[\s-]/g, "");

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg },
});
