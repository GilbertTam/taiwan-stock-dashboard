'use client';

import React from 'react';
import { Typography, Box, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import { Card } from '@/shared/components/ui/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number; // percentage change
    label?: string;
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary',
  onClick
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp sx={{ fontSize: 16 }} />;
    if (trend.value < 0) return <TrendingDown sx={{ fontSize: 16 }} />;
    return <Remove sx={{ fontSize: 16 }} />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text.secondary';
    if (trend.value > 0) return 'success.main';
    if (trend.value < 0) return 'error.main';
    return 'text.secondary';
  };

  return (
    <Card
      interactive={!!onClick}
      sx={{
        p: 3,
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" fontWeight="medium">
          {title}
        </Typography>
        {icon && (
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        )}
      </Box>

      <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
        {value}
      </Typography>

      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {subtitle}
        </Typography>
      )}

      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          {getTrendIcon()}
          <Typography
            variant="caption"
            sx={{
              color: getTrendColor(),
              fontWeight: 'medium'
            }}
          >
            {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
            {trend.label && ` ${trend.label}`}
          </Typography>
        </Box>
      )}
    </Card>
  );
};
