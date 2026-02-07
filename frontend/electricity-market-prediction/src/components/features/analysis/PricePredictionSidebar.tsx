
'use client';

import React, { useMemo, useState } from 'react';
import { Box, SelectChangeEvent } from '@mui/material';
import { Area, PredictionModel, CalculatingDate } from '@/types';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { prepareChartData } from '@/utils/chartUtils';
import { AreaSelector } from './sidebar/AreaSelector';
import { ModelSelector } from './sidebar/ModelSelector';
import { DataSourceSelector } from './sidebar/DataSourceSelector';

interface PricePredictionSidebarProps {
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
}

export const PricePredictionSidebar: React.FC<PricePredictionSidebarProps> = ({
  areas,
  selectedArea,
  onAreaChange,
  models,
  selectedModels,
  calculatingDatesByModel,
  onModelToggle,
  onModelCalculatingDateChange,
}) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    area: false,
    models: false,
    modelDetails: false,
    dataSources: false,
  });

  const { actualPrices, predictionsByModel } = useMarketDataContext();

  const chartData = useMemo(
    () => prepareChartData(actualPrices, predictionsByModel),
    [actualPrices, predictionsByModel]
  );

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
      {/* Section 1: Area Selector */}
      <AreaSelector
        areas={areas}
        selectedArea={selectedArea}
        onAreaChange={onAreaChange}
        expanded={expandedSections.area}
        onToggle={() => setExpandedSections(prev => ({ ...prev, area: !prev.area }))}
      />

      {/* Section 2: Model Selector */}
      <ModelSelector
        models={models}
        selectedModels={selectedModels}
        calculatingDatesByModel={calculatingDatesByModel}
        onModelToggle={onModelToggle}
        onModelCalculatingDateChange={onModelCalculatingDateChange}
        chartData={chartData}
        expanded={expandedSections.models}
        onToggle={() => {
          const newState = !expandedSections.models;
          setExpandedSections(prev => ({ ...prev, models: newState, modelDetails: newState }));
        }}
      />

      {/* Section 3: Data Sources */}
      <DataSourceSelector
        expanded={expandedSections.dataSources}
        onToggle={() => setExpandedSections(prev => ({ ...prev, dataSources: !prev.dataSources }))}
      />
    </Box>
  );
};
