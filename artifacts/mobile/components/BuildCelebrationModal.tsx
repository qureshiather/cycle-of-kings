import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { ACHIEVEMENT_BY_ID } from "@workspace/achievements";
import { getSlotColor, SLOT_BONUS, SLOT_ICONS, SLOT_NAMES } from "@/lib/buildingMeta";

export type BuildCelebration = {
  slotType: string;
  level: number;
  kind: "built" | "upgrade";
  awardedAchievements?: string[];
};

type Props = {
  visible: boolean;
  celebration: BuildCelebration | null;
  onClose: () => void;
};

export default function BuildCelebrationModal({ visible, celebration, onClose }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  if (!celebration) return null;

  const { slotType, level, kind, awardedAchievements = [] } = celebration;
  const name = SLOT_NAMES[slotType] ?? slotType;
  const color = getSlotColor(slotType, colors);
  const icon = SLOT_ICONS[slotType] ?? "castle";
  const bonus = SLOT_BONUS[slotType]?.(level);
  const isNew = kind === "built";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.hero, { backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.35) }]}>
            <View style={[styles.heroIcon, { backgroundColor: withAlpha(color, 0.2) }]}>
              <MaterialCommunityIcons name={icon as any} size={36} color={color} />
            </View>
            <MaterialCommunityIcons
              name={isNew ? "flag-checkered" : "progress-clock"}
              size={22}
              color={isNew ? colors.success : colors.warning}
              style={styles.heroBadge}
            />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{name}</Text>
            <Text style={[styles.subtitle, { color: isNew ? colors.success : colors.warning }]}>
              {isNew ? "Construction complete — your realm expands" : `Upgrade begun — rising to level ${level}`}
            </Text>
          </View>

          <View style={[styles.levelRow, { borderColor: colors.border }]}>
            <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>LEVEL</Text>
            <Text style={[styles.levelValue, { color }]}>{level}</Text>
          </View>

          {bonus ? (
            <View style={[styles.bonusBox, { backgroundColor: withAlpha(color, 0.1), borderColor: withAlpha(color, 0.35) }]}>
              <Text style={[styles.bonusLabel, { color: colors.textSecondary }]}>KINGDOM BENEFIT</Text>
              <Text style={[styles.bonusText, { color }]}>{bonus}</Text>
            </View>
          ) : null}

          {awardedAchievements.length > 0 && (
            <View style={[styles.bonusBox, { backgroundColor: withAlpha(colors.gold, 0.1), borderColor: withAlpha(colors.gold, 0.35) }]}>
              <Text style={[styles.bonusLabel, { color: colors.textSecondary }]}>TROPHIES EARNED</Text>
              {awardedAchievements.map((id) => {
                const def = ACHIEVEMENT_BY_ID[id as keyof typeof ACHIEVEMENT_BY_ID];
                return (
                  <Text key={id} style={[styles.bonusText, { color: colors.gold, marginTop: 4 }]}>
                    {def?.title ?? id}
                  </Text>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.gold }]}
            onPress={onClose}
          >
            <Text style={[styles.doneText, { color: colors.background }]}>
              {isNew ? "Excellent" : "Got it"}
            </Text>
          </TouchableOpacity>
        </View>
      </ModalOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
    alignItems: "center",
  },
  hero: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "transparent",
  },
  header: { alignItems: "center", gap: 4, width: "100%" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 18 },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    width: "100%",
  },
  levelLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  levelValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  bonusBox: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  bonusLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  bonusText: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  doneBtn: { marginTop: 4, paddingVertical: 14, paddingHorizontal: 48, borderRadius: 10, alignItems: "center", width: "100%" },
  doneText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
