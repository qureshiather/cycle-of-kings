import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SlotType } from "@workspace/building-progression";
import IsoBuildingArt from "@/components/town-vista/IsoBuildingArt";

type Props = {
  slotType: SlotType;
  level: number;
  upgrading?: boolean;
  accentColor: string;
  width: number;
  height: number;
  isDark: boolean;
};

export default function IsoBuilding({
  slotType,
  level,
  upgrading,
  accentColor,
  width,
  height,
  isDark,
}: Props) {
  return (
    <View style={[styles.wrap, { width, height }]}>
      <IsoBuildingArt slotType={slotType} level={level} accent={accentColor} isDark={isDark} />
      {level >= 1 && (
        <View style={[styles.levelBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      )}
      {upgrading && (
        <View style={styles.hammerBadge}>
          <MaterialCommunityIcons name="hammer" size={9} color="#0e0c08" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  levelBadge: {
    position: "absolute",
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#f2ebd8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  levelText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#0e0c08" },
  hammerBadge: {
    position: "absolute",
    top: 2,
    left: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#d4a520",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: "#f2ebd8",
  },
});
