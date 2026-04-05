'use client';

import React, { useState } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Checkbox,
    Collapse,
    Typography,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
    Chip,
    Tabs,
    Tab,
} from '@mui/material';
import {
    WbSunny as SunIcon,
    Cloud as CloudIcon,
    ExpandMore,
    ExpandLess,
} from '@mui/icons-material';
import { Area } from '@/types';
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

// ─── Compact section label ─────────────────────────────────────────────────────

function SidebarLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="caption" sx={{
            display: 'block',
            px: 1.5, py: 0.5,
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'text.secondary',
            bgcolor: 'var(--hover-bg)',
            borderBottom: '1px solid var(--card-border)',
        }}>
            {children}
        </Typography>
    );
}

// ─── Dataset toggle chip ────────────────────────────────────────────────────────

interface DatasetToggleProps {
    label: string;
    active: boolean;
    color: string;
    onChange: (v: boolean) => void;
}

function DatasetToggle({ label, active, color, onChange }: DatasetToggleProps) {
    return (
        <Box
            onClick={() => onChange(!active)}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: '3px',
                border: `1px solid ${active ? color : 'var(--card-border)'}`,
                bgcolor: active ? `color-mix(in srgb, ${color}, transparent 85%)` : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.12s',
                '&:hover': { bgcolor: `color-mix(in srgb, ${color}, transparent 80%)`, borderColor: color },
            }}
        >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: active ? color : 'var(--card-border)', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: active ? 600 : 400, color: active ? color : 'var(--text-secondary)' }}>
                {label}
            </Typography>
        </Box>
    );
}

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
    const [fieldTab, setFieldTab] = useState<0 | 1>(0);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [fieldsExpanded, setFieldsExpanded] = useState(true);

    const handleApplyPreset = (presetFields: string[]) => {
        const target = new Set(presetFields);
        const current = new Set(selectedFields);
        current.forEach(f => { if (!target.has(f)) onFieldToggle(f); });
        target.forEach(f => { if (!current.has(f)) onFieldToggle(f); });
    };

    const handleClearFields = () => {
        selectedFields.forEach(f => onFieldToggle(f));
    };

    const activeCategories = fieldTab === 0 ? HOURLY_CATEGORIES : DAILY_CATEGORIES;

    const hasActual = showActualHourly || showActualDaily;
    const hasForecast = showForecastHourly || showForecastDaily;

    return (
        <Box sx={{
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'var(--card-bg)',
            borderRight: '1px solid var(--card-border)',
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'var(--card-border)', borderRadius: '2px' },
        }}>

            {/* ── Area (always visible, compact toggle buttons) ── */}
            <SidebarLabel>地區</SidebarLabel>
            <Box sx={{ px: 1, py: 1, borderBottom: '1px solid var(--card-border)' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                    {areas.map(area => {
                        const isSelected = selectedArea === area.name;
                        return (
                            <Box
                                key={area.id}
                                onClick={() => onAreaChange({ target: { value: area.name } } as any)}
                                sx={{
                                    px: 0.75, py: 0.25,
                                    fontSize: '0.75rem',
                                    fontWeight: isSelected ? 700 : 400,
                                    borderRadius: '3px',
                                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--card-border)'}`,
                                    bgcolor: isSelected ? 'rgba(0,204,122,0.12)' : 'transparent',
                                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s',
                                    '&:hover': { borderColor: 'var(--primary)', color: 'var(--primary)' },
                                }}
                            >
                                {area.name_ch}
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* ── Data Sources (always expanded) ── */}
            <SidebarLabel>資料來源</SidebarLabel>

            {/* Actual Section */}
            <Box sx={{ px: 1, pt: 0.75, pb: 0.5, borderBottom: '1px solid var(--card-border)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <SunIcon sx={{ fontSize: 14, color: '#ff7043' }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: hasActual ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        實際觀測
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75 }}>
                    <DatasetToggle label="時" active={showActualHourly} color="#ffc107" onChange={onShowActualHourlyChange} />
                    <DatasetToggle label="日" active={showActualDaily} color="#ff9800" onChange={onShowActualDailyChange} />
                </Box>
                {showActualHourly && (
                    <Box sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>時資料模型</Typography>
                        <Select size="small" fullWidth value={selectedModelActualHourly || ''} onChange={(e) => onModelActualHourlyChange(e.target.value || null)} sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.4 }, bgcolor: 'var(--background)' }} displayEmpty>
                            <MenuItem value="" sx={{ fontSize: '0.73rem' }}>全部</MenuItem>
                            {modelsActualHourly.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                        </Select>
                    </Box>
                )}
                {showActualDaily && (
                    <Box>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>日資料模型</Typography>
                        <Select size="small" fullWidth value={selectedModelActualDaily || ''} onChange={(e) => onModelActualDailyChange(e.target.value || null)} sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.4 }, bgcolor: 'var(--background)' }} displayEmpty>
                            <MenuItem value="" sx={{ fontSize: '0.73rem' }}>全部</MenuItem>
                            {modelsActualDaily.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                        </Select>
                    </Box>
                )}
            </Box>

            {/* Forecast Section */}
            <Box sx={{ px: 1, pt: 0.75, pb: 0.75, borderBottom: '1px solid var(--card-border)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <CloudIcon sx={{ fontSize: 14, color: '#42a5f5' }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: hasForecast ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        預報資料
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75 }}>
                    <DatasetToggle label="時" active={showForecastHourly} color="#42a5f5" onChange={onShowForecastHourlyChange} />
                    <DatasetToggle label="日" active={showForecastDaily} color="#1976d2" onChange={onShowForecastDailyChange} />
                </Box>
                {showForecastHourly && (
                    <Box sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>時資料模型</Typography>
                        <Select size="small" fullWidth value={selectedModelForecastHourly || ''} onChange={(e) => onModelForecastHourlyChange(e.target.value || null)} sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.4 }, bgcolor: 'var(--background)' }} displayEmpty>
                            <MenuItem value="" sx={{ fontSize: '0.73rem' }}>全部</MenuItem>
                            {modelsForecastHourly.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                        </Select>
                    </Box>
                )}
                {showForecastDaily && (
                    <Box>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block', mb: 0.25 }}>日資料模型</Typography>
                        <Select size="small" fullWidth value={selectedModelForecastDaily || ''} onChange={(e) => onModelForecastDailyChange(e.target.value || null)} sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.4 }, bgcolor: 'var(--background)' }} displayEmpty>
                            <MenuItem value="" sx={{ fontSize: '0.73rem' }}>全部</MenuItem>
                            {modelsForecastDaily.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                        </Select>
                    </Box>
                )}
            </Box>

            {/* ── Field Selection (collapsible, secondary) ── */}
            <Box
                onClick={() => setFieldsExpanded(v => !v)}
                sx={{
                    px: 1.5, py: 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    bgcolor: 'var(--hover-bg)',
                    borderBottom: '1px solid var(--card-border)',
                    '&:hover': { bgcolor: 'var(--background)' },
                }}
            >
                <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                    天氣變數 {selectedFields.size > 0 && `(${selectedFields.size})`}
                </Typography>
                <ExpandMore sx={{ fontSize: '1rem', color: 'text.secondary', transform: fieldsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} />
            </Box>

            <Collapse in={fieldsExpanded}>
                {/* Presets */}
                <Box sx={{ px: 1.5, pt: 1, pb: 0.5, borderBottom: '1px solid var(--card-border)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.68rem' }}>快捷組合</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {PRESETS.map((preset, idx) => (
                            <Chip key={idx} label={preset.label} size="small" onClick={() => handleApplyPreset(preset.fields)} sx={{ fontSize: '0.68rem', height: 22, bgcolor: 'var(--background)' }} />
                        ))}
                        <Chip label="清除" size="small" onClick={handleClearFields} variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
                    </Box>
                </Box>

                {/* Tabs */}
                <Box sx={{ borderBottom: '1px solid var(--card-border)' }}>
                    <Tabs value={fieldTab} onChange={(_, val) => setFieldTab(val)} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, px: 1.5, fontSize: '0.75rem', py: 0 } }}>
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
                                <ListItem disablePadding>
                                    <ListItemButton
                                        onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                                        sx={{ py: 0.25, px: 1, borderRadius: 1, bgcolor: isExpanded ? 'var(--hover-bg)' : 'transparent' }}
                                    >
                                        <ListItemText primary={cat.label} primaryTypographyProps={{ fontSize: '0.78rem', fontWeight: 600, color: someSelected ? 'var(--primary)' : 'text.primary' }} />
                                        {isExpanded ? <ExpandLess fontSize="small" color="action" /> : <ExpandMore fontSize="small" color="action" />}
                                    </ListItemButton>
                                </ListItem>
                                <Collapse in={isExpanded}>
                                    <Box sx={{ pl: 1, mt: 0.5 }}>
                                        {(() => {
                                            const uniqueGroups = new Map<string, { displayField: string, group: string | null }>();
                                            const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
                                            cat.fields.forEach(f => {
                                                const match = f.match(scalePattern);
                                                const group = match ? f.replace(scalePattern, '') : null;
                                                const key = group || f;
                                                if (!uniqueGroups.has(key)) uniqueGroups.set(key, { displayField: f, group });
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
        </Box>
    );
};
