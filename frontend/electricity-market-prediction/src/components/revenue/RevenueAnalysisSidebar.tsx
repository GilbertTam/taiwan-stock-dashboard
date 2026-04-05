'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    Collapse,
    Divider,
    SelectChangeEvent,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { Area, PredictionModel, CalculatingDate } from '@/types';
import { BatteryConfig, DEFAULT_BATTERY_CONFIG } from '@/types/revenueAnalysis';
import { RevenueParameterPanel } from './RevenueParameterPanel';
import { AreaSelector } from '@/components/selectors/AreaSelector';
import { ModelSelector } from '@/components/selectors/ModelSelector';
import { SectionHeader } from '@/components/selectors/shared';
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
    chartData,
}) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        area: true,
        models: true,
        params: false,
    });

    const toggle = (key: string) =>
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <Box sx={{
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--bg-default)',
            '&::-webkit-scrollbar': { width: '5px' },
            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'var(--card-border)',
                borderRadius: '3px',
            },
        }}>

            {/* Section 1: Area */}
            <AreaSelector
                areas={areas}
                selectedArea={selectedArea}
                onAreaChange={onAreaChange}
                expanded={expandedSections.area}
                onToggle={() => toggle('area')}
                step={1}
                description="區域選擇"
            />

            <Divider sx={{ borderColor: 'var(--card-border)' }} />

            {/* Section 2: Models */}
            <ModelSelector
                models={models}
                selectedModels={selectedModels}
                calculatingDatesByModel={calculatingDatesByModel}
                onModelToggle={onModelToggle}
                onModelCalculatingDateChange={onModelCalculatingDateChange}
                chartData={chartData}
                expanded={expandedSections.models}
                onToggle={() => toggle('models')}
                step={2}
                description="模型比較"
            />

            <Divider sx={{ borderColor: 'var(--card-border)' }} />

            {/* Section 3: Battery Parameters (collapsed by default) */}
            <SectionHeader
                expanded={expandedSections.params}
                onClick={() => toggle('params')}
                step={3}
                description="電池系統規格與限制條件"
            >
                電池參數
            </SectionHeader>
            <Collapse in={expandedSections.params}>
                <Box sx={{ p: 1.5 }}>
                    <RevenueParameterPanel config={config} onChange={onConfigChange} />
                    <Button
                        variant="text"
                        size="small"
                        startIcon={<RestartAltIcon sx={{ fontSize: '0.9rem' }} />}
                        onClick={() => onConfigChange(DEFAULT_BATTERY_CONFIG)}
                        sx={{
                            mt: 1,
                            fontSize: '0.72rem',
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary' },
                        }}
                    >
                        恢復預設值
                    </Button>
                </Box>
            </Collapse>

            <Box sx={{ pb: 2 }} />
        </Box>
    );
};
