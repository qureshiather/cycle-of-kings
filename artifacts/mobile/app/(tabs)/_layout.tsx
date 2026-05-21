import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import React, { useMemo } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useGetBuildingSlots, useGetTown } from "@workspace/api-client-react";
import TabBadge from "@/components/TabBadge";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { ActivityUnreadProvider, useActivityUnread } from "@/context/ActivityUnreadContext";
import { useGame } from "@/context/GameContext";
import { countActionableBuilds } from "@/lib/buildableSlots";

export const unstable_settings = {
  initialRouteName: "index",
};

function ActivityTabIcon({ color, size }: { color: string; size: number }) {
  const { unreadCount } = useActivityUnread();

  return (
    <View style={styles.tabIconWrap}>
      <MaterialCommunityIcons name="bell-outline" size={size} color={color} />
      <TabBadge count={unreadCount} />
    </View>
  );
}

function KingdomTabIcon({ color, size }: { color: string; size: number }) {
  const { townId } = useGame();
  const { data: slots = [] } = useGetBuildingSlots(townId ?? 0, {
    query: { enabled: !!townId, staleTime: 15_000 } as any,
  });
  const { data: town } = useGetTown(townId ?? 0, { query: { enabled: !!townId, staleTime: 15_000 } as any });

  const buildableCount = useMemo(
    () =>
      townId && town
        ? countActionableBuilds(slots as { slotType: string; level: number }[], {
            gold: town.gold,
            food: town.food,
            wood: town.wood,
            stone: town.stone,
          })
        : 0,
    [townId, town, slots],
  );

  return (
    <View style={styles.tabIconWrap}>
      <MaterialCommunityIcons name="castle" size={size} color={color} />
      <TabBadge count={buildableCount} variant="gold" />
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="missions">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Missions</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="army">
        <Icon sf={{ default: "shield", selected: "shield.fill" }} />
        <Label>Army</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="castle" />} />
        <Label>Kingdom</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="world">
        <Icon sf={{ default: "globe.americas", selected: "globe.americas.fill" }} />
        <Label>World</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="treasury">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Activity</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { isDark } = useTheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const tabBarStyle = {
    position: "absolute" as const,
    backgroundColor: isIOS ? "transparent" : colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 0,
    ...(isWeb ? { height: 84 } : {}),
  };

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle,
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-legend" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="army"
        options={{
          title: "Army",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sword-cross" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Kingdom",
          tabBarIcon: ({ color, size }) => <KingdomTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="world"
        options={{
          title: "World",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="earth" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="treasury"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <ActivityTabIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isLoading, isSetupRequired } = useGame();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (isSetupRequired) return <Redirect href="/setup" />;

  return (
    <ActivityUnreadProvider>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
    </ActivityUnreadProvider>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
});
