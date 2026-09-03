import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { Card, Field, Muted, Title } from "../../src/components/Primitives";
import { LeadRow } from "../../src/components/LeadRow";
import { useWorkspace } from "../../src/state/WorkspaceProvider";

export default function ContactsScreen() {
  const { workspace } = useWorkspace();
  const [query, setQuery] = useState("");
  const leads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...workspace.leads]
      .filter(lead => !q || `${lead.name} ${lead.phone} ${lead.email} ${lead.address} ${lead.city}`.toLowerCase().includes(q))
      .sort((a,b) => (a.name || "").localeCompare(b.name || ""));
  }, [workspace.leads, query]);

  return (
    <Screen>
      <Title eyebrow="CRM">Contacts</Title>
      <Field value={query} onChangeText={setQuery} placeholder="Search contacts..." />
      <Muted>{leads.length} contacts from your Pacifica workspace.</Muted>
      <Card style={{ paddingVertical: 2 }}>
        {leads.length ? leads.map(lead => <LeadRow key={lead.id} lead={lead} />) : <View style={styles.empty}><Muted>No contacts found.</Muted></View>}
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({ empty: { padding: 20 } });
