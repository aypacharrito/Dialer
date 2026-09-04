import * as Linking from "expo-linking";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { Button, Card, Field, Muted, Title, usePalette } from "../../src/components/Primitives";
import { useWorkspace } from "../../src/state/WorkspaceProvider";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export default function DialerScreen() {
  const p = usePalette();
  const { workspace } = useWorkspace();
  const [number, setNumber] = useState("");
  const normalized = number.replace(/[^+\d]/g, "");
  const match = useMemo(() => {
    const digits = normalized.replace(/\D/g, "").slice(-10);
    return workspace.leads.find(lead => lead.phone.replace(/\D/g, "").slice(-10) === digits);
  }, [normalized, workspace.leads]);

  async function open(url: string) {
    if (!normalized) return;
    try {
      if (!await Linking.canOpenURL(url)) throw new Error("unsupported");
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unavailable", "This device could not open the phone service.");
    }
  }

  return (
    <Screen>
      <Title eyebrow="PACIFICA">Dialer</Title>
      <Card style={styles.card}>
        <Field
          value={number}
          onChangeText={setNumber}
          keyboardType="phone-pad"
          placeholder="Enter a number"
          style={styles.number}
        />
        {match ? <Text style={[styles.match, { color: p.green }]}>{match.name}</Text> : null}
        <View style={styles.pad}>
          {keys.map(key => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={key}
              key={key}
              onPress={() => setNumber(value => value + key)}
              style={({ pressed }) => [styles.key, { backgroundColor: p.bg, borderColor: p.border, transform: [{ scale: pressed ? .93 : 1 }] }]}
            >
              <Text style={[styles.keyText, { color: p.text }]}>{key}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actions}>
          <Button title="⌫" kind="secondary" onPress={() => setNumber(value => value.slice(0, -1))} style={{ flex: 1 }} />
          <Button title="Call" onPress={() => void open(`tel:${normalized}`)} disabled={!normalized} style={{ flex: 2 }} />
          <Button title="Text" kind="secondary" onPress={() => void open(`sms:${normalized}`)} disabled={!normalized} style={{ flex: 1 }} />
        </View>
      </Card>
      <Muted>Calls and texts opened here use your phone’s native service after you confirm them. Automated Pacifica outreach uses the number connected to the workspace.</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  number: { minHeight: 58, fontSize: 23, textAlign: "center", letterSpacing: 1 },
  match: { textAlign: "center", fontSize: 14, fontWeight: "800" },
  pad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  key: { width: "30%", aspectRatio: 1.5, maxHeight: 72, borderWidth: 1, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 24, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
});
