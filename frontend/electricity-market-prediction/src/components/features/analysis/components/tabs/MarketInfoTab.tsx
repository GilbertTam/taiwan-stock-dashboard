'use client';

import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import { MarketInfoContent, MarketInfoContentProps } from './MarketInfoContent';

export const MarketInfoTab: React.FC<MarketInfoContentProps> = (props) => {
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Paper>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'var(--card-bg)',
          }}
        >
          <PlaceIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="subtitle2" color="text.secondary">
            目前地區：
          </Typography>
          <Chip
            label={props.selectedArea || '未選擇地區'}
            size="small"
            color={props.selectedArea ? 'primary' : 'default'}
            variant={props.selectedArea ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, textTransform: 'uppercase' }}
          />
        </Box>
        <MarketInfoContent {...props} />
      </Paper>
    </Box>
  );
};
