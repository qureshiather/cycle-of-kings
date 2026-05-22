import React from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import {
  getVistaGroundPath,
  getVistaSettlementPadPath,
  getVistaSkyPath,
  VISTA_HORIZON,
  type SeasonTheme,
} from "@/lib/townVista";

type Props = {
  width: number;
  height: number;
  theme: SeasonTheme;
  hasFarm: boolean;
  foodTier: number;
  showSun?: boolean;
};

export default function TownVistaLandscape({
  width,
  height,
  theme,
  hasFarm,
  foodTier,
  showSun = true,
}: Props) {
  const w = width;
  const h = height;
  const skyPath = getVistaSkyPath(w, h);
  const groundPath = getVistaGroundPath(w, h);
  const padPath = getVistaSettlementPadPath(w, h);
  const land = theme.meadow;

  return (
    <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.skyTop} stopOpacity="1" />
          <Stop offset="0.6" stopColor={theme.skyMid} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.skyBottom} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <Path d={skyPath} fill="url(#skyGrad)" />
      <Path d={groundPath} fill={land} />
      <Path
        d={padPath}
        fill={land}
        stroke={theme.tileStroke}
        strokeWidth={1}
        strokeOpacity={0.35}
        fillOpacity={0.85}
      />

      {showSun && (
        <>
          <Circle cx={w * 0.78} cy={h * (VISTA_HORIZON * 0.35)} r={18} fill={theme.tree} fillOpacity={0.12} />
          <Circle cx={w * 0.78} cy={h * (VISTA_HORIZON * 0.35)} r={10} fill={theme.tree} fillOpacity={0.3} />
        </>
      )}

      {hasFarm &&
        [0, 1, 2].map((i) => (
          <Ellipse
            key={`f-${i}`}
            cx={w * (0.2 + i * 0.05)}
            cy={h * (0.65 + i * 0.02)}
            rx={w * 0.035}
            ry={h * 0.02}
            fill={theme.tree}
            fillOpacity={0.1 + foodTier * 0.05}
          />
        ))}

      {[
        { x: 0.06, y: 0.57, s: 0.85 },
        { x: 0.94, y: 0.55, s: 0.9 },
        { x: 0.08, y: 0.75, s: 0.8 },
        { x: 0.92, y: 0.73, s: 0.85 },
      ].map((t, i) => (
        <G key={`tree-${i}`} transform={`translate(${w * t.x}, ${h * t.y}) scale(${t.s})`}>
          <Ellipse cx={0} cy={10} rx={10} ry={3} fill="#000" opacity={0.08} />
          <Path d="M -3 8 L 3 8 L 2 2 L -2 2 Z" fill={theme.treeDark} />
          <Circle cx={0} cy={-1} r={9} fill={theme.tree} fillOpacity={0.72} />
          <Circle cx={-4} cy={2} r={6} fill={theme.treeDark} fillOpacity={0.8} />
        </G>
      ))}
    </Svg>
  );
}
