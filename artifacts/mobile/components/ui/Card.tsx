import React from "react";
import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type CardProps = ViewProps & {
  elevated?: boolean;
  padded?: boolean;
};

export default function Card({ elevated, padded = true, style, children, ...rest }: CardProps) {
  const { colors, radius } = useTheme();
  const bg = elevated ? colors.surfaceElevated : colors.surface;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: padded ? 14 : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export function cardShadow(isDark: boolean): ViewStyle {
  return isDark
    ? {}
    : {
        shadowColor: "#1A1612",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      };
}
