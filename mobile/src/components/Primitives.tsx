import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  type PressableProps,
  type TextInputProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../lib/theme";
import { useWorkspace } from "../state/WorkspaceProvider";

function useDisplayScale() {
  const { workspace } = useWorkspace();
  return workspace.profile.displaySize === "extra-large" ? 1.22 : workspace.profile.displaySize === "comfortable" ? 1 : 1.1;
}

export function usePalette() {
  const dark = useColorScheme() === "dark";
  return {
    dark,
    bg: dark ? colors.darkBg : colors.bg,
    card: dark ? colors.darkCard : colors.card,
    text: dark ? colors.darkText : colors.text,
    muted: dark ? colors.darkMuted : colors.muted,
    border: dark ? colors.darkBorder : colors.border,
    green: colors.green,
    greenSoft: dark ? "#123426" : colors.greenSoft,
    danger: colors.danger,
    warning: colors.warning,
  };
}

export function Title({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  const p = usePalette();
  const scale = useDisplayScale();
  return <View style={{ gap: 4 }}>
    {eyebrow ? <Text style={[styles.eyebrow, { color: p.green, fontSize: 11 * scale }]}>{eyebrow}</Text> : null}
    <Text style={[styles.title, { color: p.text, fontSize: 30 * scale, lineHeight: 36 * scale }]}>{children}</Text>
  </View>;
}

export function Muted({ children, numberOfLines }: { children: React.ReactNode; numberOfLines?: number }) {
  const p = usePalette();
  const scale = useDisplayScale();
  return <Text numberOfLines={numberOfLines} style={[styles.muted, { color: p.muted, fontSize: 14 * scale, lineHeight: 20 * scale }]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const p = usePalette();
  return <View style={[styles.card, { backgroundColor: p.card, borderColor: p.border }, style]}>{children}</View>;
}

export function Button({
  title,
  kind = "primary",
  loading,
  ...props
}: PressableProps & { title: string; kind?: "primary" | "secondary" | "danger"; loading?: boolean }) {
  const p = usePalette();
  const scale = useDisplayScale();
  const backgroundColor = kind === "primary" ? p.green : kind === "danger" ? colors.danger : p.card;
  const textColor = kind === "secondary" ? p.text : "#FFFFFF";
  return (
    <Pressable
      {...props}
      onPress={event => {
        void Haptics.selectionAsync();
        props.onPress?.(event);
      }}
      disabled={props.disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor: kind === "secondary" ? p.border : backgroundColor, opacity: props.disabled ? .5 : 1, transform: [{ scale: pressed ? .975 : 1 }], shadowColor: p.dark ? "#000000" : "#123E2D", shadowOpacity: pressed ? .08 : .14 },
        typeof props.style === "function" ? props.style({ pressed }) : props.style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor, fontSize: 15 * scale }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  const p = usePalette();
  const scale = useDisplayScale();
  return <TextInput
    placeholderTextColor={p.muted}
    {...props}
    style={[styles.field, { backgroundColor: p.card, borderColor: p.border, color: p.text, fontSize: 15 * scale }, props.style]}
  />;
}

export function Pill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  const p = usePalette();
  return <View style={[styles.pill, { backgroundColor: active ? p.greenSoft : p.card, borderColor: active ? p.green : p.border }]}>
    <Text style={{ color: active ? p.green : p.muted, fontWeight: "700", fontSize: 12 }}>{children}</Text>
  </View>;
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }) },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.9, fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif" }) },
  muted: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 20, padding: 17 },
  button: { minHeight: 50, paddingHorizontal: 18, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 3 },
  buttonText: { fontSize: 15, fontWeight: "800", fontFamily: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium" }) },
  field: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  pill: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11 },
});
