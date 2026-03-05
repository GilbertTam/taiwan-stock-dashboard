import React, { useState } from 'react';
import {
    Box,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Checkbox,
    Collapse,
    Chip,
    Tooltip,
    Typography,
} from '@mui/material';
import { AreaSelector } from '@/components/selectors/AreaSelector';
import { SectionHeader } from '@/components/selectors/shared';
import { Area } from '@/types';
import { HOURLY_CATEGORIES, DAILY_CATEGORIES } from '@/constants/weatherCategories';
import type { WeatherModelInfo } from '@/services/weatherApi';

interface WeatherPageSidebarProps {
    areas: Area[];
    selectedArea: string;
    onAreaChange: (e: any) => void;
    weatherModels: WeatherModelInfo[];
    selectedModel: string | null;
    onModelChange: (model: string) => void;
    selectedHourlyCategories: Set<string>;
    onHourlyCategoryChange: (id: string) => void;
    disabledHourlyCategories: Set<string>;
    selectedDailyCategories: Set<string>;
    onDailyCategoryChange: (id: string) => void;
    disabledDailyCategories: Set<string>;
}

export const WeatherPageSidebar: React.FC<WeatherPageSidebarProps> = ({
    areas,
    selectedArea,
    onAreaChange,
    weatherModels,
    selectedModel,
    onModelChange,
    selectedHourlyCategories,
    onHourlyCategoryChange,
    disabledHourlyCategories,
    selectedDailyCategories,
    onDailyCategoryChange,
    disabledDailyCategories,
}) => {
    const [expandedArea, setExpandedArea] = useState(true);
    const [expandedModel, setExpandedModel] = useState(true);
    const [expandedHourly, setExpandedHourly] = useState(true);
    const [expandedDaily, setExpandedDaily] = useState(true);

    const renderCategoryList = (
        categories: typeof HOURLY_CATEGORIES,
        selectedSet: Set<string>,
        onChange: (id: string) => void,
        disabledSet: Set<string>
    ) => (
        <List dense sx={{ p: 1 }}>
            {categories.map((cat) => {
                const isSelected = selectedSet.has(cat.id);
                const isDisabled = disabledSet.has(cat.id);
                return (
                    <Tooltip
                        key={cat.id}
                        title={isDisabled ? '此模型不提供此類別資料' : ''}
                        placement="right"
                        arrow
                    >
                        <ListItem
                            disablePadding
                            onClick={() => !isDisabled && onChange(cat.id)}
                            sx={{
                                borderRadius: 1,
                                mb: 0.5,
                                opacity: isDisabled ? 0.4 : 1,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                backgroundColor: isSelected && !isDisabled ? 'var(--primary-light)' : 'transparent',
                                color: isSelected && !isDisabled ? 'var(--primary)' : 'inherit',
                                '&:hover': {
                                    backgroundColor: isDisabled
                                        ? 'transparent'
                                        : isSelected
                                            ? 'var(--primary-light)'
                                            : 'var(--hover-bg)',
                                },
                            }}
                        >
                            <ListItemButton
                                sx={{ py: 0.5, px: 1, borderRadius: 1 }}
                                disabled={isDisabled}
                            >
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                    <Checkbox
                                        edge="start"
                                        checked={isSelected && !isDisabled}
                                        tabIndex={-1}
                                        disableRipple
                                        size="small"
                                        disabled={isDisabled}
                                        sx={{
                                            p: 0.5,
                                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                            '&.Mui-checked': { color: 'var(--primary)' },
                                        }}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={cat.label}
                                    primaryTypographyProps={{
                                        fontSize: '0.85rem',
                                        fontWeight: isSelected && !isDisabled ? 600 : 400,
                                        sx: { textDecoration: isDisabled ? 'line-through' : 'none' },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    </Tooltip>
                );
            })}
        </List>
    );

    return (
        <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--background)',
            borderRight: '1px solid var(--card-border)',
            overflowY: 'auto',
            overflowX: 'hidden'
        }}>
            <AreaSelector
                areas={areas}
                selectedArea={selectedArea}
                onAreaChange={onAreaChange}
                expanded={expandedArea}
                onToggle={() => setExpandedArea(!expandedArea)}
                step={1}
            />

            {/* Model selector */}
            <Paper elevation={0} sx={{
                borderBottom: '1px solid var(--card-border)',
                borderRadius: 0,
                backgroundColor: 'transparent',
                flexShrink: 0
            }}>
                <SectionHeader
                    onClick={() => setExpandedModel(!expandedModel)}
                    expanded={expandedModel}
                    step={2}
                    description="選擇天氣預報模型"
                >
                    天氣模型
                </SectionHeader>
                <Collapse in={expandedModel}>
                    <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {weatherModels.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
                                無可用模型
                            </Typography>
                        ) : (
                            weatherModels.map((m) => (
                                <Chip
                                    key={m.model}
                                    label={m.model}
                                    size="small"
                                    variant={selectedModel === m.model ? 'filled' : 'outlined'}
                                    color={selectedModel === m.model ? 'primary' : 'default'}
                                    onClick={() => onModelChange(m.model)}
                                    sx={{
                                        fontSize: '0.75rem',
                                        height: 26,
                                        fontWeight: selectedModel === m.model ? 700 : 400,
                                        '&:hover': {
                                            backgroundColor: selectedModel === m.model
                                                ? undefined
                                                : 'var(--hover-bg)',
                                        },
                                    }}
                                />
                            ))
                        )}
                    </Box>
                </Collapse>
            </Paper>

            {/* Hourly categories */}
            <Paper elevation={0} sx={{
                borderBottom: '1px solid var(--card-border)',
                borderRadius: 0,
                backgroundColor: 'transparent',
                flexShrink: 0
            }}>
                <SectionHeader
                    onClick={() => setExpandedHourly(!expandedHourly)}
                    expanded={expandedHourly}
                    step={3}
                    description="選擇要呈現的逐時圖表"
                >
                    逐時天氣資料
                </SectionHeader>
                <Collapse in={expandedHourly}>
                    {renderCategoryList(HOURLY_CATEGORIES, selectedHourlyCategories, onHourlyCategoryChange, disabledHourlyCategories)}
                </Collapse>
            </Paper>

            {/* Daily categories */}
            <Paper elevation={0} sx={{
                borderBottom: '1px solid var(--card-border)',
                borderRadius: 0,
                backgroundColor: 'transparent',
                flexShrink: 0
            }}>
                <SectionHeader
                    onClick={() => setExpandedDaily(!expandedDaily)}
                    expanded={expandedDaily}
                    step={4}
                    description="選擇要呈現的每日圖表"
                >
                    每日天氣總計
                </SectionHeader>
                <Collapse in={expandedDaily}>
                    {renderCategoryList(DAILY_CATEGORIES, selectedDailyCategories, onDailyCategoryChange, disabledDailyCategories)}
                </Collapse>
            </Paper>
        </Box>
    );
};
