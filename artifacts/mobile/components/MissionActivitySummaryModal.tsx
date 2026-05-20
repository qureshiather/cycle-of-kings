import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ResourceCostRow from "@/components/ResourceCostRow";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import {
  formatTroopLine,
  type MissionActivityMetadata,
} from "@/lib/missionMeta";

type Props = {
  visible: boolean;
  metadata: MissionActivityMetadata | null;
  onClose: () => void;
};

export default function MissionActivitySummaryModal({ visible, metadata, onClose }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  if (!metadata) return null;

  const won = metadata.success;
  const accent = won ? colors.success : colors.destructive;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons
              name={won ? "flag-checkered" : "skull-crossbones"}
              size={22}
              color={accent}
            />
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.foreground }]}>{metadata.missionTitle}</Text>
              <Text style={[styles.subtitle, { color: accent }]}>
                {won ? "Victory — spoils secured" : "Defeat — forces routed"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>YOUR FORCES</Text>
            <Text style={[styles.troopLine, { color: colors.foreground }]}>
              {formatTroopLine(metadata.playerTroops)}
            </Text>
          </View>

          <View style={styles.vsRow}>
            <View style={[styles.vsBadge, { backgroundColor: withAlpha(colors.gold, 0.15) }]}>
              <Text style={[styles.vsText, { color: colors.gold }]}>VS</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ENEMY FORCES</Text>
            <Text style={[styles.troopLine, { color: colors.foreground }]}>
              {formatTroopLine(metadata.enemyTroops)}
            </Text>
          </View>

          {won && metadata.loot && (
            <View style={[styles.spoilsBox, { backgroundColor: withAlpha(colors.success, 0.1), borderColor: colors.success + "44" }]}>
              <Text style={[styles.sectionLabel, { color: colors.success }]}>SPOILS WON</Text>
              <ResourceCostRow
                cost={{
                  gold: metadata.loot.gold ?? 0,
                  food: metadata.loot.food ?? 0,
                  wood: metadata.loot.wood ?? 0,
                  stone: metadata.loot.stone ?? 0,
                }}
                variant="reward"
              />
            </View>
          )}

          {!won && (metadata.casualties ?? 0) > 0 && (
            <Text style={[styles.casualties, { color: colors.destructive }]}>
              {metadata.casualties} troops lost in the retreat
            </Text>
          )}

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.gold }]}
            onPress={onClose}
          >
            <Text style={[styles.doneText, { color: colors.background }]}>Close</Text>
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
    padding: 16,
    paddingBottom: 28,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  section: { gap: 4 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  troopLine: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  vsRow: { alignItems: "center", marginVertical: 2 },
  vsBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  vsText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  spoilsBox: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8, marginTop: 4 },
  casualties: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4 },
  doneBtn: { marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  doneText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
