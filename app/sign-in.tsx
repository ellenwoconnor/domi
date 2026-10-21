import { useAuthActions } from "@convex-dev/auth/react";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appleSignInParams, googleSignInParams } from "../src/features/auth/nativeSignIn";
import { Logo } from "../src/ui/Logo";
import { color, radius, space, type } from "../src/ui/theme";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<null | "apple" | "google">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  async function run(provider: "apple" | "google") {
    setError(null);
    setBusy(provider);
    try {
      const params = provider === "apple" ? await appleSignInParams() : await googleSignInParams();
      if (params) await signIn(provider, params);
    } catch (e) {
      console.warn(`${provider} sign-in failed`, e);
      setError(`That didn't work. Try again, or use the other sign-in option.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Logo size={40} />
        <Text style={[type.display, styles.headline]}>Good things, close to home.</Text>
        <Text style={[type.body, { color: color.inkSoft }]}>
          Give and get secondhand with your neighbors. Your circles see what you post; nobody else does.
        </Text>
      </View>

      <View style={styles.buttons}>
        {busy ? <ActivityIndicator color={color.bay} style={{ marginBottom: space.sm }} /> : null}
        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.control}
            style={styles.apple}
            onPress={() => !busy && run("apple")}
          />
        )}
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Light}
          onPress={() => !busy && run("google")}
          disabled={!!busy}
          style={styles.google}
        />
        {error ? <Text style={[type.meta, styles.error]}>{error}</Text> : null}
        <Text style={[type.meta, styles.legal]}>
          By continuing, you agree to Domi's Terms and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white, paddingHorizontal: space.lg, justifyContent: "space-between" },
  top: { paddingTop: space.xxl, gap: space.md },
  headline: { fontSize: 40, lineHeight: 46, marginTop: space.xl },
  buttons: { gap: space.md, paddingBottom: space.lg },
  apple: { height: 50, width: "100%" },
  google: { height: 52, width: "100%" },
  error: { color: color.ink, backgroundColor: color.fog, padding: space.md, borderRadius: radius.control },
  legal: { textAlign: "center", color: color.inkFaint },
});
