import React from "react";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";
import type { SlotType } from "@workspace/building-progression";
import { darken, isoBox, lighten, paletteFromAccent, type IsoPalette } from "@/lib/isoPrimitives";

const VB_W = 56;
const VB_H = 64;
const BASE_Y = 50;
const CX = 28;

type ArtProps = {
  slotType: SlotType;
  level: number;
  accent: string;
  isDark: boolean;
};

function IsoBoxLayer({
  cx,
  by,
  w,
  h,
  rise,
  pal,
  stroke,
}: {
  cx: number;
  by: number;
  w: number;
  h: number;
  rise: number;
  pal: IsoPalette;
  stroke?: string;
}) {
  const p = isoBox(cx, by, w, h, rise);
  const sw = stroke ? 0.6 : 0;
  return (
    <G>
      <Ellipse cx={cx} cy={by + h / 2 + 2} rx={w * 0.42} ry={h * 0.35} fill="#000" opacity={0.14} />
      <Path d={p.ground} fill={pal.ground} stroke={stroke} strokeWidth={sw} />
      <Path d={p.left} fill={pal.left} stroke={stroke} strokeWidth={sw} />
      <Path d={p.right} fill={pal.right} stroke={stroke} strokeWidth={sw} />
      <Path d={p.top} fill={pal.top} stroke={stroke} strokeWidth={sw} />
    </G>
  );
}

function TownHallArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={38} h={19} rise={rise} pal={pal} stroke={pal.trim} />
      {/* Columned façade */}
      {[ -10, -4, 4, 10 ].map((dx) => (
        <Rect
          key={dx}
          x={CX + dx - 1.5}
          y={by - rise - 8}
          width={3}
          height={rise - 4}
          fill={pal.detail}
          opacity={0.85}
        />
      ))}
      <Path
        d={`M ${CX - 14} ${by - rise - 10} L ${CX} ${by - rise - 18} L ${CX + 14} ${by - rise - 10} L ${CX + 10} ${by - rise - 6} L ${CX - 10} ${by - rise - 6} Z`}
        fill={pal.trim}
      />
      <Circle cx={CX} cy={by - rise - 14} r={3} fill={pal.detail} />
    </G>
  );
}

function FarmArt({ pal }: { pal: IsoPalette }) {
  const by = BASE_Y;
  const p = isoBox(CX, by, 40, 20, 3);
  return (
    <G>
      <Path d={p.ground} fill={darken(pal.ground, 0.1)} />
      <Path d={p.top} fill={lighten(pal.top, 0.2)} />
      {[ -12, -4, 4, 12 ].map((dx, i) => (
        <G key={i}>
          <Path
            d={`M ${CX + dx - 4} ${by - 4} L ${CX + dx + 4} ${by - 4} L ${CX + dx + 2} ${by + 2} L ${CX + dx - 2} ${by + 2} Z`}
            fill={i % 2 === 0 ? pal.top : lighten(pal.top, 0.12)}
            opacity={0.9}
          />
          <Line x1={CX + dx} y1={by - 6} x2={CX + dx} y2={by - 12} stroke={pal.detail} strokeWidth={1.2} />
        </G>
      ))}
    </G>
  );
}

function LumberMillArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={32} h={16} rise={rise} pal={pal} stroke={pal.trim} />
      <Path d={`M ${CX + 14} ${by - 4} L ${CX + 18} ${by - 2} L ${CX + 16} ${by + 6} L ${CX + 10} ${by + 4} Z`} fill={darken(pal.left, 0.15)} />
      <Path d={`M ${CX + 12} ${by + 2} L ${CX + 20} ${by + 4} L ${CX + 18} ${by + 8} L ${CX + 10} ${by + 6} Z`} fill={pal.trim} />
      <Circle cx={CX + 16} cy={by - rise + 4} r={5} fill="none" stroke={pal.detail} strokeWidth={1.5} />
      <Line x1={CX + 16} y1={by - rise + 9} x2={CX + 16} y2={by - 6} stroke={pal.detail} strokeWidth={1.2} />
    </G>
  );
}

function QuarryArt({ pal }: { pal: IsoPalette }) {
  const by = BASE_Y;
  const p = isoBox(CX, by, 36, 18, 6);
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={36} h={18} rise={8} pal={pal} stroke={pal.trim} />
      <Path d={`M ${CX - 8} ${by - 2} L ${CX + 8} ${by - 2} L ${CX + 6} ${by + 8} L ${CX - 6} ${by + 8} Z`} fill={darken(pal.ground, 0.25)} />
      {[ -4, 2, 8 ].map((dx) => (
        <Rect key={dx} x={CX + dx - 2} y={by + 2} width={4} height={3} fill={pal.detail} opacity={0.7} rx={0.5} />
      ))}
    </G>
  );
}

function MineArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={30} h={15} rise={rise} pal={pal} stroke={pal.trim} />
      <Path
        d={`M ${CX - 10} ${by - rise + 6} Q ${CX} ${by - rise + 2} ${CX + 10} ${by - rise + 6} L ${CX + 8} ${by - rise + 14} L ${CX - 8} ${by - rise + 14} Z`}
        fill={darken(pal.left, 0.35)}
      />
      <Ellipse cx={CX} cy={by - rise + 10} rx={6} ry={3} fill="#000" opacity={0.35} />
      <G transform={`rotate(-12, ${CX + 13}, ${by - 4})`}>
        <Rect x={CX + 10} y={by - 6} width={6} height={4} fill={pal.trim} />
      </G>
    </G>
  );
}

function MarketArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={34} h={17} rise={rise} pal={pal} stroke={pal.trim} />
      <Path
        d={`M ${CX - 16} ${by - rise + 2} L ${CX} ${by - rise - 6} L ${CX + 16} ${by - rise + 2} L ${CX + 14} ${by - rise + 8} L ${CX - 14} ${by - rise + 8} Z`}
        fill={lighten(pal.top, 0.15)}
        stroke={pal.trim}
        strokeWidth={0.5}
      />
      <Rect x={CX - 6} y={by + 2} width={5} height={4} fill={pal.detail} />
      <Rect x={CX + 2} y={by + 4} width={5} height={4} fill={darken(pal.detail, 0.15)} />
    </G>
  );
}

function TavernArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={32} h={16} rise={rise} pal={pal} stroke={pal.trim} />
      <Rect x={CX - 10} y={by - rise + 4} width={20} height={8} fill={darken(pal.left, 0.12)} stroke={pal.trim} strokeWidth={0.5} />
      <Circle cx={CX + 12} cy={by - rise + 2} r={4} fill={pal.trim} />
      <Rect x={CX + 10} y={by - rise - 4} width={5} height={6} fill={pal.detail} />
    </G>
  );
}

function HouseArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={28} h={14} rise={rise} pal={pal} stroke={pal.trim} />
      <Path d={`M ${CX - 8} ${by - rise + 2} L ${CX} ${by - rise - 4} L ${CX + 8} ${by - rise + 2} Z`} fill={pal.trim} />
      <Rect x={CX - 3} y={by - rise + 6} width={6} height={8} fill={darken(pal.left, 0.1)} opacity={0.6} />
    </G>
  );
}

function BarracksArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={34} h={17} rise={rise} pal={pal} stroke={pal.trim} />
      <Path d={`M ${CX - 12} ${by - rise + 4} L ${CX + 12} ${by - rise + 4} L ${CX + 10} ${by - rise + 12} L ${CX - 10} ${by - rise + 12} Z`} fill={darken(pal.right, 0.1)} stroke={pal.trim} strokeWidth={0.5} />
      {[ -6, 0, 6 ].map((dx) => (
        <Line key={dx} x1={CX + dx} y1={by - rise + 6} x2={CX + dx} y2={by - rise + 14} stroke={pal.detail} strokeWidth={1.5} />
      ))}
    </G>
  );
}

function ArcheryArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={36} h={18} rise={rise * 0.7} pal={pal} stroke={pal.trim} />
      <Circle cx={CX - 10} cy={by - 8} r={6} fill="none" stroke={pal.trim} strokeWidth={1.2} />
      <Circle cx={CX - 10} cy={by - 8} r={3} fill="none" stroke={pal.detail} strokeWidth={0.8} />
      <Line x1={CX + 4} y1={by - 4} x2={CX + 16} y2={by - 10} stroke={pal.detail} strokeWidth={1.2} />
    </G>
  );
}

function StablesArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  return (
    <G>
      <IsoBoxLayer cx={CX} by={by} w={36} h={18} rise={rise} pal={pal} stroke={pal.trim} />
      <Path d={`M ${CX - 14} ${by - rise + 6} L ${CX + 14} ${by - rise + 6} L ${CX + 12} ${by - 4} L ${CX - 12} ${by - 4} Z`} fill={darken(pal.top, 0.08)} />
      <Ellipse cx={CX + 8} cy={by + 2} rx={5} ry={3} fill={pal.detail} opacity={0.5} />
      <Circle cx={CX + 12} cy={by} r={2} fill={pal.trim} />
    </G>
  );
}

function TowerArt({ pal, rise }: { pal: IsoPalette; rise: number }) {
  const by = BASE_Y;
  const w = 22;
  const h = 11;
  const hw = w / 2;
  const hh = h / 2;
  return (
    <G>
      <Ellipse cx={CX} cy={by + hh + 2} rx={14} ry={5} fill="#000" opacity={0.14} />
      <Path d={`M ${CX - hw} ${by} L ${CX} ${by + hh} L ${CX} ${by + hh - rise} L ${CX - hw} ${by - rise} Z`} fill={pal.left} />
      <Path d={`M ${CX + hw} ${by} L ${CX} ${by + hh} L ${CX} ${by + hh - rise} L ${CX + hw} ${by - rise} Z`} fill={pal.right} />
      <Path d={`M ${CX} ${by - hh - rise} L ${CX + hw} ${by - rise} L ${CX} ${by + hh - rise} L ${CX - hw} ${by - rise} Z`} fill={pal.top} stroke={pal.trim} strokeWidth={0.6} />
      {[ -6, -2, 2, 6 ].map((dx) => (
        <Rect key={dx} x={CX + dx - 1} y={by - rise - 4} width={2} height={3} fill={pal.trim} />
      ))}
      <Path d={`M ${CX - hw - 2} ${by - rise + 2} L ${CX + hw + 2} ${by - rise + 2} L ${CX + hw} ${by - rise - 2} L ${CX - hw} ${by - rise - 2} Z`} fill={pal.detail} />
    </G>
  );
}

const RISE_BY_TYPE: Partial<Record<SlotType, number>> = {
  townHall: 20,
  farm: 2,
  lumberMill: 14,
  quarry: 6,
  mine: 12,
  market: 12,
  tavern: 11,
  house: 10,
  barracks: 14,
  archeryRange: 8,
  stables: 13,
  tower: 26,
};

export default function IsoBuildingArt({ slotType, level, accent, isDark }: ArtProps) {
  const scale = 1 + Math.min(level - 1, 9) * 0.035;
  const rise = (RISE_BY_TYPE[slotType] ?? 12) * scale;
  const pal = paletteFromAccent(accent, isDark);

  const art = (() => {
    switch (slotType) {
      case "townHall":
        return <TownHallArt pal={pal} rise={rise} />;
      case "farm":
        return <FarmArt pal={pal} />;
      case "lumberMill":
        return <LumberMillArt pal={pal} rise={rise} />;
      case "quarry":
        return <QuarryArt pal={pal} />;
      case "mine":
        return <MineArt pal={pal} rise={rise} />;
      case "market":
        return <MarketArt pal={pal} rise={rise} />;
      case "tavern":
        return <TavernArt pal={pal} rise={rise} />;
      case "house":
        return <HouseArt pal={pal} rise={rise} />;
      case "barracks":
        return <BarracksArt pal={pal} rise={rise} />;
      case "archeryRange":
        return <ArcheryArt pal={pal} rise={rise} />;
      case "stables":
        return <StablesArt pal={pal} rise={rise} />;
      case "tower":
        return <TowerArt pal={pal} rise={rise} />;
      default:
        return <IsoBoxLayer cx={CX} by={BASE_Y} w={30} h={15} rise={rise} pal={pal} />;
    }
  })();

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {art}
    </Svg>
  );
}
