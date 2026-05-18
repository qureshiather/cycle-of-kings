import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BUILDING_CATEGORY_LABELS,
  BUILDING_CATEGORY_ORDER,
  BUILDINGS_BY_CATEGORY,
  formatRequirementParts,
  getSlotLabel,
  getTownHallLevel,
  getUnmetRequirementParts,
  type BuildingCategory,
  type SlotLike,
  type SlotType,
} from "@workspace/building-progression";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { getSlotColor, SLOT_ICONS } from "@/lib/buildingMeta";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.88;

type SlotData = SlotLike & { upgrading?: boolean };

function slotLevel(slots: SlotData[], slotType: string): number {
  return slots.find((s) => s.slotType === slotType)?.level ?? 0;
}

function buildStatus(
  slotType: SlotType,
  slots: SlotData[],
): { label: string; tone: "built" | "ready" } | null {
  const level = slotLevel(slots, slotType);
  if (level > 0) return { label: `Built · Lv ${level}`, tone: "built" };
  if (getUnmetRequirementParts(slotType, slots).length === 0) {
    return { label: "Ready to build", tone: "ready" };
  }
  return null;
}

function RequirementChips({
  parts,
  unmet,
  colors,
  withAlpha,
}: {
  parts: string[];
  unmet: string[];
  colors: ReturnType<typeof useColors>;
  withAlpha: (color: string, alpha: number) => string;
}) {
  const unmetSet = new Set(unmet);
  return (
    <View style={styles.chips}>
      {parts.map((part) => {
        const met = !unmetSet.has(part);
        return (
          <View
            key={part}
            style={[
              styles.chip,
              {
                backgroundColor: met
                  ? withAlpha(colors.success, 0.12)
                  : withAlpha(colors.textMuted, 0.08),
                borderColor: met ? withAlpha(colors.success, 0.35) : colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={met ? "check" : "circle-outline"}
              size={10}
              color={met ? colors.success : colors.textMuted}
            />
            <Text
              style={[
                styles.chipText,
                { color: met ? colors.success : colors.textSecondary },
              ]}
            >
              {part}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BuildingGuideRow({
  slotType,
  slots,
  colors,
  withAlpha,
}: {
  slotType: SlotType;
  slots: SlotData[];
  colors: ReturnType<typeof useColors>;
  withAlpha: (color: string, alpha: number) => string;
}) {
  const color = getSlotColor(slotType, colors);
  const icon = SLOT_ICONS[slotType] ?? "help";
  const status = buildStatus(slotType, slots);
  const parts = formatRequirementParts(slotType);
  const unmet = getUnmetRequirementParts(slotType, slots);
  const toneColor = { built: colors.success, ready: colors.gold };

  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: colors.foreground }]}>{getSlotLabel(slotType)}</Text>
        <RequirementChips parts={parts} unmet={unmet} colors={colors} withAlpha={withAlpha} />
        {status && (
          <Text style={[styles.rowStatus, { color: toneColor[status.tone] }]}>{status.label}</Text>
        )}
      </View>
    </View>
  );
}

export default function BuildingProgressionModal({
  visible,
  onClose,
  slots,
}: {
  visible: boolean;
  onClose: () => void;
  slots: SlotData[];
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const thLevel = getTownHallLevel(slots);

  const [collapsedSections, setCollapsedSections] = useState<Record<BuildingCategory, boolean>>({
    production: false,
    army: false,
  });

  const toggleSection = useCallback((category: BuildingCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCollapsedSections((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const sectionIcon: Record<BuildingCategory, keyof typeof MaterialCommunityIcons.glyphMap> = {
    production: "warehouse",
    army: "sword-cross",
  };
  const sectionColor: Record<BuildingCategory, string> = {
    production: colors.food,
    army: colors.military,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalOverlay onPress={onClose}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: withAlpha(colors.gold, 0.12) }]}>
              <MaterialCommunityIcons name="map-legend" size={22} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Building guide</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Town Hall level {thLevel} · build in order below
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close building guide"
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.note, { color: colors.textSecondary, borderColor: colors.border }]}>
            Each building lists everything required for a first build. Army buildings also need
            earlier structures (e.g. Stables need Barracks). Upgrades only cost resources.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {BUILDING_CATEGORY_ORDER.map((category) => {
              const isCollapsed = collapsedSections[category];
              const buildings = BUILDINGS_BY_CATEGORY[category].filter((t) => t !== "townHall");
              const accent = sectionColor[category];
              const builtInSection = buildings.filter((t) => slotLevel(slots, t) > 0).length;

              return (
                <View key={category} style={styles.section}>
                  <Pressable
                    onPress={() => toggleSection(category)}
                    style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !isCollapsed }}
                    accessibilityLabel={`${BUILDING_CATEGORY_LABELS[category]}, ${builtInSection} of ${buildings.length} built`}
                  >
                    <MaterialCommunityIcons
                      name={isCollapsed ? "chevron-right" : "chevron-down"}
                      size={18}
                      color={accent}
                    />
                    <MaterialCommunityIcons
                      name={sectionIcon[category]}
                      size={16}
                      color={accent}
                    />
                    <Text style={[styles.sectionTitle, { color: accent }]}>
                      {BUILDING_CATEGORY_LABELS[category]}
                    </Text>
                    {isCollapsed && (
                      <Text style={[styles.sectionSummary, { color: colors.textSecondary }]}>
                        {builtInSection}/{buildings.length} built
                      </Text>
                    )}
                    <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
                  </Pressable>
                  {!isCollapsed && (
                    <View style={styles.sectionBody}>
                      {buildings.map((slotType) => (
                        <BuildingGuideRow
                          key={slotType}
                          slotType={slotType}
                          slots={slots}
                          colors={colors}
                          withAlpha={withAlpha}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ModalOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    height: SHEET_MAX_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderWidth: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  note: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 24 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  sectionSummary: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLine: { flex: 1, height: 1, marginLeft: 4 },
  sectionBody: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 6 },
  rowName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  rowStatus: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
