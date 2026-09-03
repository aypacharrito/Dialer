import { Tabs } from "expo-router";
import React from "react";
import { Text, useColorScheme } from "react-native";
import { colors } from "../../src/lib/theme";

function Icon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ color, fontWeight: "900", fontSize: 17 }}>{symbol}</Text>;
}

export default function TabLayout() {
  const dark = useColorScheme() === "dark";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: dark ? colors.darkMuted : colors.muted,
        tabBarStyle: {
          backgroundColor: dark ? colors.darkCard : "#FFFFFF",
          borderTopColor: dark ? colors.darkBorder : colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <Icon symbol="●" color={color} /> }} />
      <Tabs.Screen name="pipeline" options={{ title: "Pipeline", tabBarIcon: ({ color }) => <Icon symbol="≡" color={color} /> }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: ({ color }) => <Icon symbol="✉" color={color} /> }} />
      <Tabs.Screen name="contacts" options={{ title: "Contacts", tabBarIcon: ({ color }) => <Icon symbol="◎" color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color }) => <Icon symbol="•••" color={color} /> }} />
    </Tabs>
  );
}
