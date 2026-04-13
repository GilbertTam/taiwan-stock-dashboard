import React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('forecast');

    return (
        <Box sx={{ mb: 2, p: 1.5, border: `1px solid ${colors.grid}`, borderRadius: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
                {t('profitAnalysis.pairsLabel', { count: topBottomPairs })}
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
                    <Typography variant="body2">{t('profitAnalysis.pairsValue', { count: topBottomPairs, hours: topBottomPairs * 0.5 })}</Typography>
                </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {t('profitAnalysis.pairsDescription', { count: topBottomPairs })}
            </Typography>
        </Box>
    );
};
