import { StyleSheet, Text, View } from "react-native";
import { Logo } from "./Logo";
import { space, type } from "./theme";
import { YouButton } from "./YouButton";

/** The top of each tab (Browse, Circles, Give, My stuff): the wordmark and your initial, then a title and a subtitle. */
export function TabHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Logo size={24} />
        <YouButton />
      </View>
      <View style={styles.titles}>
        <Text style={type.display}>{title}</Text>
        <Text style={type.meta}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.lg },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titles: { gap: 2, marginTop: space.sm },
});
