import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JoinCard } from "../src/features/circles/JoinCard";
import { Field } from "../src/ui/Form";
import { FormScroll } from "../src/ui/FormScroll";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { color, type } from "../src/ui/theme";

/** "Join with an invite code" for people who are already signed up. */
export default function Join() {
  const [typed, setTyped] = useState("");
  const code = typed.toUpperCase().replace(/[\s-]/g, "");
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title="Join a circle" close />
      <FormScroll>
        <Text style={type.caption}>Got an invite link or code from a neighbor? Enter the code here.</Text>
        <Field
          label="Invite code"
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          placeholder="7K2M-QX9P"
          maxLength={12}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
        />
        {code.length === 8 ? <JoinCard key={code} code={code} mode="member" /> : null}
      </FormScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
});
