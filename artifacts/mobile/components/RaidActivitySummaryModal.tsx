import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ResourceCostRow from "@/components/ResourceCostRow";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import {
  formatDefenseLine,
  formatTroopLine,
  opponentRaidPower,
  playerRaidPower,
  raidBattleFlavor,
  type RaidActivityMetadata,
} from "@/lib/raidMeta";

type Props = {
  visible: boolean;
  metadata: RaidActivityMetadata | null;
  onClose: () => void;
};

function ForceCard({
  label,
  detail,
  power,
  side,
  won,
}: {
  label: string;
  detail: string;
  power: number;
  side: "player" | "opponent";
  won: boolean;
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const isWinner = (side === "player" && won) || (side === "opponent" && !won);
  const accent = side === "player" ? colors.gold : colors.destructive;
  const icon = side === "player" ? "shield-sword" : "castle";

  return (
    <View
      style={[
        styles.forceCard,
        {
          backgroundColor: withAlpha(accent, isWinner ? 0.14 : 0.06),
          borderColor: withAlpha(accent, isWinner ? 0.45 : 0.2),
        },
      ]}
    >
      <View style={styles.forceCardTop}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
        <Text style={[styles.forceLabel, { color: colors.textSecondary }]}>{label}</Text>
        {isWinner && (
          <View style={[styles.winnerChip, { backgroundColor: withAlpha(accent, 0.2) }]}>
            <Text style={[styles.winnerChipText, { color: accent }]}>
              {side === "player" ? "WON" : "HELD"}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.forceTroops, { color: colors.foreground }]}>{detail}</Text>
      <Text style={[styles.forceTotal, { color: accent }]}>{power} power</Text>
    </View>
  );
}

export default function RaidActivitySummaryModal({ visible, metadata, onClose }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  const flavor = useMemo(() => (metadata ? raidBattleFlavor(metadata) : null), [metadata]);

  useEffect(() => {
    if (!visible || !metadata) return;
    Haptics.notificationAsync(
      metadata.success
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }, [visible, metadata]);

  if (!metadata || !flavor) return null;

  const won = metadata.success;
  const accent = won ? colors.success : colors.destructive;
  const heroIcon = won ? "sword-cross" : "shield-off-outline";
  const yours = playerRaidPower(metadata);
  const theirs = opponentRaidPower(metadata);
  const isAttacker = metadata.role === "attacker";

  const playerDetail = isAttacker
    ? formatTroopLine(metadata.attackerTroops)
    : formatDefenseLine(metadata.defenderStrength);
  const opponentDetail = isAttacker
    ? formatDefenseLine(metadata.defenderStrength)
    : formatTroopLine(metadata.attackerTroops);

  const lootTotal =
    (metadata.loot?.gold ?? 0) +
    (metadata.loot?.food ?? 0) +
    (metadata.loot?.wood ?? 0) +
    (metadata.loot?.stone ?? 0);
  const showLoot = lootTotal > 0 && ((isAttacker && won) || (!isAttacker && !won));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: withAlpha(accent, 0.4),
            },
          ]}
        >
          <View style={[styles.sheetAccent, { backgroundColor: accent }]} />

          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.hero, { backgroundColor: withAlpha(accent, 0.12), borderColor: withAlpha(accent, 0.35) }]}>
            <MaterialCommunityIcons name={heroIcon as any} size={40} color={accent} />
          </View>

          <View style={[styles.stamp, { backgroundColor: withAlpha(accent, 0.18), borderColor: withAlpha(accent, 0.5) }]}>
            <Text style={[styles.stampText, { color: accent }]}>{flavor.stamp}</Text>
          </View>

          <Text style={[styles.raidTitle, { color: colors.foreground }]}>{metadata.raidTitle}</Text>
          <Text style={[styles.tagline, { color: accent }]}>{flavor.tagline}</Text>

          <View style={styles.tallyRow}>
            <Text style={[styles.tallySide, { color: colors.gold }]}>{yours}</Text>
            <View style={[styles.tallyVs, { backgroundColor: withAlpha(colors.gold, 0.15) }]}>
              <Text style={[styles.tallyVsText, { color: colors.gold }]}>vs</Text>
            </View>
            <Text style={[styles.tallySide, { color: colors.destructive }]}>{theirs}</Text>
          </View>
          <Text style={[styles.tallyHint, { color: colors.textSecondary }]}>
            {isAttacker ? "Raiders vs kingdom defense" : "Your defense vs attacking host"}
          </Text>

          <View style={styles.forceRow}>
            <ForceCard
              label={flavor.playerLabel}
              detail={playerDetail}
              power={yours}
              side="player"
              won={won}
            />
            <ForceCard
              label={flavor.opponentLabel}
              detail={opponentDetail}
              power={theirs}
              side="opponent"
              won={won}
            />
          </View>

          <View style={[styles.scoutBox, { backgroundColor: withAlpha(colors.textMuted, 0.08), borderColor: colors.border }]}>
            <MaterialCommunityIcons name="feather" size={14} color={colors.textSecondary} />
            <Text style={[styles.scoutNote, { color: colors.textSecondary }]}>{flavor.scoutNote}</Text>
          </View>

          {showLoot && metadata.loot && (
            <View
              style={[
                styles.spoilsBox,
                {
                  backgroundColor: withAlpha(isAttacker ? colors.success : colors.destructive, 0.12),
                  borderColor: withAlpha(isAttacker ? colors.success : colors.destructive, 0.4),
                },
              ]}
            >
              <View style={styles.spoilsHeader}>
                <MaterialCommunityIcons
                  name={isAttacker ? "treasure-chest" : "alert-decagram"}
                  size={18}
                  color={isAttacker ? colors.success : colors.destructive}
                />
                <Text
                  style={[
                    styles.spoilsTitle,
                    { color: isAttacker ? colors.success : colors.destructive },
                  ]}
                >
                  {isAttacker ? "Loot hauled home" : "Resources lost"}
                </Text>
              </View>
              <ResourceCostRow
                cost={{
                  gold: metadata.loot.gold ?? 0,
                  food: metadata.loot.food ?? 0,
                  wood: metadata.loot.wood ?? 0,
                  stone: metadata.loot.stone ?? 0,
                }}
                variant={isAttacker ? "reward" : "default"}
              />
            </View>
          )}

          {isAttacker && !won && (metadata.casualties ?? 0) > 0 && (
            <View style={[styles.casualtyBox, { backgroundColor: withAlpha(colors.destructive, 0.1), borderColor: withAlpha(colors.destructive, 0.35) }]}>
              <MaterialCommunityIcons name="heart-broken" size={16} color={colors.destructive} />
              <Text style={[styles.casualtyText, { color: colors.destructive }]}>
                {metadata.casualties} troops did not return from the retreat
              </Text>
            </View>
          )}

          {isAttacker && won && (metadata.casualties ?? 0) > 0 && (
            <View style={[styles.casualtyBox, { backgroundColor: withAlpha(colors.gold, 0.1), borderColor: withAlpha(colors.gold, 0.35) }]}>
              <MaterialCommunityIcons name="shield-half-full" size={16} color={colors.gold} />
              <Text style={[styles.casualtyText, { color: colors.textSecondary }]}>
                {metadata.casualties} casualties — still counted as a win
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: won ? colors.gold : colors.muted }]}
            onPress={onClose}
          >
            <MaterialCommunityIcons
              name={won ? "trophy" : "shield-sync"}
              size={18}
              color={won ? colors.background : colors.foreground}
            />
            <Text style={[styles.doneText, { color: won ? colors.background : colors.foreground }]}>
              {flavor.doneLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </ModalOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 2,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
    alignItems: "center",
    overflow: "hidden",
  },
  sheetAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  closeBtn: { position: "absolute", top: 14, right: 14, zIndex: 2 },
  hero: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  stamp: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  stampText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  raidTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 2 },
  tagline: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  tallyRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  tallySide: { fontSize: 28, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "center" },
  tallyVs: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tallyVsText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  tallyHint: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  forceRow: { flexDirection: "row", gap: 8, width: "100%", marginTop: 4 },
  forceCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  forceCardTop: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  forceLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, flex: 1 },
  winnerChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  winnerChipText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  forceTroops: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  forceTotal: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scoutBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    alignItems: "flex-start",
  },
  scoutNote: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 18 },
  spoilsBox: { width: "100%", padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  spoilsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  spoilsTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  casualtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  casualtyText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
  },
  doneText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
