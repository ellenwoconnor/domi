import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ErrorNote, Field, PrimaryButton, TextButton } from "../../ui/Form";
import { color, radius, space, type } from "../../ui/theme";

/**
 * Test accounts for development: email + password against the backend's
 * "dev-password" provider. Shown only in development builds with
 * EXPO_PUBLIC_DEV_PASSWORD_AUTH=true, and the backend only accepts it when
 * the deployment has DEV_PASSWORD_AUTH=true. Never enable either in production.
 */
export const devSignInEnabled = __DEV__ && process.env.EXPO_PUBLIC_DEV_PASSWORD_AUTH === "true";

export function DevSignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(flow: "signIn" | "signUp") {
    setError(null);
    setBusy(true);
    try {
      await signIn("dev-password", { email: email.trim().toLowerCase(), password, flow });
    } catch (e) {
      console.warn("dev sign-in failed", e);
      setError(
        flow === "signIn"
          ? "Couldn't sign in. Wrong password, or create the account first."
          : "Couldn't create it. The email may already exist, or the password is under 8 characters.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={type.label}>Test account (development only)</Text>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        hint="At least 8 characters."
      />
      <ErrorNote message={error} />
      <PrimaryButton
        title="Sign in"
        onPress={() => run("signIn")}
        busy={busy}
        disabled={!email || password.length < 8}
      />
      <TextButton title="Create test account" onPress={() => run("signUp")} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.inkFaint,
  },
});
