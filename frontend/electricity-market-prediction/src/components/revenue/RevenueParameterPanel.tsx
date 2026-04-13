import React from 'react';
import { Box, TextField, Typography, Paper, Grid, Tooltip, Divider } from '@mui/material';
import { BatteryConfig } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';

interface RevenueParameterPanelProps {
    config: BatteryConfig;
    onChange: (newConfig: BatteryConfig) => void;
}

export const RevenueParameterPanel: React.FC<RevenueParameterPanelProps> = ({ config, onChange }) => {
    const { darkMode } = useTheme();
    const { t } = useTranslation('siteRevenue');

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {t('paramPanel.systemParams')}
                </Typography>
                <Tooltip title={t('paramPanel.systemParamsHint')} arrow placement="top">
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
            </Box>

            {renderSection(t('paramPanel.capacityPower'), (
                <>
                    {renderField('E_cap', t('paramPanel.fields.capacity'), t('paramPanel.units.mwh'), 1, t('paramPanel.eCap'))}
                    {renderField('P_max_dis', t('paramPanel.fields.maxDischarge'), t('paramPanel.units.mw'), 1, t('paramPanel.pMaxDis'))}
                    {renderField('P_max_ch', t('paramPanel.fields.maxCharge'), t('paramPanel.units.mw'), 1, t('paramPanel.pMaxCh'))}
                    {renderField('Min_bid', t('paramPanel.fields.minBid'), t('paramPanel.units.mw'), 0.1, t('paramPanel.minBid'))}
                </>
            ))}

            <Divider sx={{ my: 1, opacity: 0.5 }} />

            {renderSection(t('paramPanel.efficiencyLoss'), (
                <>
                    {renderField('eff_ch', t('paramPanel.fields.chargeEff'), t('paramPanel.units.percent'), 0.001, t('paramPanel.effCh'))}
                    {renderField('eff_dis', t('paramPanel.fields.dischargeEff'), t('paramPanel.units.percent'), 0.001, t('paramPanel.effDis'))}
                    {renderField('E_loss', t('paramPanel.fields.selfLoss'), t('paramPanel.units.mwh'), 0.01, t('paramPanel.eLoss'))}
                </>
            ))}

            <Divider sx={{ my: 1, opacity: 0.5 }} />

            {renderSection(t('paramPanel.socLimits'), (
                <>
                    {renderField('SoC_min_pct', t('paramPanel.fields.socMin'), t('paramPanel.units.percent'), 0.01)}
                    {renderField('SoC_max_pct', t('paramPanel.fields.socMax'), t('paramPanel.units.percent'), 0.01)}
                    {renderField('SoC_init_pct', t('paramPanel.fields.initialSoc'), t('paramPanel.units.percent'), 0.01)}
                    {renderField('SoC_end_pct', t('paramPanel.fields.finalSoc'), t('paramPanel.units.percent'), 0.01)}
                </>
            ))}

            <Divider sx={{ my: 1, opacity: 0.5 }} />

            {renderSection(t('paramPanel.economicParams'), (
                <>
                    {renderField('beta_bal', t('paramPanel.fields.balanceCoeff'), '', 0.01)}
                    {renderField('Cycle_limit', t('paramPanel.fields.cycleLimit'), t('paramPanel.units.times'), 0.1, t('paramPanel.cycleLimit'))}
                </>
            ))}
        </Paper>
    );
};
