import React from 'react';
import { Box, Typography, Switch, FormControlLabel, Paper, Divider } from '@mui/material';
import { ViewOptions } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';

interface ViewOptionsPanelProps {
    options: ViewOptions;
    onChange: (options: ViewOptions) => void;
}

export const ViewOptionsPanel: React.FC<ViewOptionsPanelProps> = ({ options, onChange }) => {
    const { darkMode } = useTheme();

    const handleChange = (key: keyof ViewOptions) => (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...options, [key]: event.target.checked });
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(245, 245, 245, 0.5)',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderRadius: 2
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                View Options
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <FormControlLabel
                    control={<Switch size="small" checked={options.showOperation} onChange={handleChange('showOperation')} />}
                    label={<Typography variant="body2">Show Operation Schedule</Typography>}
                />
                <FormControlLabel
                    control={<Switch size="small" checked={options.showSoC} onChange={handleChange('showSoC')} />}
                    label={<Typography variant="body2">Show SoC Chart</Typography>}
                />
                <FormControlLabel
                    control={<Switch size="small" checked={options.showGrid} onChange={handleChange('showGrid')} />}
                    label={<Typography variant="body2">Show Grid Lines</Typography>}
                />
                <FormControlLabel
                    control={<Switch size="small" checked={options.showTooltips} onChange={handleChange('showTooltips')} />}
                    label={<Typography variant="body2">Show Tooltips</Typography>}
                />
            </Box>
        </Paper>
    );
};
