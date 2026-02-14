
import React, { useState } from 'react';
import {
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Checkbox,
    Typography,
    Collapse,
    Paper,
    Box,
    IconButton,
    Menu,
    MenuItem,
    alpha
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { PredictionModel, CalculatingDate } from '@/types';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { calculateModelMAE, ChartDataPoint } from '@/utils/chartUtils';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { SectionHeader } from './shared';

interface ModelSelectorProps {
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
    chartData: ChartDataPoint[]; // Need chartData for MAE calculation
    expanded: boolean;
    onToggle: () => void;
    step?: number;
    description?: string;
}

// Helper: 格式化日期的函數
const formatCalcDate = (dateVal: string | number) => {
    if (dateVal === 'latest') return '最新';
    if (!dateVal) return '';
    const numVal = Number(dateVal);
    if (!isNaN(numVal) && numVal > 100000000) {
        return format(new Date(numVal), 'yyyy-MM-dd');
    }
    const strVal = String(dateVal);
    if (strVal.length === 8 && !isNaN(Number(strVal))) {
        return `${strVal.substring(0, 4)}-${strVal.substring(4, 6)}-${strVal.substring(6, 8)}`;
    }
    try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    } catch (e) { }
    return String(dateVal);
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    models,
    selectedModels,
    calculatingDatesByModel,
    onModelToggle,
    onModelCalculatingDateChange,
    chartData,
    expanded,
    onToggle,
    step = 2,
    description = '選擇要比較的預測模型',
}) => {
    const [dateMenuAnchor, setDateMenuAnchor] = useState<{ el: HTMLElement; modelIndex: number } | null>(null);
    const { modelColorMap } = usePriceChart();
    const { highlightedModelId, setHighlightedModelId } = useMarketDataContext();

    const handleDateMenuOpen = (event: React.MouseEvent<HTMLElement>, modelIndex: number) => {
        event.stopPropagation();
        setDateMenuAnchor({ el: event.currentTarget, modelIndex });
    };

    const handleDateMenuClose = () => {
        setDateMenuAnchor(null);
    };

    const handleDateSelect = (modelIndex: number, date: string) => {
        onModelCalculatingDateChange(modelIndex, date);
        handleDateMenuClose();
    };

    const getAlphaColor = (color: string, opacity: number) => {
        if (color.startsWith('var(')) {
            return `color-mix(in srgb, ${color}, transparent ${100 - (opacity * 100)}%)`;
        }
        try {
            return alpha(color, opacity);
        } catch (e) {
            return color;
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                borderBottom: '1px solid var(--card-border)',
                borderRadius: 0,
                backgroundColor: 'transparent',
                flexShrink: 0,
            }}
        >
            <SectionHeader
                onClick={onToggle}
                expanded={expanded}
                step={step}
                description={description}
            >
                選擇模型 ({selectedModels.length})
            </SectionHeader>

            <Collapse in={expanded}>
                <List dense sx={{ p: 1, borderTop: '1px solid var(--card-border)', maxHeight: 300, overflowY: 'auto' }}>
                    {models.map((model) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const isSelected = selectedModels.some(m => `${m.id}|${m.name}` === modelKey);
                        const selectedModel = selectedModels.find(m => `${m.id}|${m.name}` === modelKey);
                        const modelIndex = selectedModel ? selectedModels.indexOf(selectedModel) : -1;
                        const modelColor = modelColorMap[modelKey] || (model as any).color || '#cccccc';
                        const dateLabel = selectedModel
                            ? (selectedModel.calculatingDate === 'latest' ? '最新' : formatCalcDate(selectedModel.calculatingDate))
                            : '';

                        return (
                            <ListItem
                                key={modelKey}
                                disablePadding
                                sx={{
                                    borderLeft: `3px solid ${isSelected ? modelColor : 'transparent'}`,
                                    bgcolor: isSelected ? getAlphaColor(modelColor, 0.08) : 'transparent',
                                    borderRadius: 1,
                                    mb: 0.5,
                                    '&:hover': { bgcolor: getAlphaColor(modelColor, 0.12) },
                                }}
                            >
                                <ListItemButton sx={{ py: 0.5, px: 1 }} onClick={() => onModelToggle(model.id, model.name)}>
                                    <Checkbox
                                        checked={isSelected}
                                        size="small"
                                        sx={{
                                            p: 0.5, mr: 1,
                                            color: modelColor,
                                            '&.Mui-checked': { color: modelColor }
                                        }}
                                    />
                                    <ListItemText
                                        primary={model.name}
                                        secondary={isSelected ? dateLabel : undefined}
                                        primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: isSelected ? 600 : 400 }}
                                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                    />
                                    {isSelected && (
                                        <IconButton size="small" onClick={(e) => handleDateMenuOpen(e, modelIndex)} title="變更計算日">
                                            <EditIcon sx={{ fontSize: '0.8rem' }} />
                                        </IconButton>
                                    )}
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Collapse>

            {/* Models Summary when collapsed: color dot + name + MAE */}
            {!expanded && selectedModels.length > 0 && (
                <Box sx={{ px: 2, py: 1, display: 'flex', flexWrap: 'wrap', gap: 1, borderLeft: '3px solid var(--primary)', ml: 0.5, bgcolor: 'var(--hover-bg)' }}>
                    {selectedModels.map(m => {
                        const mae = calculateModelMAE(chartData, m.id, m.name);
                        return (
                            <Box key={`${m.id}|${m.name}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: modelColorMap[`${m.id}|${m.name}`] }} />
                                <Typography variant="caption">{m.name}</Typography>
                                {mae != null && mae > 0 && (
                                    <Typography component="span" variant="caption" color="text.secondary">MAE {mae.toFixed(2)}</Typography>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* Date Selection Menu (Popup) */}
            <Menu
                anchorEl={dateMenuAnchor?.el}
                open={Boolean(dateMenuAnchor)}
                onClose={handleDateMenuClose}
            >
                <MenuItem onClick={() => dateMenuAnchor && handleDateSelect(dateMenuAnchor.modelIndex, 'latest')}>
                    最新預測
                </MenuItem>
                {dateMenuAnchor && calculatingDatesByModel[`${selectedModels[dateMenuAnchor.modelIndex]?.id}|${selectedModels[dateMenuAnchor.modelIndex]?.name}`]?.map((date) => (
                    <MenuItem
                        key={date.calculating_date}
                        onClick={() => handleDateSelect(dateMenuAnchor.modelIndex, date.calculating_date)}
                    >
                        {formatCalcDate(date.calculating_date)}
                    </MenuItem>
                ))}
            </Menu>
        </Paper>
    );
};
