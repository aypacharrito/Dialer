import { Tabs } from "expo-router";
import React from "react";
import { Text, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/lib/theme";
import { useWorkspace } from "../../src/state/WorkspaceProvider";

function Icon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={{ color, fontWeight: "900", fontSize: 17 }}>{symbol}</Text>;
}

export default function TabLayout() {
  const dark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const { unreadMessages } = useWorkspace();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: dark ? colors.darkMuted : colors.muted,
        tabBarStyle: {
          backgroundColor: dark ? colors.darkCard : "#FFFFFF",
          borderTopColor: dark ? colors.darkBorder : colors.border,
          height: 58 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <Icon symbol="●" color={color} /> }} />
      <Tabs.Screen name="dialer" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{ title: "Messages", tabBarBadge: unreadMessages || undefined, tabBarIcon: ({ color }) => <Icon symbol="✉" color={color} /> }} />
      <Tabs.Screen name="contacts" options={{ title: "Contacts", tabBarIcon: ({ color }) => <Icon symbol="◎" color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color }) => <Icon symbol="•••" color={color} /> }} />
      <Tabs.Screen name="pipeline" options={{ href: null }} />
    </Tabs>
  );
}
