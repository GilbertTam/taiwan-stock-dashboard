import React from 'react';
import { Box, TextField, Typography, Paper, Grid, Tooltip, IconButton, Divider } from '@mui/material';
import { BatteryConfig } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface RevenueParameterPanelProps {
    config: BatteryConfig;
    onChange: (newConfig: BatteryConfig) => void;
}

export const RevenueParameterPanel: React.FC<RevenueParameterPanelProps> = ({ config, onChange }) => {
    const { darkMode } = useTheme();

    const handleChange = (key: keyof BatteryConfig, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            onChange({ ...config, [key]: numValue });
        }
    };

    const renderField = (key: keyof BatteryConfig, label: string, unit: string, step = 0.1, helpRequest?: string) => (
        <Grid item xs={12} sm={6} md={6} key={key}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{label}</Typography>
                {helpRequest && (
                    <Tooltip title={helpRequest} arrow placement="top">
                        <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                )}
            </Box>
            <TextField
                type="number"
                value={config[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                InputProps={{
                    endAdornment: <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>{unit}</Typography>,
                }}
                inputProps={{ step }}
                fullWidth
                size="small"
                variant="outlined"
                sx={{
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        height: 36
                    },
                    '& .MuiInputBase-input': {
                        fontSize: '0.9rem',
                        padding: '8px 10px'
                    }
                }}
            />
        </Grid>
    );

    const renderSection = (title: string, children: React.ReactNode) => (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                {title}
            </Typography>
            <Grid container spacing={2}>
                {children}
            </Grid>
        </Box>
    );

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
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                System Configuration
            </Typography>

            {renderSection('Capacity & Power', (
                <>
                    {renderField('E_cap', 'Capacity', 'MWh', 1, 'Total energy capacity of the battery')}
                    {renderField('P_max_dis', 'Max Discharge', 'MW', 1, 'Maximum discharge power')}
                    {renderField('P_max_ch', 'Max Charge', 'MW', 1, 'Maximum charge power')}
                    {renderField('Min_bid', 'Min Bid', 'MW', 0.1, 'Minimum bid quantity')}
                </>
            ))}

            <Divider sx={{ my: 1, opacity: 0.5 }} />

            {renderSection('Efficiency & Losses', (
                <>
                    {renderField('eff_ch', 'Charge Eff.', '%', 0.001, 'Charging efficiency (0-1 or %) check unit')}
                    {renderField('eff_dis', 'Discharge Eff.', '%', 0.001, 'Discharging efficiency')}
                    {renderField('E_loss', 'Self Loss', 'MWh', 0.01, 'Self-discharge loss per period?')}
                </>
            ))}

            <Divider sx={{ my: 1, opacity: 0.5 }} />

            {renderSection('SoC Constraints', (
                <>
                    {renderField('SoC_min_pct', 'SoC Min', '%', 0.01)}
                    {renderField('SoC_max_pct', 'SoC Max', '%', 0.01)}
                    {renderField('SoC_init_pct', 'Initial SoC', '%', 0.01)}
                    {renderField('SoC_end_pct', 'Final SoC', '%', 0.01)}
                </>
            ))}

            <Divider sx={{ my: 1, opacity: 0.5 }} />

            {renderSection('Economic', (
                <>
                    {renderField('beta_bal', 'Balance Coeff', '', 0.01)}
                    {renderField('Cycle_limit', 'Cycle Limit', 'times')}
                </>
            ))}
        </Paper>
    );
};
