'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Menu,
    MenuItem,
    Typography,
    IconButton,
    Tooltip,
    useTheme
} from '@mui/material';
import { format } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';

interface ModelSelectorProps {
    models: Array<{
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }>;
    availableModels: Array<{
        id: string | number;
        name: string;
    }>;
    calculatingDatesByModel: { [key: string]: Array<{ calculating_date: string }> };
    maxSelection?: number;
    onModelToggle: (modelId: string | number, modelName: string) => void;
    onCalculatingDateChange: (modelIndex: number, newDate: string) => void;
}

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
    availableModels,
    calculatingDatesByModel,
    maxSelection = 5,
    onModelToggle,
    onCalculatingDateChange,
}) => {
    const theme = useTheme();
    const [dateMenuAnchor, setDateMenuAnchor] = useState<{ el: HTMLElement; index: number } | null>(null);

    const handleDateMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
        event.stopPropagation();
        setDateMenuAnchor({ el: event.currentTarget, index });
    };

    const handleDateMenuClose = () => {
        setDateMenuAnchor(null);
    };

    const handleDateSelect = (modelIndex: number, date: string) => {
        onCalculatingDateChange(modelIndex, date);
        handleDateMenuClose();
    };

    const selectedModelIds = new Set(models.map(m => `${m.id}|${m.name}`));
    const availableModelOptions = availableModels.map(model => ({
        ...model,
        value: `${model.id}|${model.name}`,
        isSelected: selectedModelIds.has(`${model.id}|${model.name}`)
    }));

    return (
        <Box
            sx={{
                mb: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                border: `1px solid ${theme.palette.divider}`
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    選擇模型 (最多 {maxSelection} 個)
                </Typography>
                {models.length > 0 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {models.length} / {maxSelection} 已選擇
                    </Typography>
                )}
            </Box>

            {/* Available Models */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: models.length > 0 ? 2 : 0 }}>
                {availableModelOptions.map((option) => {
                    const isSelected = option.isSelected;
                    const isDisabled = models.length >= maxSelection && !isSelected;
                    const selectedModel = models.find(m => `${m.id}|${m.name}` === option.value);

                    return (
                        <Button
                            key={option.value}
                            variant={isSelected ? 'contained' : 'outlined'}
                            size="small"
                            disabled={isDisabled}
                            onClick={() => onModelToggle(option.id, option.name)}
                            sx={{
                                borderRadius: '20px',
                                px: 2,
                                py: 0.75,
                                textTransform: 'none',
                                borderColor: selectedModel?.color || theme.palette.divider,
                                backgroundColor: isSelected
                                    ? (selectedModel ? `${selectedModel.color}` : theme.palette.primary.main)
                                    : 'transparent',
                                color: isSelected
                                    ? theme.palette.getContrastText(selectedModel?.color || theme.palette.primary.main)
                                    : (selectedModel?.color || theme.palette.text.primary),
                                '&:hover': {
                                    backgroundColor: isSelected
                                        ? (selectedModel ? `${selectedModel.color}dd` : theme.palette.primary.dark)
                                        : (selectedModel ? `${selectedModel.color}22` : theme.palette.action.hover),
                                    borderColor: selectedModel?.color || theme.palette.primary.main,
                                },
                                '&.Mui-disabled': {
                                    opacity: 0.5,
                                }
                            }}
                            startIcon={
                                selectedModel ? (
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            backgroundColor: isSelected ? '#fff' : selectedModel.color,
                                        }}
                                    />
                                ) : null
                            }
                        >
                            {option.name}
                        </Button>
                    );
                })}
            </Box>

            {/* Selected Models with Date Settings */}
            {models.length > 0 && (
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                        計算日期設定：
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {models.map((model, index) => {
                            const modelKey = `${model.id}|${model.name}`;
                            const availableDates = calculatingDatesByModel[modelKey] || [];
                            const isDateMenuOpen = dateMenuAnchor?.index === index;

                            return (
                                <Chip
                                    key={modelKey}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    backgroundColor: model.color,
                                                    flexShrink: 0
                                                }}
                                            />
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                                {model.name}
                                            </Typography>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    color: 'text.secondary', 
                                                    ml: 0.5,
                                                    fontSize: '0.7rem',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                ({formatCalcDate(model.calculatingDate)})
                                            </Typography>
                                        </Box>
                                    }
                                    onDelete={() => onModelToggle(model.id, model.name)}
                                    deleteIcon={<CancelIcon />}
                                    onClick={(e) => handleDateMenuOpen(e, index)}
                                    sx={{
                                        backgroundColor: theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(0, 0, 0, 0.04)',
                                        border: `1.5px solid ${model.color}60`,
                                        color: model.color,
                                        fontWeight: 500,
                                        height: 32,
                                        '&:hover': {
                                            backgroundColor: theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.12)'
                                                : 'rgba(0, 0, 0, 0.08)',
                                            borderColor: model.color,
                                            transform: 'translateY(-1px)',
                                            boxShadow: `0 2px 8px ${model.color}40`,
                                        },
                                        transition: 'all 0.2s ease-in-out',
                                        '& .MuiChip-deleteIcon': {
                                            color: model.color,
                                            fontSize: '1rem',
                                            '&:hover': {
                                                color: theme.palette.error.main,
                                            }
                                        },
                                        '& .MuiChip-icon': {
                                            marginLeft: '8px',
                                            marginRight: '4px',
                                        }
                                    }}
                                    icon={
                                        <Tooltip title="點擊更改計算日期">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDateMenuOpen(e, index);
                                                }}
                                                sx={{
                                                    color: model.color,
                                                    p: 0.5,
                                                    '&:hover': {
                                                        backgroundColor: `${model.color}20`
                                                    }
                                                }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                />
                            );
                        })}
                    </Box>

                    {/* Date Selection Menu */}
                    {dateMenuAnchor && (
                        <Menu
                            anchorEl={dateMenuAnchor.el}
                            open={dateMenuAnchor !== null}
                            onClose={handleDateMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            PaperProps={{
                                sx: {
                                    mt: 1,
                                    minWidth: 200,
                                    maxHeight: 300,
                                    backgroundColor: theme.palette.mode === 'dark'
                                        ? 'rgba(30, 30, 30, 0.98)'
                                        : 'rgba(255, 255, 255, 0.98)',
                                    backdropFilter: 'blur(10px)',
                                    border: `1px solid ${theme.palette.divider}`,
                                }
                            }}
                        >
                            <MenuItem
                                selected={models[dateMenuAnchor.index].calculatingDate === 'latest'}
                                onClick={() => handleDateSelect(dateMenuAnchor.index, 'latest')}
                            >
                                最新預測
                            </MenuItem>
                            {calculatingDatesByModel[`${models[dateMenuAnchor.index].id}|${models[dateMenuAnchor.index].name}`]?.map((date) => (
                                <MenuItem
                                    key={date.calculating_date}
                                    selected={models[dateMenuAnchor.index].calculatingDate === date.calculating_date}
                                    onClick={() => handleDateSelect(dateMenuAnchor.index, date.calculating_date)}
                                >
                                    {formatCalcDate(date.calculating_date)}
                                </MenuItem>
                            ))}
                        </Menu>
                    )}
                </Box>
            )}

            {models.length >= maxSelection && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    最多可選擇 {maxSelection} 個模型進行比較
                </Typography>
            )}
        </Box>
    );
};
