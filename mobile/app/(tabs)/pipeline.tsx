import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { Card, Field, Muted, Pill, Title, usePalette } from "../../src/components/Primitives";
import { LeadRow } from "../../src/components/LeadRow";
import { displayStage } from "../../src/lib/lead";
import { useWorkspace } from "../../src/state/WorkspaceProvider";

export default function PipelineScreen() {
  const p = usePalette();
  const { workspace } = useWorkspace();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All");

  const stages = useMemo(() => ["All", ...Array.from(new Set(workspace.leads.map(displayStage).filter(Boolean))).slice(0, 10)], [workspace.leads]);
  const leads = useMemo(() => workspace.leads.filter(lead => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${lead.name} ${lead.phone} ${lead.email} ${lead.product} ${lead.city}`.toLowerCase().includes(q);
    const matchesStage = stage === "All" || displayStage(lead) === stage;
    return matchesQuery && matchesStage;
  }), [workspace.leads, query, stage]);

  return (
    <Screen>
      <Title eyebrow="CRM">Pipeline</Title>
      <Field value={query} onChangeText={setQuery} placeholder="Search name, phone, email, product..." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {stages.map(item => (
          <Pressable key={item} onPress={() => setStage(item)}><Pill active={stage === item}>{item}</Pill></Pressable>
        ))}
      </ScrollView>
      <View style={{ gap: 2 }}>
        <Text style={[styles.count, { color: p.text }]}>{leads.length} leads</Text>
        <Muted>{stage === "All" ? "All pipeline stages" : stage}</Muted>
      </View>
      <Card style={{ paddingVertical: 2 }}>
        {leads.length ? leads.map(lead => <LeadRow key={lead.id} lead={lead} />) : <View style={styles.empty}><Muted>No matching leads.</Muted></View>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingRight: 12 },
  count: { fontSize: 17, fontWeight: "900" },
  empty: { padding: 20 },
});
