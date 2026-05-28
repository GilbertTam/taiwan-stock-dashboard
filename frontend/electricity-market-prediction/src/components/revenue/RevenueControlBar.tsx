'use client';

import React from 'react';
import { Box, Paper, Tooltip, Divider, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { AreaButtonGroup } from '@/components/selectors/AreaButtonGroup';
import { ModelChipsManager } from '@/components/selectors/ModelChipsManager';
import { useMarketDataContext } from '@/context/MarketDataContext';
import type { ChartDataPoint } from '@/utils/chartUtils';
import { useTranslation } from 'react-i18next';

// ─── Props ───────────────────────────────────────────────────────────────────

interface RevenueControlBarProps {
    onModelToggle: (modelId: string | number, modelName: string) => void;
    chartData: ChartDataPoint[];
    onOpenBatteryConfig: () => void;
    batteryConfigOpen: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const RevenueControlBar: React.FC<RevenueControlBarProps> = ({
    onModelToggle,
    chartData,
    onOpenBatteryConfig,
    batteryConfigOpen,
}) => {
    const { t } = useTranslation('siteRevenue');
    const {
        areas, selectedArea, handleAreaChange,
        models, selectedModels, calculatingDatesByModel,
        handleModelCalculatingDateChange,
    } = useMarketDataContext();

    return (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.75,
                px: 1,
                py: 0.5,
                minHeight: 40,
                border: '1px solid var(--card-border)',
                bgcolor: 'var(--card-bg)',
                borderRadius: '1.5px',
                flexShrink: 0,
            }}
        >
            {/* ── Area ─────────────────────────────────────────────────────── */}
            <AreaButtonGroup areas={areas} selectedArea={selectedArea} onAreaChange={handleAreaChange} />

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* ── Models ───────────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <ModelChipsManager
                    models={models}
                    selectedModels={selectedModels}
                    calculatingDatesByModel={calculatingDatesByModel}
                    chartData={chartData}
                    onModelToggle={onModelToggle}
                    onCalculatingDateChange={handleModelCalculatingDateChange}
                    labels={{
                        addManageModels: t('controlBar.addManageModels'),
                        selectModels: t('controlBar.selectModel'),
                        calculationDate: t('controlBar.calcDate'),
                        latestForecast: t('controlBar.latestForecast'),
                        latest: t('controlBar.latest'),
                    }}
                />
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* ── Battery Config Button ────────────────────────────────────── */}
            <Tooltip title={t('controlBar.batteryConfigTooltip')} arrow>
                <Button
                    size="small"
                    startIcon={<SettingsIcon sx={{ fontSize: '0.85rem' }} />}
                    onClick={onOpenBatteryConfig}
                    variant={batteryConfigOpen ? 'contained' : 'outlined'}
                    sx={{
                        height: 28,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        border: `1px solid ${batteryConfigOpen ? 'var(--primary)' : 'var(--card-border)'}`,
                        color: batteryConfigOpen ? 'white' : 'var(--text-secondary)',
                        bgcolor: batteryConfigOpen ? 'var(--primary)' : 'transparent',
                        px: 1.5,
                        '&:hover': {
                            bgcolor: batteryConfigOpen ? 'var(--primary)' : 'rgba(0,204,122,0.08)',
                            borderColor: 'var(--primary)',
                            color: batteryConfigOpen ? 'white' : 'var(--primary)',
                        },
                    }}
                >
                    {t('controlBar.batteryParamsBtn')}
                </Button>
            </Tooltip>

        </Paper>
    );
};
