'use client';

import { useMemo } from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { CircuitBoardBackground } from './CircuitBoardBackground';

/**
 * Ticker data: area name, price, change %.
 * Order matches "current flow" path (北海道 -> 東北 -> ... -> 九州).
 */
const TICKER_DATA = [
  { area: '北海道', price: 12.45, change: 2.3 },
  { area: '東北', price: 11.82, change: -1.5 },
  { area: '東京', price: 14.23, change: 3.8 },
  { area: '中部', price: 13.67, change: 1.2 },
  { area: '北陸', price: 10.98, change: -0.8 },
  { area: '関西', price: 13.12, change: 2.1 },
  { area: '中国', price: 12.34, change: -2.4 },
  { area: '四国', price: 11.56, change: 0.5 },
  { area: '九州', price: 12.89, change: 1.9 },
];

type Position = { left: number; top: number };
/**
 * Positions (left %, top %) - kept away from center where login form sits (~30–70% x, ~28–72% y).
 * Right column / left column / bottom to suggest Japan map without overlapping form.
 */
const REGION_POSITIONS: Position[] = [
  { left: 84, top: 6 },   // 北海道
  { left: 86, top: 18 },  // 東北
  { left: 86, top: 30 },  // 東京
  { left: 18, top: 36 },  // 中部
  { left: 16, top: 22 },  // 北陸
  { left: 18, top: 50 },  // 関西
  { left: 10, top: 48 },  // 中国
  { left: 20, top: 72 },  // 四国
  { left: 82, top: 86 },  // 九州
];

/** 窄視窗（lg）用：中國・関西を離して重なりを防ぐ */
const REGION_POSITIONS_NARROW: Position[] = [
  ...REGION_POSITIONS.slice(0, 5),
  { left: 22, top: 47 },  // 関西：右・上にずらす
  { left: 6, top: 52 },   // 中国：左・下にずらす
  ...REGION_POSITIONS.slice(7),
];

/** Form 中心（登入表單位置），電流起點 — 交易員透過系統感受交易 */
const FORM_CENTER = { left: 50, top: 50 };

/** 各區塊與 Form 的距離，用於電流擴散與脈衝 delay（近者先） */
function getDistanceFromForm(i: number, positions: Position[]): number {
  const p = positions[i];
  return Math.hypot(p.left - FORM_CENTER.left, p.top - FORM_CENTER.top);
}
const HUB_FLOW_DURATION = 2.5;
const HUB_FLOW_MAX_DELAY = 1.8;
/** 依距離正規化：0 = 最近，1 = 最遠；用於 animation-delay（秒） */
function hubFlowDelaySec(i: number, positions: Position[]): number {
  const dist = positions.map((_, j) => getDistanceFromForm(j, positions));
  const minD = Math.min(...dist);
  const maxD = Math.max(...dist);
  if (maxD <= minD) return 0;
  return ((dist[i] - minD) / (maxD - minD)) * HUB_FLOW_MAX_DELAY;
}
/** 區塊脈衝 delay（秒）：距離近的先脈衝 */
function regionPulseDelaySec(i: number, positions: Position[]): number {
  const dist = positions.map((_, j) => getDistanceFromForm(j, positions));
  const minD = Math.min(...dist);
  const maxD = Math.max(...dist);
  if (maxD <= minD) return i * 0.3;
  return ((dist[i] - minD) / (maxD - minD)) * 2.2;
}

/**
 * 地域間連系線（OCCTO／JEPX 九大地域）— 有管線互通的區塊對。
 * Index pairs into TICKER_DATA: 0=北海道, 1=東北, 2=東京, 3=中部, 4=北陸, 5=関西, 6=中国, 7=四国, 8=九州.
 */
const INTERCONNECTION_PAIRS: [number, number][] = [
  [0, 1], // 北海道－東北（北海道本州間連系）
  [1, 2], // 東北－東京
  [2, 3], // 東京－中部
  [3, 4], // 中部－北陸
  [3, 5], // 中部－関西
  [4, 5], // 北陸－関西
  [5, 6], // 関西－中国
  [5, 7], // 関西－四国（本四）
  [6, 7], // 中国－四国
  [6, 8], // 中国－九州
];

/** 區塊在 0–100 座標下的半寬／半高（與 RegionBlock 約 108px 寬對齊，路徑端點對齊埠） */
const BLOCK_HALF_W = 5;
const BLOCK_HALF_H = 6;

type Side = 'top' | 'right' | 'bottom' | 'left';

/** 指定區塊、指定側邊的埠中心座標（與 RegionBlock 的 port 視覺對齊） */
function getPortPosition(i: number, side: Side, positions: Position[]): { x: number; y: number } {
  const { left, top } = positions[i];
  switch (side) {
    case 'left': return { x: left - BLOCK_HALF_W, y: top };
    case 'right': return { x: left + BLOCK_HALF_W, y: top };
    case 'top': return { x: left, y: top - BLOCK_HALF_H };
    case 'bottom': return { x: left, y: top + BLOCK_HALF_H };
  }
}

/** Hub 到區塊 i 的連線應止於該區塊邊緣（Form 方向的交點），與 input 埠同側 */
function getHubLineEndPoint(i: number, positions: Position[]): { x: number; y: number } {
  const ox = FORM_CENTER.left;
  const oy = FORM_CENTER.top;
  const { left: cx, top: cy } = positions[i];
  const dx = cx - ox;
  const dy = cy - oy;
  const hw = BLOCK_HALF_W;
  const hh = BLOCK_HALF_H;
  const left = cx - hw;
  const right = cx + hw;
  const top = cy - hh;
  const bottom = cy + hh;
  let bestT = Infinity;
  if (dx !== 0) {
    const tL = (left - ox) / dx;
    if (tL > 0 && tL < bestT) {
      const y = oy + tL * dy;
      if (y >= top && y <= bottom) bestT = tL;
    }
    const tR = (right - ox) / dx;
    if (tR > 0 && tR < bestT) {
      const y = oy + tR * dy;
      if (y >= top && y <= bottom) bestT = tR;
    }
  }
  if (dy !== 0) {
    const tT = (top - oy) / dy;
    if (tT > 0 && tT < bestT) {
      const x = ox + tT * dx;
      if (x >= left && x <= right) bestT = tT;
    }
    const tB = (bottom - oy) / dy;
    if (tB > 0 && tB < bestT) {
      const x = ox + tB * dx;
      if (x >= left && x <= right) bestT = tB;
    }
  }
  if (bestT === Infinity) return { x: cx, y: cy };
  return { x: ox + bestT * dx, y: oy + bestT * dy };
}

/** L-shaped path from (x1,y1) to (x2,y2) with one right-angle bend (主機板風格). */
function getLPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  if (dx >= dy) {
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
}

/** Derive input/output port side from INTERCONNECTION_PAIRS: side that faces the connected region. */
function getPortSidesForRegion(i: number, positions: Position[]): { inputSide: Side; outputSide: Side } {
  const pos = (j: number) => positions[j];
  let inputSide: Side = 'top';
  let outputSide: Side = 'bottom';
  const sideToward = (pI: Position, pJ: Position): Side => {
    const dx = pJ.left - pI.left, dy = pJ.top - pI.top;
    return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top');
  };
  for (const [a, b] of INTERCONNECTION_PAIRS) {
    if (a === i && b !== i) outputSide = sideToward(pos(i), pos(b));
    if (b === i && a !== i) inputSide = sideToward(pos(i), pos(a));
  }
  return { inputSide, outputSide };
}

const CYCLE_DURATION = 5;

interface RegionBlockProps {
  area: string;
  price: number;
  change: number;
  left: number;
  top: number;
  pulseDelaySec: number;
  inputSide: 'top' | 'right' | 'bottom' | 'left';
  outputSide: 'top' | 'right' | 'bottom' | 'left';
}

const portBase = {
  position: 'absolute' as const,
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: '2px solid var(--card-border)',
  backgroundColor: 'rgba(0,0,0,0.6)',
  boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)',
};
const portPos = (side: 'top' | 'right' | 'bottom' | 'left') => {
  const c = '50%';
  switch (side) {
    case 'top': return { left: c, top: 0, transform: 'translate(-50%, -50%)' };
    case 'right': return { right: 0, top: c, transform: 'translate(50%, -50%)' };
    case 'bottom': return { left: c, bottom: 0, transform: 'translate(-50%, 50%)' };
    case 'left': return { left: 0, top: c, transform: 'translate(-50%, -50%)' };
  }
};

/** Arrow direction for port: into block (input) or out of block (output). */
const sideToArrow = (side: Side, intoBlock: boolean): 'up' | 'down' | 'left' | 'right' => {
  if (intoBlock) {
    return side === 'top' ? 'down' : side === 'bottom' ? 'up' : side === 'left' ? 'right' : 'left';
  }
  return side === 'top' ? 'up' : side === 'bottom' ? 'down' : side === 'left' ? 'left' : 'right';
};

function PortArrow({ dir, color }: { dir: 'up' | 'down' | 'left' | 'right'; color: string }) {
  const size = 3;
  const base = { width: 0, height: 0, position: 'absolute' as const, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' };
  switch (dir) {
    case 'down': return <Box sx={{ ...base, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color, borderLeftWidth: size, borderRightWidth: size, borderTopWidth: size, borderBottomWidth: 0 }} />;
    case 'up': return <Box sx={{ ...base, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, borderLeftWidth: size, borderRightWidth: size, borderBottomWidth: size, borderTopWidth: 0 }} />;
    case 'right': return <Box sx={{ ...base, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color, borderTopWidth: size, borderBottomWidth: size, borderLeftWidth: size, borderRightWidth: 0 }} />;
    case 'left': return <Box sx={{ ...base, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color, borderTopWidth: size, borderBottomWidth: size, borderRightWidth: size, borderLeftWidth: 0 }} />;
  }
}

function RegionBlock({ area, price, change, left, top, pulseDelaySec, inputSide, outputSide }: RegionBlockProps) {
  const isUp = change >= 0;
  return (
    <Box
      className="region-block"
      sx={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
        minWidth: { lg: 96, xl: 108 },
        px: { lg: 1.25, xl: 1.5 },
        py: 1.25,
        pt: { lg: 1.25, xl: 1.5 },
        pb: { lg: 1.25, xl: 1.5 },
        borderRadius: 1.5,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--card-border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
        overflow: 'visible',
        animation: `regionPulse ${CYCLE_DURATION}s ease-in-out infinite`,
        animationDelay: `${pulseDelaySec}s`,
        '@keyframes regionPulse': {
          '0%, 100%': {
            transform: 'translate(-50%, -50%) translateY(0) scale(1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            borderColor: 'var(--card-border)',
            backgroundColor: 'rgba(0,0,0,0.55)',
          },
          '6%': {
            transform: 'translate(-50%, -50%) translateY(-18px) scale(1.12)',
            boxShadow: '0 0 0 2px var(--primary), 0 0 24px var(--primary), 0 12px 32px rgba(0,0,0,0.4)',
            borderColor: 'var(--primary)',
            backgroundColor: 'rgba(0,0,0,0.6)',
          },
          '18%': {
            transform: 'translate(-50%, -50%) translateY(-18px) scale(1.12)',
            boxShadow: '0 0 0 2px var(--primary), 0 0 24px var(--primary), 0 12px 32px rgba(0,0,0,0.4)',
            borderColor: 'var(--primary)',
            backgroundColor: 'rgba(0,0,0,0.6)',
          },
          '28%': {
            transform: 'translate(-50%, -50%) translateY(0) scale(1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            borderColor: 'var(--card-border)',
            backgroundColor: 'rgba(0,0,0,0.55)',
          },
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    >
      {/* Input port (受電): circle + arrow pointing into block */}
      <Box
        sx={{
          ...portBase,
          ...portPos(inputSide),
          borderColor: 'var(--secondary)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3), 0 0 6px var(--secondary)',
        }}
      >
        <PortArrow dir={sideToArrow(inputSide, true)} color="var(--secondary)" />
      </Box>
      {/* Output port (送電): circle + arrow pointing out of block */}
      <Box
        sx={{
          ...portBase,
          ...portPos(outputSide),
          borderColor: 'var(--primary)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3), 0 0 6px var(--primary)',
        }}
      >
        <PortArrow dir={sideToArrow(outputSide, false)} color="var(--primary)" />
      </Box>
      {/* Shine sweep when "current" hits */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--primary) 25%, transparent) 40%, color-mix(in srgb, var(--primary) 45%, transparent) 50%, color-mix(in srgb, var(--primary) 25%, transparent) 60%, transparent 100%)',
          backgroundSize: '200% 100%',
          opacity: 0,
          animation: `regionShine ${CYCLE_DURATION}s ease-in-out infinite`,
          animationDelay: `${pulseDelaySec}s`,
          pointerEvents: 'none',
          borderRadius: 'inherit',
          '@keyframes regionShine': {
            '0%, 5%': { opacity: 0, backgroundPosition: '200% 0' },
            '10%': { opacity: 0.9, backgroundPosition: '200% 0' },
            '18%': { opacity: 0.9, backgroundPosition: '-100% 0' },
            '24%': { opacity: 0, backgroundPosition: '-100% 0' },
            '100%': { opacity: 0 },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0 },
        }}
      />
      <Typography sx={{ fontSize: { lg: 10, xl: 11 }, color: 'var(--text-secondary)', fontWeight: 600, position: 'relative', zIndex: 1 }}>
        {area}
      </Typography>
      <Typography sx={{ fontSize: { lg: 12, xl: 14 }, color: 'var(--foreground)', fontWeight: 700, fontFamily: 'monospace', position: 'relative', zIndex: 1 }}>
        ¥{price.toFixed(2)}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: isUp ? 'var(--success)' : 'var(--error)', position: 'relative', zIndex: 1 }}>
        {isUp ? <TrendingUpIcon sx={{ fontSize: { lg: 12, xl: 14 } }} /> : <TrendingDownIcon sx={{ fontSize: { lg: 12, xl: 14 } }} />}
        <Typography sx={{ fontSize: { lg: 10, xl: 11 }, fontWeight: 700, fontFamily: 'monospace' }}>
          {isUp ? '+' : ''}{change.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
}

/** 小視窗用：單一地域精簡卡（strip 或 grid 內使用），依斷點自適應尺寸 */
function RegionChip({
  area,
  price,
  change,
  variant,
}: {
  area: string;
  price: number;
  change: number;
  variant: 'strip' | 'grid';
}) {
  const isUp = change >= 0;
  return (
    <Box
      sx={{
        ...(variant === 'strip' && { flexShrink: 0, minWidth: 80 }),
        ...(variant === 'grid' && { width: '100%', minWidth: 0 }),
        px: { xs: 1, sm: 1.25 },
        py: 1,
        borderRadius: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.25,
      }}
    >
      <Typography sx={{ fontSize: { xs: 9, sm: 10 }, color: 'var(--text-secondary)', fontWeight: 600 }}>{area}</Typography>
      <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: 'var(--foreground)', fontWeight: 700, fontFamily: 'monospace' }}>
        ¥{price.toFixed(2)}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: isUp ? 'var(--success)' : 'var(--error)' }}>
        {isUp ? <TrendingUpIcon sx={{ fontSize: { xs: 10, sm: 12 } }} /> : <TrendingDownIcon sx={{ fontSize: { xs: 10, sm: 12 } }} />}
        <Typography sx={{ fontSize: { xs: 9, sm: 10 }, fontWeight: 600, fontFamily: 'monospace' }}>
          {isUp ? '+' : ''}{change.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Circuit board background with Japan-map-style region blocks.
 * Responsive: xs = strip, sm/md = grid, lg/xl = full map.
 */
export function CircuitBoardWithRegions() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const isStrip = useMediaQuery(theme.breakpoints.down('sm')); // xs: 橫向 strip
  const isGrid = isCompact && !isStrip; // sm, md: 網格
  const isNarrowDesktop = useMediaQuery(theme.breakpoints.down('xl'));
  const fullLayoutPositions = isNarrowDesktop ? REGION_POSITIONS_NARROW : REGION_POSITIONS;
  const fullLayoutPorts = useMemo(
    () => fullLayoutPositions.map((_, i) => getPortSidesForRegion(i, fullLayoutPositions)),
    [isNarrowDesktop]
  );

  if (isStrip) {
    return (
      <Box
        sx={{
          width: '100%',
          flexShrink: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          py: { xs: 1.5, sm: 2 },
          px: 1,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'var(--card-border)', borderRadius: 3 },
        }}
      >
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, justifyContent: 'flex-start', minWidth: 'min-content', px: 1 }}>
          {TICKER_DATA.map((item) => (
            <RegionChip key={item.area} {...item} variant="strip" />
          ))}
        </Box>
      </Box>
    );
  }

  if (isGrid) {
    return (
      <Box
        sx={{
          width: '100%',
          flexShrink: 0,
          py: 2,
          px: 2,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 1.5,
            maxWidth: 520,
            mx: 'auto',
          }}
        >
          {TICKER_DATA.map((item) => (
            <RegionChip key={item.area} {...item} variant="grid" />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <CircuitBoardBackground />
      {/* Hub→各地域：電流從 Form 流向各區塊（交易員透過系統感受交易） */}
      <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <style>{`
            @keyframes hubFlow {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -100; }
            }
            .hub-path-bg { stroke: var(--card-border); stroke-width: 0.18; fill: none; stroke-opacity: 0.5; }
            .hub-path-flow { fill: none; stroke-width: 0.25; stroke-linecap: round; stroke-linejoin: round;
              stroke: var(--primary); stroke-dasharray: 6 100; animation: hubFlow 2s linear infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              .hub-path-flow { animation: none; stroke-dasharray: none; stroke: var(--card-border); stroke-opacity: 0.5; }
            }
          `}</style>
        </defs>
        {/* Hub 節點（Form 中心） */}
        <circle cx={FORM_CENTER.left} cy={FORM_CENTER.top} r={1.2} fill="var(--primary)" opacity={0.4} />
        <circle cx={FORM_CENTER.left} cy={FORM_CENTER.top} r={0.6} fill="var(--primary)" opacity={0.7} />
        {fullLayoutPositions.map((_, i) => {
          const end = getHubLineEndPoint(i, fullLayoutPositions);
          const d = getLPath(FORM_CENTER.left, FORM_CENTER.top, end.x, end.y);
          return (
            <g key={`hub-${i}`}>
              <path className="hub-path-bg" d={d} pathLength={100} />
              <path
                className="hub-path-flow"
                d={d}
                pathLength={100}
                style={{ animationDelay: `${hubFlowDelaySec(i, fullLayoutPositions)}s` }}
              />
            </g>
          );
        })}
      </Box>
      {/* 地域間連系線：區塊中心間連線（OCCTO／JEPX 九大地域） */}
      <Box
        component="svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {INTERCONNECTION_PAIRS.map(([a, b], k) => {
          const from = getPortPosition(a, fullLayoutPorts[a].outputSide, fullLayoutPositions);
          const to = getPortPosition(b, fullLayoutPorts[b].inputSide, fullLayoutPositions);
          return (
            <path
              key={k}
              d={getLPath(from.x, from.y, to.x, to.y)}
              stroke="var(--card-border)"
              strokeWidth={0.2}
              strokeOpacity={0.65}
              strokeDasharray="1.2 1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          );
        })}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {TICKER_DATA.map((item, i) => (
          <RegionBlock
            key={item.area}
            {...item}
            left={fullLayoutPositions[i].left}
            top={fullLayoutPositions[i].top}
            pulseDelaySec={regionPulseDelaySec(i, fullLayoutPositions)}
            inputSide={fullLayoutPorts[i].inputSide}
            outputSide={fullLayoutPorts[i].outputSide}
          />
        ))}
      </Box>
    </Box>
  );
}
