
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
    onToggle
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
            >
                預測模型 ({selectedModels.length})
            </SectionHeader>

            <Collapse in={expanded}>
                <Box sx={{ display: 'flex', borderTop: '1px solid var(--card-border)' }}>
                    {/* Left: Checkbox List */}
                    <Box sx={{ width: '50%', borderRight: '1px solid var(--card-border)' }}>
                        <Box sx={{ p: 1, bgcolor: 'var(--hover-bg)' }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">啟用模型</Typography>
                        </Box>
                        <List dense sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
                            {models.map((model) => {
                                const modelKey = `${model.id}|${model.name}`;
                                const isSelected = selectedModels.some(m => `${m.id}|${m.name}` === modelKey);
                                const selectedModel = selectedModels.find(m => `${m.id}|${m.name}` === modelKey);
                                const modelIndex = selectedModel ? selectedModels.indexOf(selectedModel) : -1;
                                const modelColor = modelColorMap[modelKey] || (model as any).color || '#cccccc';

                                return (
                                    <ListItem
                                        key={modelKey}
                                        disablePadding
                                        sx={{
                                            borderLeft: `3px solid ${isSelected ? modelColor : 'transparent'}`,
                                            bgcolor: isSelected ? getAlphaColor(modelColor, 0.08) : 'transparent',
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
                                                primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: isSelected ? 600 : 400 }}
                                            />
                                            {isSelected && (
                                                <IconButton size="small" onClick={(e) => handleDateMenuOpen(e, modelIndex)}>
                                                    <EditIcon sx={{ fontSize: '0.8rem' }} />
                                                </IconButton>
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>

                    {/* Right: Details List */}
                    <Box sx={{ width: '50%' }}>
                        <Box sx={{ p: 1, bgcolor: 'var(--hover-bg)' }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">詳細資訊</Typography>
                        </Box>
                        <List dense sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
                            {selectedModels.length === 0 ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">未選擇模型</Typography>
                                </Box>
                            ) : (
                                selectedModels.map((model) => {
                                    const modelKey = `${model.id}|${model.name}`;
                                    const isFocused = highlightedModelId === modelKey;
                                    const mae = calculateModelMAE(chartData, model.id, model.name);
                                    const modelColor = modelColorMap[modelKey] || model.color || '#cccccc';

                                    return (
                                        <ListItem
                                            key={modelKey}
                                            disablePadding
                                            onClick={() => setHighlightedModelId(isFocused ? null : modelKey)}
                                            sx={{
                                                cursor: 'pointer',
                                                borderLeft: `3px solid ${isFocused ? modelColor : 'transparent'}`,
                                                bgcolor: isFocused ? getAlphaColor(modelColor, 0.15) : 'transparent',
                                                '&:hover': { bgcolor: getAlphaColor(modelColor, 0.08) },
                                            }}
                                        >
                                            <Box sx={{ width: '100%', p: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" fontWeight="bold">{model.name}</Typography>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: modelColor }} />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="caption" color="text.secondary">MAE</Typography>
                                                    <Typography variant="caption" fontWeight="bold">
                                                        {mae && mae > 0 ? mae.toFixed(2) : '—'}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="caption" color="text.secondary">日期</Typography>
                                                    <Typography variant="caption">
                                                        {model.calculatingDate === 'latest' ? '最新' : formatCalcDate(model.calculatingDate)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </ListItem>
                                    )
                                })
                            )}
                        </List>
                    </Box>
                </Box>
            </Collapse>

            {/* Models Summary when collapsed */}
            {!expanded && selectedModels.length > 0 && (
                <Box sx={{ px: 2, py: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedModels.map(m => (
                        <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: modelColorMap[`${m.id}|${m.name}`] }} />
                            <Typography variant="caption">{m.name}</Typography>
                        </Box>
                    ))}
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
