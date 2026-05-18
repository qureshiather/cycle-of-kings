import React from "react";
import { Pressable, StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type ModalOverlayProps = ViewProps & {
  onPress?: () => void;
};

/** Full-screen modal backdrop; sheet children receive touches (scroll works). */
export default function ModalOverlay({ style, children, onPress, ...rest }: ModalOverlayProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.overlay, style]} {...rest}>
      <Pressable
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
