'use client';

import React, { useState } from 'react';
import { Box, Button, Divider, Typography, CircularProgress, SelectChangeEvent } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { Area, PredictionModel, CalculatingDate } from '@/types';
import { BatteryConfig, DEFAULT_BATTERY_CONFIG } from '@/types/revenueAnalysis';
import { RevenueParameterPanel } from './RevenueParameterPanel';
import { AreaSelector } from '@/components/selectors/AreaSelector';
import { ModelSelector } from '@/components/selectors/ModelSelector';
import { ChartDataPoint } from '@/utils/chartUtils';

interface RevenueAnalysisSidebarProps {
    // Area selection
    areas: Area[];
    selectedArea: string;
    onAreaChange: (event: SelectChangeEvent) => void;

    // Model selection
    models: PredictionModel[];
    selectedModels: Array<{
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }>;
    calculatingDatesByModel: { [key: string]: CalculatingDate[] };
    onModelToggle: (modelId: string | number, modelName: string) => void;
    onModelCalculatingDateChange: (modelIndex: number, newDate: string) => void;

    // Config
    config: BatteryConfig;
    onConfigChange: (config: BatteryConfig) => void;

    // Actions
    onRunSimulation: () => void;
    isLoading: boolean;

    // Data for Model Selector (MAE calculation)
    // Data for Model Selector (MAE calculation)
    chartData: ChartDataPoint[];

}

export const RevenueAnalysisSidebar: React.FC<RevenueAnalysisSidebarProps> = ({
    areas,
    selectedArea,
    onAreaChange,
    models,
    selectedModels,
    calculatingDatesByModel,
    onModelToggle,
    onModelCalculatingDateChange,
    config,
    onConfigChange,
    onRunSimulation,
    isLoading,
    chartData,
}) => {
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        area: false,
        models: false,
        params: true, // Default open for params
    });

    const handleReset = () => {
        onConfigChange(DEFAULT_BATTERY_CONFIG);
    };

    return (
        <Box sx={{
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--bg-default)',
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'var(--card-border)',
                borderRadius: '3px',
            },
        }}>

            {/* Header Actions */}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                    onClick={onRunSimulation}
                    disabled={isLoading}
                    sx={{
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.15)' }
                    }}
                >
                    {isLoading ? 'Calculating...' : 'Run Simulation'}
                </Button>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        fullWidth
                        size="small"
                        startIcon={<RestartAltIcon />}
                        onClick={handleReset}
                        sx={{ color: 'text.secondary', borderColor: 'var(--card-border)' }}
                    >
                        Reset
                    </Button>
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'var(--card-border)' }} />

            {/* Section 1: Data Selection (Area & Models) */}
            <AreaSelector
                areas={areas}
                selectedArea={selectedArea}
                onAreaChange={onAreaChange}
                expanded={expandedSections.area}
                onToggle={() => setExpandedSections(prev => ({ ...prev, area: !prev.area }))}
                step={1}
                description="Region Selection"
            />

            <Divider sx={{ borderColor: 'var(--card-border)', my: 0.5 }} />

            <ModelSelector
                models={models}
                selectedModels={selectedModels}
                calculatingDatesByModel={calculatingDatesByModel}
                onModelToggle={onModelToggle}
                onModelCalculatingDateChange={onModelCalculatingDateChange}
                chartData={chartData}
                expanded={expandedSections.models}
                onToggle={() => setExpandedSections(prev => ({ ...prev, models: !prev.models }))}
                step={2}
                description="Models Comparison"
            />

            <Divider sx={{ borderColor: 'var(--card-border)', my: 0.5 }} />

            {/* Section 2: Parameters */}
            <Box sx={{ p: 0 }}>
                <RevenueParameterPanel config={config} onChange={onConfigChange} />
            </Box>

            <Divider sx={{ borderColor: 'var(--card-border)', my: 1 }} />



            <Box sx={{ p: 2 }} />
        </Box>
    );
};
