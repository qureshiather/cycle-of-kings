import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  name: string;
  icon: string;
  accentColor: string;
  line1: string;
  line2?: string;
  status?: "built" | "upgrading" | "ready" | "locked" | "empty";
  onDismiss: () => void;
};

export default function VistaCallout({
  name,
  icon,
  accentColor,
  line1,
  line2,
  status = "built",
  onDismiss,
}: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  const statusColor =
    status === "upgrading"
      ? colors.warning
      : status === "ready"
        ? colors.gold
        : status === "locked"
          ? colors.textMuted
          : accentColor;

  return (
    <Pressable
      onPress={onDismiss}
      style={[
        styles.wrap,
        {
          backgroundColor: withAlpha(colors.background, 0.92),
          borderColor: withAlpha(statusColor, 0.45),
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: withAlpha(accentColor, 0.15) }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accentColor} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.line1, { color: statusColor }]} numberOfLines={2}>
          {line1}
        </Text>
        {line2 ? (
          <Text style={[styles.line2, { color: colors.textMuted }]} numberOfLines={2}>
            {line2}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 1, minWidth: 0 },
  name: { fontSize: 12, fontFamily: "Inter_700Bold" },
  line1: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  line2: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 13 },
});
