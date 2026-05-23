import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  cycleNumber?: number;
  onDismiss: () => void;
};

export default function CycleResetModal({ visible, cycleNumber, onDismiss }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

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
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Your kingdom was reset for a fresh season. Buildings, troops, and resources start over — trophies
              from past cycles remain on your record.
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
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  btn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: "100%" },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
});
