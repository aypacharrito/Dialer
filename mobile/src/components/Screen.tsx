import React from "react";
import { Platform, SafeAreaView, ScrollView, StyleSheet, useColorScheme, View, type ScrollViewProps } from "react-native";
import { colors } from "../lib/theme";

export function Screen({ children, scroll = true, contentContainerStyle, ...props }: ScrollViewProps & { scroll?: boolean }) {
  const dark = useColorScheme() === "dark";
  const backgroundColor = dark ? colors.darkBg : colors.bg;
  if (!scroll) {
    return <SafeAreaView style={[styles.safe, { backgroundColor }]}><View style={styles.fill}>{children}</View></SafeAreaView>;
  }
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]}>
      <ScrollView
        {...props}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: 18, paddingBottom: Platform.OS === "ios" ? 40 : 28, gap: 14 },
});
