'use client';

import { Box, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

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

interface TickerItemProps {
  area: string;
  price: number;
  change: number;
}

function TickerItem({ area, price, change }: TickerItemProps) {
  const isUp = change >= 0;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 0.5,
        mx: 1,
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        whiteSpace: 'nowrap',
      }}
    >
      <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{area}</Typography>
      <Typography sx={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 700, fontFamily: 'monospace' }}>
        ¥{price.toFixed(2)}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', color: isUp ? 'var(--success)' : 'var(--error)' }}>
        {isUp ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
        <Typography sx={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}>
          {isUp ? '+' : ''}
          {change.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
}

interface TickerMarqueeProps {
  direction?: 'left' | 'right';
  speed?: number;
}

export function TickerMarquee({ direction = 'left', speed = 30 }: TickerMarqueeProps) {
  const items = [...TICKER_DATA, ...TICKER_DATA, ...TICKER_DATA];
  return (
    <Box sx={{ display: 'flex', overflow: 'hidden', py: 1 }}>
      <Box
        sx={{
          display: 'flex',
          animation: `ticker-${direction} ${speed}s linear infinite`,
          [`@keyframes ticker-${direction}`]: {
            '0%': { transform: direction === 'left' ? 'translateX(0)' : 'translateX(-33.33%)' },
            '100%': { transform: direction === 'left' ? 'translateX(-33.33%)' : 'translateX(0)' },
          },
        }}
      >
        {items.map((item, i) => (
          <TickerItem key={`${item.area}-${i}`} {...item} />
        ))}
      </Box>
    </Box>
  );
}
