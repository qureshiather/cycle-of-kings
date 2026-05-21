import React from "react";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { VISTA_HORIZON, type SeasonTheme } from "@/lib/townVista";

type Props = {
  width: number;
  height: number;
  theme: SeasonTheme;
};

/** Paints sky over the upper canvas so wall art cannot bleed above the hillside. */
export default function TownVistaSkyVeil({ width, height, theme }: Props) {
  const horizon = height * VISTA_HORIZON;

  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <LinearGradient id="veilSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.skyTop} stopOpacity="1" />
          <Stop offset="0.55" stopColor={theme.skyMid} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.skyBottom} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Path d={`M 0 0 H ${width} V ${horizon + 22} H 0 Z`} fill="url(#veilSky)" />
    </Svg>
  );
}
