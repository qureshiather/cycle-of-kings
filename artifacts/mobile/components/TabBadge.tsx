import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TabBadge({ count, inline }: { count: number; inline?: boolean }) {
  const colors = useColors();
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <View
      style={[
        inline ? styles.inlineBadge : styles.badge,
        { backgroundColor: colors.destructive, borderColor: inline ? colors.destructive : colors.surface },
      ]}
    >
      <Text style={[styles.text, { color: colors.destructiveForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  inlineBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 9, fontFamily: "Inter_700Bold", lineHeight: 11 },
});
