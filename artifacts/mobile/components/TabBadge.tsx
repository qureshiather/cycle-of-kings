import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TabBadge({
  count,
  inline,
  variant = "alert",
}: {
  count: number;
  inline?: boolean;
  variant?: "alert" | "gold";
}) {
  const colors = useColors();
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);
  const bg = variant === "gold" ? colors.gold : colors.destructive;
  const fg = variant === "gold" ? colors.background : colors.destructiveForeground;
  const border = inline ? bg : variant === "gold" ? colors.surface : colors.surface;

  return (
    <View
      style={[
        inline ? styles.inlineBadge : styles.badge,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
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
