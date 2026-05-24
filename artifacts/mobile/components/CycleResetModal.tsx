import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { CycleRecap } from "@workspace/api-client-react";
import { ACHIEVEMENT_BY_ID, type AchievementId } from "@workspace/achievements";
import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  cycleNumber?: number;
  cycleRecap?: CycleRecap;
  onDismiss: () => void;
};

export default function CycleResetModal({ visible, cycleNumber, cycleRecap, onDismiss }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  const endingCycle = cycleRecap?.endingCycleNumber;
  const trophyCount = cycleRecap?.trophiesEarned.length ?? 0;
  const trophyPoints = cycleRecap?.trophyPointsEarned ?? 0;
  const rank = cycleRecap?.leaderboardRank;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <ModalOverlay onPress={onDismiss}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.gold, 0.15) }]}>
              <MaterialCommunityIcons name="calendar-refresh" size={32} color={colors.gold} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {cycleNumber != null ? `Cycle ${cycleNumber} has begun` : "New cycle has begun"}
            </Text>

            {endingCycle != null && (
              <View style={[styles.recapBox, { backgroundColor: withAlpha(colors.gold, 0.08), borderColor: withAlpha(colors.gold, 0.25) }]}>
                <Text style={[styles.recapHeading, { color: colors.gold }]}>Cycle {endingCycle} recap</Text>
                <Text style={[styles.recapStat, { color: colors.foreground }]}>
                  {trophyCount} trophy{trophyCount === 1 ? "" : "ies"} · {trophyPoints} pts
                </Text>
                {rank != null && (
                  <Text style={[styles.recapStat, { color: colors.textSecondary }]}>
                    Leaderboard rank #{rank}
                  </Text>
                )}
                {trophyCount > 0 && (
                  <ScrollView style={styles.trophyScroll} nestedScrollEnabled>
                    {cycleRecap!.trophiesEarned.map((id) => {
                      const def = ACHIEVEMENT_BY_ID[id as AchievementId];
                      return (
                        <Text key={id} style={[styles.trophyLine, { color: colors.textSecondary }]}>
                          · {def?.title ?? id}
                        </Text>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Your kingdom has been reset. Trophies are saved; everything else starts anew — buildings, troops,
              and resources return to the starter pack.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.gold }]}
              onPress={onDismiss}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: colors.background }]}>Rebuild my realm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ModalOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
    maxHeight: "80%",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  recapBox: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  recapHeading: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  recapStat: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  trophyScroll: { maxHeight: 72, marginTop: 4 },
  trophyLine: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  btn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: "100%" },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
});
