import { useClerk, useUser } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { Button, Card, Muted, Pill, Title, usePalette } from "../../src/components/Primitives";
import { API_URL } from "../../src/lib/api";
import { useWorkspace } from "../../src/state/WorkspaceProvider";

export default function MoreScreen() {
  const p = usePalette();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { workspace, syncing, offline, refresh, updateProfile } = useWorkspace();
  const displaySize = String(workspace.profile.displaySize || "large");

  return (
    <Screen>
      <Title eyebrow="ACCOUNT">More</Title>
      <Card style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: p.greenSoft }]}>
          <Text style={{ color: p.green, fontSize: 22, fontWeight: "900" }}>{(user?.firstName || user?.primaryEmailAddress?.emailAddress || "P").slice(0,1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: p.text }]}>{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Pacifica user"}</Text>
          <Muted>{user?.primaryEmailAddress?.emailAddress || ""}</Muted>
        </View>
        <Pill active={offline}>{syncing ? "Syncing" : offline ? "Offline" : "Synced"}</Pill>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: p.text }]}>Display size</Text>
        <Muted>Choose comfortable, large, or extra-large text across Pacifica.</Muted>
        <View style={styles.sizeRow}>
          {["comfortable", "large", "extra-large"].map(size => <Button key={size} title={size === "extra-large" ? "Extra large" : size[0].toUpperCase() + size.slice(1)} kind={displaySize === size ? "primary" : "secondary"} onPress={() => void updateProfile({ displaySize: size })} style={styles.sizeButton} />)}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: p.text }]}>Pipeline</Text>
        <Muted>Open opportunities and active policy work.</Muted>
        <Button title="Open Pipeline" kind="secondary" onPress={() => router.push("/pipeline")} />
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: p.text }]}>Drive Mode</Text>
        <Muted>Open a simple prioritized calling queue.</Muted>
        <Button title="Open Drive Mode" kind="secondary" onPress={() => router.push("/drive")} />
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: p.text }]}>Connection</Text>
        <Muted>Backend: {API_URL}</Muted>
        <Button title="Sync now" kind="secondary" onPress={() => void refresh()} />
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: p.text }]}>Account</Text>
        <Muted>Signing out removes the active Clerk session. Cached CRM data remains on the device until the app is removed or overwritten by another signed-in workspace.</Muted>
        <Button title="Sign out" kind="danger" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  name: { fontWeight: "900", fontSize: 16 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  sizeRow: { flexDirection: "row", gap: 8 },
  sizeButton: { flex: 1, paddingHorizontal: 6 },
});
