import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card, Muted, Title, usePalette } from "../../src/components/Primitives";
import { useWorkspace } from "../../src/state/WorkspaceProvider";
import type { Communication, Lead } from "../../src/lib/types";

type InboxItem = { lead: Lead; communication: Communication; time: number };

function commTime(item: Communication) {
  const raw = item.createdAt || item.timestamp || item.at || "";
  const value = new Date(raw).getTime();
  return Number.isFinite(value) ? value : 0;
}

export default function InboxScreen() {
  const p = usePalette();
  const { workspace } = useWorkspace();
  const items = useMemo(() => {
    const collected: InboxItem[] = [];
    for (const lead of workspace.leads) {
      for (const communication of Array.isArray(lead.communications) ? lead.communications : []) {
        collected.push({ lead, communication, time: commTime(communication) });
      }
    }
    return collected.sort((a,b) => b.time - a.time).slice(0, 100);
  }, [workspace.leads]);

  return (
    <Screen>
      <Title eyebrow="COMMUNICATIONS">Inbox</Title>
      <Muted>Recent SMS and email activity stored on your Pacifica leads.</Muted>
      <Card style={{ paddingVertical: 2 }}>
        {items.length ? items.map((item, index) => {
          const comm = item.communication;
          const body = String(comm.body || comm.text || comm.subject || "Message");
          const direction = String(comm.direction || "").toLowerCase();
          const inbound = direction.includes("in");
          return (
            <Text
              key={`${item.lead.id}-${String(comm.id || comm.providerId || index)}`}
              onPress={() => router.push(`/lead/${item.lead.id}`)}
              style={[styles.item, { borderBottomColor: p.border }]}
            >
              <Text style={[styles.name, { color: p.text }]}>{inbound ? "● " : "↗ "}{item.lead.name}{"\n"}</Text>
              <Text style={[styles.body, { color: p.muted }]} numberOfLines={2}>{body}</Text>
            </Text>
          );
        }) : <View style={styles.empty}><Muted>No stored communications yet. New replies will appear after they sync to the CRM workspace.</Muted></View>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontWeight: "900", fontSize: 14 },
  body: { fontSize: 13, lineHeight: 19 },
  empty: { padding: 20 },
});
