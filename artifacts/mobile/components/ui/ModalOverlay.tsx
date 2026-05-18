import React from "react";
import { StyleSheet, TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type ModalOverlayProps = TouchableOpacityProps;

export default function ModalOverlay({ style, children, ...rest }: ModalOverlayProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.overlay, { backgroundColor: colors.overlay }, style]}
      activeOpacity={1}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
