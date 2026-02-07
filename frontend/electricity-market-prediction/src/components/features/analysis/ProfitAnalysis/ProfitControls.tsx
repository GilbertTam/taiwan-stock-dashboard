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
        <Box sx={{ mb: 3, p: 2, border: `1px solid ${colors.grid}`, borderRadius: 2 }}>
            <Typography gutterBottom>
                Top & Bottom Pairs (N): {topBottomPairs}
            </Typography>
            <Grid container spacing={2} alignItems="center">
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
                    <Typography>{topBottomPairs} Pairs ({topBottomPairs * 0.5} Hours)</Typography>
                </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary">
                Calculate profit by buying at the lowest {topBottomPairs} slots and selling at the highest {topBottomPairs} slots each day.
            </Typography>
        </Box>
    );
};
