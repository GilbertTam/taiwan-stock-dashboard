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

/**
 * 案場收益側邊欄 | Site revenue analysis sidebar
 * 包含區域、模型選擇與參數設定 (Contains region/model selection and parameter settings)
 */
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
        area: true,
        models: true,
        params: true,
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

            {/* 側邊欄主要操作 | Header Actions */}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
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
                        {isLoading ? '計算中... (Calculating...)' : '執行模擬 (Run Simulation)'}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                        依目前區域、日期與模型計算最適排程與收益
                    </Typography>
                </Box>

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
                        恢復預設 (Reset to default)
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
                description="區域選擇 (Region Selection)"
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
                description="模型比較 (Models Comparison)"
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
