import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { GameState } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import SeasonStrip from "@/components/SeasonStrip";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  gameState: GameState;
  onSeasonPress: () => void;
  onOpenVista: () => void;
};

export default function KingdomQuickPanel({ gameState, onSeasonPress, onOpenVista }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  return (
    <View style={styles.panel}>
      <SeasonStrip gameState={gameState} onPress={onSeasonPress} />
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onOpenVista();
        }}
        style={({ pressed }) => [
          styles.vistaBtn,
          {
            backgroundColor: withAlpha(colors.gold, pressed ? 0.2 : 0.12),
            borderColor: withAlpha(colors.gold, 0.45),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="View kingdom map"
      >
        <View style={[styles.vistaIcon, { backgroundColor: withAlpha(colors.gold, 0.15) }]}>
          <MaterialCommunityIcons name="map" size={20} color={colors.gold} />
        </View>
        <View style={styles.vistaText}>
          <Text style={[styles.vistaTitle, { color: colors.foreground }]}>View Kingdom</Text>
          <Text style={[styles.vistaSub, { color: colors.textSecondary }]}>
            Map, walls & villagers
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.gold} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  vistaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  vistaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  vistaText: { flex: 1, gap: 2 },
  vistaTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  vistaSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
