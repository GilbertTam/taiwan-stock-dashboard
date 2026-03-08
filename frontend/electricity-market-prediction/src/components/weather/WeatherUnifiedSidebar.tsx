'use client';

import React, { useState } from 'react';
import {
    Box,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Radio,
    Checkbox,
    Collapse,
    Typography,
    ToggleButtonGroup,
    ToggleButton,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
    Chip,
    TextField,
    Tabs,
    Tab,
    Stack,
    Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { weatherFields } from '@/components/price-chart/constants';
import {
    WbSunny as SunIcon,
    Cloud as CloudIcon,
    ShowChart,
    ExpandMore,
    ExpandLess,
} from '@mui/icons-material';
import { Area } from '@/types';
import { SectionHeader } from '@/components/selectors/shared';
import {
    HOURLY_CATEGORIES,
    DAILY_CATEGORIES,
    WEATHER_FIELD_DISPLAY,
} from '@/constants/weatherCategories';
import type { WeatherModelBasicInfo } from '@/services/weatherApi';

// =============================================================================
// Types
// =============================================================================

export interface WeatherUnifiedSidebarProps {
    // Area
    areas: Area[];
    selectedArea: string;
    onAreaChange: (event: SelectChangeEvent) => void;

    // Data source toggles
    // Data source toggles
    showActualHourly: boolean;
    onShowActualHourlyChange: (show: boolean) => void;
    showActualDaily: boolean;
    onShowActualDailyChange: (show: boolean) => void;
    showForecastHourly: boolean;
    onShowForecastHourlyChange: (show: boolean) => void;
    showForecastDaily: boolean;
    onShowForecastDailyChange: (show: boolean) => void;

    // Per-dataset model selection
    modelsActualHourly: WeatherModelBasicInfo[];
    selectedModelActualHourly: string | null;
    onModelActualHourlyChange: (model: string | null) => void;

    modelsActualDaily: WeatherModelBasicInfo[];
    selectedModelActualDaily: string | null;
    onModelActualDailyChange: (model: string | null) => void;

    modelsForecastHourly: WeatherModelBasicInfo[];
    selectedModelForecastHourly: string | null;
    onModelForecastHourlyChange: (model: string | null) => void;

    modelsForecastDaily: WeatherModelBasicInfo[];
    selectedModelForecastDaily: string | null;
    onModelForecastDailyChange: (model: string | null) => void;

    // Field selection
    selectedFields: Set<string>;
    onFieldToggle: (field: string) => void;

    // Height selection per variable
    weatherHeightByField: Record<string, string>;
    availableHeights: Record<string, string[]>;
    onHeightChange: (fieldGroup: string, height: string) => void;
}

// =============================================================================
// Shortcut Presets
// =============================================================================
const PRESETS = [
    {
        label: '常用 (溫/降水/風)',
        fields: ['temperature_2m', 'precipitation', 'wind_speed_10m']
    },
    {
        label: '溫濕度',
        fields: ['temperature_2m', 'relative_humidity_2m']
    },
    {
        label: '日資料 (高溫/降水/日照)',
        fields: ['temperature_2m_max', 'precipitation_sum', 'sunshine_duration']
    }
];

// =============================================================================
// Main Component
// =============================================================================

export const WeatherUnifiedSidebar: React.FC<WeatherUnifiedSidebarProps> = ({
    areas,
    selectedArea,
    onAreaChange,
    showActualHourly,
    onShowActualHourlyChange,
    showActualDaily,
    onShowActualDailyChange,
    showForecastHourly,
    onShowForecastHourlyChange,
    showForecastDaily,
    onShowForecastDailyChange,
    modelsActualHourly,
    selectedModelActualHourly,
    onModelActualHourlyChange,
    modelsActualDaily,
    selectedModelActualDaily,
    onModelActualDailyChange,
    modelsForecastHourly,
    selectedModelForecastHourly,
    onModelForecastHourlyChange,
    modelsForecastDaily,
    selectedModelForecastDaily,
    onModelForecastDailyChange,
    selectedFields,
    onFieldToggle,
    weatherHeightByField,
    availableHeights,
    onHeightChange,
}) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        area: false,
        dataSources: true,
        fields: true,
    });

    const [fieldTab, setFieldTab] = useState<0 | 1>(0); // 0: Hourly, 1: Daily
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const handleApplyPreset = (presetFields: string[]) => {
        // Here we clear existing completely and set only the preset fields
        // because "onFieldToggle" toggles one by one. 
        // We'll mimic this by finding fields to remove and fields to add.
        // Or we could have an update/replace function from context, but we can't cleanly do `selectedFields = new Set()` directly.
        // Let's implement clearing and toggling carefully:

        // Wait, onFieldToggle is the only setter provided. 
        // A better approach is: if we toggle ones that are mismatching.
        const target = new Set(presetFields);
        const current = new Set(selectedFields);

        current.forEach(f => {
            if (!target.has(f)) onFieldToggle(f);
        });
        target.forEach(f => {
            if (!current.has(f)) onFieldToggle(f);
        });
    };

    const handleClearFields = () => {
        selectedFields.forEach(f => onFieldToggle(f));
    };

    const activeCategories = fieldTab === 0 ? HOURLY_CATEGORIES : DAILY_CATEGORIES;

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
            {/* ── Section 1: Area ── */}
            <Paper elevation={0} sx={{ borderBottom: '1px solid var(--card-border)', borderRadius: 0, backgroundColor: 'transparent', flexShrink: 0 }}>
                <SectionHeader onClick={() => setExpandedSections(p => ({ ...p, area: !p.area }))} expanded={expandedSections.area} step={1} description="選擇要分析的地區">
                    選擇地區
                </SectionHeader>
                <Collapse in={expandedSections.area}>
                    <List dense sx={{ p: 1 }}>
                        {areas.map(area => {
                            const isSelected = selectedArea === area.name;
                            return (
                                <ListItem key={area.id} disablePadding onClick={() => { onAreaChange({ target: { value: area.name } } as any); setExpandedSections(p => ({ ...p, area: false })); }} sx={{ borderRadius: 1, mb: 0.5, backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent', color: isSelected ? 'var(--primary)' : 'inherit', '&:hover': { backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--hover-bg)' } }}>
                                    <ListItemButton sx={{ py: 0.5, px: 1, borderRadius: 1 }}>
                                        <ListItemIcon sx={{ minWidth: 28 }}><Radio checked={isSelected} size="small" sx={{ p: 0.5, color: isSelected ? 'var(--primary)' : 'var(--text-secondary)', '&.Mui-checked': { color: 'var(--primary)' } }} /></ListItemIcon>
                                        <ListItemText primary={area.name_ch} secondary={area.name} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400 }} secondaryTypographyProps={{ fontSize: '0.7rem', color: isSelected ? 'color-mix(in srgb, var(--primary), transparent 30%)' : 'text.secondary' }} />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                </Collapse>
                {!expandedSections.area && selectedArea && (
                    <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderLeft: '3px solid var(--primary)', ml: 0.5, bgcolor: 'var(--hover-bg)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>目前選擇：</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--primary)' }}>{areas.find(a => a.name === selectedArea)?.name_ch || selectedArea}</Typography>
                    </Box>
                )}
            </Paper>

            {/* ── Section 2: Data Sources ── */}
            <Paper elevation={0} sx={{ borderBottom: '1px solid var(--card-border)', borderRadius: 0, backgroundColor: 'transparent', flexShrink: 0 }}>
                <SectionHeader onClick={() => setExpandedSections(p => ({ ...p, dataSources: !p.dataSources }))} expanded={expandedSections.dataSources} step={2} description="選擇實際或預報資料及模型">
                    資料來源
                </SectionHeader>
                <Collapse in={expandedSections.dataSources}>
                    <Box sx={{ p: 1 }}>
                        {/* Actual Group */}
                        <Box sx={{ mb: 1.5, p: 1, border: '1px solid var(--card-border)', borderRadius: 1, bgcolor: (showActualHourly || showActualDaily) ? 'var(--hover-bg)' : 'transparent' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pl: 0.5 }}>
                                <SunIcon sx={{ fontSize: 18, color: '#ff7043', mr: 1 }} />
                                <Typography variant="body2" fontWeight="600">實際觀測</Typography>
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ pl: 3 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
                                        <Checkbox checked={showActualHourly} onChange={(e) => onShowActualHourlyChange(e.target.checked)} size="small" sx={{ p: 0, mr: 0.5 }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>小時模型</Typography>
                                    </Box>
                                    <Select disabled={!showActualHourly} size="small" fullWidth value={selectedModelActualHourly || ''} onChange={(e) => onModelActualHourlyChange(e.target.value || null)} sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--bg-paper)' }} displayEmpty>
                                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>全部</MenuItem>
                                        {modelsActualHourly.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.75rem' }}>{m.model}</MenuItem>)}
                                    </Select>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
                                        <Checkbox checked={showActualDaily} onChange={(e) => onShowActualDailyChange(e.target.checked)} size="small" sx={{ p: 0, mr: 0.5 }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>日模型</Typography>
                                    </Box>
                                    <Select disabled={!showActualDaily} size="small" fullWidth value={selectedModelActualDaily || ''} onChange={(e) => onModelActualDailyChange(e.target.value || null)} sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--bg-paper)' }} displayEmpty>
                                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>全部</MenuItem>
                                        {modelsActualDaily.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.75rem' }}>{m.model}</MenuItem>)}
                                    </Select>
                                </Box>
                            </Stack>
                        </Box>

                        {/* Forecast Group */}
                        <Box sx={{ p: 1, border: '1px solid var(--card-border)', borderRadius: 1, bgcolor: (showForecastHourly || showForecastDaily) ? 'var(--hover-bg)' : 'transparent' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pl: 0.5 }}>
                                <CloudIcon sx={{ fontSize: 18, color: '#42a5f5', mr: 1 }} />
                                <Typography variant="body2" fontWeight="600">預報資料</Typography>
                            </Box>
                            <Stack direction="row" spacing={1} sx={{ pl: 3 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
                                        <Checkbox checked={showForecastHourly} onChange={(e) => onShowForecastHourlyChange(e.target.checked)} size="small" sx={{ p: 0, mr: 0.5 }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>小時模型</Typography>
                                    </Box>
                                    <Select disabled={!showForecastHourly} size="small" fullWidth value={selectedModelForecastHourly || ''} onChange={(e) => onModelForecastHourlyChange(e.target.value || null)} sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--bg-paper)' }} displayEmpty>
                                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>全部</MenuItem>
                                        {modelsForecastHourly.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.75rem' }}>{m.model}</MenuItem>)}
                                    </Select>
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
                                        <Checkbox checked={showForecastDaily} onChange={(e) => onShowForecastDailyChange(e.target.checked)} size="small" sx={{ p: 0, mr: 0.5 }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>日模型</Typography>
                                    </Box>
                                    <Select disabled={!showForecastDaily} size="small" fullWidth value={selectedModelForecastDaily || ''} onChange={(e) => onModelForecastDailyChange(e.target.value || null)} sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--bg-paper)' }} displayEmpty>
                                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>全部</MenuItem>
                                        {modelsForecastDaily.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.75rem' }}>{m.model}</MenuItem>)}
                                    </Select>
                                </Box>
                            </Stack>
                        </Box>
                    </Box>
                </Collapse>
            </Paper>

            {/* ── Section 3: Field Selection (UX Improved) ── */}
            <Paper elevation={0} sx={{ borderBottom: '1px solid var(--card-border)', borderRadius: 0, backgroundColor: 'transparent', flexShrink: 0 }}>
                <SectionHeader onClick={() => setExpandedSections(p => ({ ...p, fields: !p.fields }))} expanded={expandedSections.fields} step={3} description="選擇要顯示的天氣變數">
                    天氣變數
                </SectionHeader>
                <Collapse in={expandedSections.fields}>
                    {/* Presets */}
                    <Box sx={{ px: 2, pt: 1, pb: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem' }}>快捷組合</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {PRESETS.map((preset, idx) => (
                                <Chip
                                    key={idx}
                                    label={preset.label}
                                    size="small"
                                    onClick={() => handleApplyPreset(preset.fields)}
                                    color="default"
                                    sx={{ fontSize: '0.7rem', height: 22, bgcolor: 'var(--bg-paper)' }}
                                />
                            ))}
                            <Chip
                                label="清除全部"
                                size="small"
                                onClick={handleClearFields}
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                        </Box>
                    </Box>

                    {/* Tabs */}
                    <Box sx={{ mt: 1, px: 2, borderBottom: '1px solid var(--card-border)' }}>
                        <Tabs value={fieldTab} onChange={(_, val) => setFieldTab(val)} sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, px: 1, fontSize: '0.8rem', py: 0.5 } }}>
                            <Tab label="時資料" />
                            <Tab label="日資料" />
                        </Tabs>
                    </Box>

                    <List dense sx={{ p: 1 }}>
                        {activeCategories.map(cat => {
                            const someSelected = cat.fields.some(f => selectedFields.has(f));
                            const isExpanded = expandedCategory === cat.id;

                            return (
                                <Box key={cat.id} sx={{ mb: 0.5 }}>
                                    {/* Category Header (collapsible) */}
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                                            sx={{ py: 0.25, px: 1, borderRadius: 1, bgcolor: isExpanded ? 'var(--hover-bg)' : 'transparent' }}
                                        >
                                            <ListItemText
                                                primary={cat.label}
                                                primaryTypographyProps={{
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    color: someSelected ? 'var(--primary)' : 'text.primary',
                                                }}
                                            />
                                            {isExpanded ? <ExpandLess fontSize="small" color="action" /> : <ExpandMore fontSize="small" color="action" />}
                                        </ListItemButton>
                                    </ListItem>

                                    {/* Fields list within category */}
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ pl: 1, mt: 0.5 }}>
                                            {(() => {
                                                const uniqueGroups = new Map<string, { displayField: string, group: string | null }>();
                                                const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;

                                                cat.fields.forEach(f => {
                                                    const match = f.match(scalePattern);
                                                    const group = match ? f.replace(scalePattern, '') : null;
                                                    const key = group || f;
                                                    if (!uniqueGroups.has(key)) {
                                                        uniqueGroups.set(key, { displayField: f, group });
                                                    }
                                                });

                                                return Array.from(uniqueGroups.values()).map(({ displayField, group }) => {
                                                    const isSelected = group
                                                        ? cat.fields.some(f => f.startsWith(`${group}_`) && selectedFields.has(f))
                                                        : selectedFields.has(displayField);

                                                    const selectedSpecificField = group
                                                        ? cat.fields.find(f => f.startsWith(`${group}_`) && selectedFields.has(f))
                                                        : displayField;

                                                    const fieldToToggle = isSelected && selectedSpecificField ? selectedSpecificField : displayField;

                                                    const display = WEATHER_FIELD_DISPLAY[group as string] || WEATHER_FIELD_DISPLAY[displayField];
                                                    const heights = group ? availableHeights[group] : undefined;
                                                    const fieldKey = group || displayField;

                                                    return (
                                                        <Box key={fieldKey}>
                                                            <ListItem disablePadding>
                                                                <ListItemButton onClick={() => onFieldToggle(fieldToToggle)} sx={{ py: 0.15, px: 1, borderRadius: 1 }}>
                                                                    <ListItemIcon sx={{ minWidth: 28 }}><Checkbox checked={isSelected} size="small" sx={{ p: 0.5 }} /></ListItemIcon>
                                                                    <ListItemText primary={display?.shortLabel || fieldKey} secondary={display?.unit ? `(${display.unit})` : undefined} primaryTypographyProps={{ fontSize: '0.78rem' }} secondaryTypographyProps={{ fontSize: '0.65rem' }} />
                                                                </ListItemButton>
                                                            </ListItem>

                                                            {isSelected && heights && heights.length > 1 && group && (
                                                                <Box sx={{ pl: 4, pr: 2, pb: 0.5 }}>
                                                                    <FormControl size="small" fullWidth>
                                                                        <Select value={weatherHeightByField[group] || heights[0]} onChange={e => onHeightChange(group, e.target.value)} sx={{ fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                                                            {heights.map(h => <MenuItem key={h} value={h} sx={{ fontSize: '0.72rem' }}>{h}</MenuItem>)}
                                                                        </Select>
                                                                    </FormControl>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    );
                                                });
                                            })()}
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </List>
                </Collapse>
            </Paper>

            {/* End of Unified Sidebar */}
        </Box>
    );
};
