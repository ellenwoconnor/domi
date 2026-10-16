import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppConfig } from "../src/features/app-config/useAppConfig";

/** M0 check screen: proves the app can read a row from Convex. */
export default function Home() {
  const { data, isPending, error } = useAppConfig("welcome_message");

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Domi</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Backend check</Text>
        {isPending ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={[styles.value, styles.error]}>Error: {error.message}</Text>
        ) : data ? (
          <Text style={styles.value}>{data.value}</Text>
        ) : (
          <Text style={[styles.value, styles.error]}>
            Connected, but no welcome_message row. Run `npx convex run init`.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 24, backgroundColor: "#fff" },
  title: { fontSize: 40, fontWeight: "700" },
  card: { width: "100%", padding: 20, borderRadius: 16, backgroundColor: "#F3F4F6", gap: 8 },
  label: { fontSize: 13, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 },
  value: { fontSize: 18 },
  error: { color: "#B91C1C" },
});
