import React from 'react';
import { Box, Typography, Grid, Slider } from '@mui/material';

interface ProfitControlsProps {
    topBottomPairs: number;
    setTopBottomPairs: (value: number) => void;
    colors: any;
}

export const ProfitControls: React.FC<ProfitControlsProps> = ({
    topBottomPairs,
    setTopBottomPairs,
    colors
}) => {
    return (
        <Box sx={{ mb: 2, p: 1.5, border: `1px solid ${colors.grid}`, borderRadius: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
                Top & Bottom Pairs (N): {topBottomPairs}
            </Typography>
            <Grid container spacing={1.5} alignItems="center">
                <Grid item xs>
                    <Slider
                        value={topBottomPairs}
                        onChange={(_, val) => setTopBottomPairs(val as number)}
                        min={1}
                        max={12} // Up to 12 hours (24 slots) or logical max
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                    />
                </Grid>
                <Grid item>
                    <Typography variant="body2">{topBottomPairs} Pairs ({topBottomPairs * 0.5} h)</Typography>
                </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Calculate profit by buying at the lowest {topBottomPairs} slots and selling at the highest {topBottomPairs} slots each day.
            </Typography>
        </Box>
    );
};
