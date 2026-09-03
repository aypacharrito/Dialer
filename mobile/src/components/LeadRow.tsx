import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Lead } from "../lib/types";
import { displayStage, formatPhone, isHotLead, leadSubtitle } from "../lib/lead";
import { Pill, usePalette } from "./Primitives";

export function LeadRow({ lead }: { lead: Lead }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={() => router.push(`/lead/${lead.id}`)}
      style={({ pressed }) => [styles.row, { borderBottomColor: p.border, opacity: pressed ? .6 : 1 }]}
    >
      <View style={[styles.avatar, { backgroundColor: p.greenSoft }]}>
        <Text style={{ color: p.green, fontWeight: "900" }}>{(lead.name || "?").slice(0,1).toUpperCase()}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.topline}>
          <Text numberOfLines={1} style={[styles.name, { color: p.text }]}>{lead.name || "Unnamed lead"}</Text>
          {isHotLead(lead) ? <Pill active>Priority</Pill> : null}
        </View>
        <Text style={[styles.phone, { color: p.text }]}>{formatPhone(lead.phone)}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: p.muted }]}>{leadSubtitle(lead) || displayStage(lead)}</Text>
      </View>
      <Text style={[styles.chevron, { color: p.muted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2 },
  topline: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontWeight: "800", fontSize: 15 },
  phone: { fontSize: 14, fontWeight: "600" },
  meta: { fontSize: 12 },
  chevron: { fontSize: 28, marginLeft: 4 },
});
