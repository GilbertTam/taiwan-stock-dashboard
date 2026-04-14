'use client';

import React, { useState, useMemo } from 'react';
import {
    Box,
    Paper,
    Chip,
    Typography,
    Divider,
    Popover,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Checkbox,
    Collapse,
    Tabs,
    Tab,
    Select,
    MenuItem,
    FormControl,
} from '@mui/material';
import {
    WbSunny as SunIcon,
    Cloud as CloudIcon,
    ExpandMore,
    ExpandLess,
} from '@mui/icons-material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from 'react-i18next';
import { AreaButtonGroup } from '@/components/selectors/AreaButtonGroup';
import {
    HOURLY_CATEGORIES,
    DAILY_CATEGORIES,
    WEATHER_FIELD_DISPLAY,
} from '@/constants/weatherCategories';
import type { WeatherUnifiedSidebarProps } from './WeatherUnifiedSidebar';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_VISIBLE_CHIPS = 5;

const PRESET_FIELDS = [
    ['temperature_2m', 'precipitation', 'wind_speed_10m'],
    ['temperature_2m', 'relative_humidity_2m'],
    ['temperature_2m_max', 'precipitation_sum', 'sunshine_duration'],
];

type SourceKey = 'actual' | 'forecast';

interface SourceConfig {
    key: SourceKey;
    labelKey: string;
    color: string;
    icon: React.ReactNode;
}

const SOURCES: SourceConfig[] = [
    { key: 'actual',   labelKey: 'sidebar.actualObs',    color: '#ff9800', icon: <SunIcon sx={{ fontSize: 12, color: '#ff7043' }} /> },
    { key: 'forecast', labelKey: 'sidebar.forecastData',  color: '#42a5f5', icon: <CloudIcon sx={{ fontSize: 12, color: '#42a5f5' }} /> },
];

// ─── Helper: Popover section label ───────────────────────────────────────────

function PopoverLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography sx={{
            fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: 'text.secondary',
            px: 1.5, pt: 0.75, pb: 0.25,
        }}>
            {children}
        </Typography>
    );
}

// ─── Helper: Dataset toggle (reused from sidebar pattern) ────────────────────

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
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.5, borderRadius: '3px',
                border: `1px solid ${active ? color : 'var(--card-border)'}`,
                bgcolor: active ? `color-mix(in srgb, ${color}, transparent 85%)` : 'transparent',
                cursor: 'pointer', transition: 'all 0.12s',
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

// ─── Main Component ──────────────────────────────────────────────────────────

export type WeatherControlBarProps = WeatherUnifiedSidebarProps;

export const WeatherControlBar: React.FC<WeatherControlBarProps> = ({
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
    presetSlot,
}) => {
    const { t } = useTranslation(['weather', 'forecast']);

    // ── UI state ─────────────────────────────────────────────────────────────
    const [sourcePopover, setSourcePopover] = useState<{ anchor: HTMLElement; key: SourceKey } | null>(null);
    const [fieldsPopoverAnchor, setFieldsPopoverAnchor] = useState<HTMLElement | null>(null);
    const [fieldTab, setFieldTab] = useState<0 | 1>(0);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // ── Presets for quick field selection ─────────────────────────────────────
    const presets = useMemo(() => [
        { label: t('sidebar.presetCommon'),    fields: PRESET_FIELDS[0] },
        { label: t('sidebar.presetTempHumid'), fields: PRESET_FIELDS[1] },
        { label: t('sidebar.presetDaily'),     fields: PRESET_FIELDS[2] },
    ], [t]);

    const handleApplyPreset = (presetFields: string[]) => {
        const target = new Set(presetFields);
        const current = new Set(selectedFields);
        current.forEach(f => { if (!target.has(f)) onFieldToggle(f); });
        target.forEach(f => { if (!current.has(f)) onFieldToggle(f); });
    };

    const handleClearFields = () => {
        selectedFields.forEach(f => onFieldToggle(f));
    };

    // ── Source chip helpers ───────────────────────────────────────────────────
    function getIsActive(key: SourceKey): boolean {
        return key === 'actual'
            ? (showActualHourly || showActualDaily)
            : (showForecastHourly || showForecastDaily);
    }

    function handleToggle(key: SourceKey) {
        if (key === 'actual') {
            const active = showActualHourly || showActualDaily;
            if (active) {
                onShowActualHourlyChange(false);
                onShowActualDailyChange(false);
            } else {
                onShowActualHourlyChange(true);
            }
        } else {
            const active = showForecastHourly || showForecastDaily;
            if (active) {
                onShowForecastHourlyChange(false);
                onShowForecastDailyChange(false);
            } else {
                onShowForecastHourlyChange(true);
            }
        }
    }

    // ── Selected field labels for inline chips ───────────────────────────────
    const selectedFieldList = useMemo(() => Array.from(selectedFields), [selectedFields]);
    const visibleChips = selectedFieldList.slice(0, MAX_VISIBLE_CHIPS);
    const overflowCount = Math.max(0, selectedFieldList.length - MAX_VISIBLE_CHIPS);

    function getFieldLabel(field: string): string {
        const display = WEATHER_FIELD_DISPLAY[field];
        if (display?.shortLabelKey) {
            return t(`forecast:${display.shortLabelKey}`);
        }
        return field;
    }

    // ── Active categories for fields popover ─────────────────────────────────
    const activeCategories = fieldTab === 0 ? HOURLY_CATEGORIES : DAILY_CATEGORIES;

    // ── Render source popover content ────────────────────────────────────────
    function renderSourcePopover(key: SourceKey) {
        if (key === 'actual') {
            return (
                <Box sx={{ p: 1.5, minWidth: 220 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                        <DatasetToggle label={t('sidebar.hourly')} active={showActualHourly} color="#ffc107" onChange={onShowActualHourlyChange} />
                        <DatasetToggle label={t('sidebar.daily')} active={showActualDaily} color="#ff9800" onChange={onShowActualDailyChange} />
                    </Box>
                    {showActualHourly && (
                        <Box sx={{ mb: 0.75 }}>
                            <PopoverLabel>{t('sidebar.hourlyModel')}</PopoverLabel>
                            <Select size="small" fullWidth value={selectedModelActualHourly || ''} onChange={(e) => onModelActualHourlyChange(e.target.value || null)}
                                sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--background)' }} displayEmpty>
                                <MenuItem value="" sx={{ fontSize: '0.73rem' }}>{t('sidebar.allModels')}</MenuItem>
                                {modelsActualHourly.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                            </Select>
                        </Box>
                    )}
                    {showActualDaily && (
                        <Box>
                            <PopoverLabel>{t('sidebar.dailyModel')}</PopoverLabel>
                            <Select size="small" fullWidth value={selectedModelActualDaily || ''} onChange={(e) => onModelActualDailyChange(e.target.value || null)}
                                sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--background)' }} displayEmpty>
                                <MenuItem value="" sx={{ fontSize: '0.73rem' }}>{t('sidebar.allModels')}</MenuItem>
                                {modelsActualDaily.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                            </Select>
                        </Box>
                    )}
                </Box>
            );
        }
        // forecast
        return (
            <Box sx={{ p: 1.5, minWidth: 220 }}>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                    <DatasetToggle label={t('sidebar.hourly')} active={showForecastHourly} color="#42a5f5" onChange={onShowForecastHourlyChange} />
                    <DatasetToggle label={t('sidebar.daily')} active={showForecastDaily} color="#1976d2" onChange={onShowForecastDailyChange} />
                </Box>
                {showForecastHourly && (
                    <Box sx={{ mb: 0.75 }}>
                        <PopoverLabel>{t('sidebar.hourlyModel')}</PopoverLabel>
                        <Select size="small" fullWidth value={selectedModelForecastHourly || ''} onChange={(e) => onModelForecastHourlyChange(e.target.value || null)}
                            sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--background)' }} displayEmpty>
                            <MenuItem value="" sx={{ fontSize: '0.73rem' }}>{t('sidebar.allModels')}</MenuItem>
                            {modelsForecastHourly.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                        </Select>
                    </Box>
                )}
                {showForecastDaily && (
                    <Box>
                        <PopoverLabel>{t('sidebar.dailyModel')}</PopoverLabel>
                        <Select size="small" fullWidth value={selectedModelForecastDaily || ''} onChange={(e) => onModelForecastDailyChange(e.target.value || null)}
                            sx={{ fontSize: '0.73rem', '& .MuiSelect-select': { py: 0.5 }, bgcolor: 'var(--background)' }} displayEmpty>
                            <MenuItem value="" sx={{ fontSize: '0.73rem' }}>{t('sidebar.allModels')}</MenuItem>
                            {modelsForecastDaily.map(m => <MenuItem key={m.model} value={m.model} sx={{ fontSize: '0.73rem' }}>{m.model}</MenuItem>)}
                        </Select>
                    </Box>
                )}
            </Box>
        );
    }

    // ── Render fields popover content ────────────────────────────────────────
    function renderFieldsPopover() {
        return (
            <Box sx={{ minWidth: 320, maxWidth: 380, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderBottom: '1px solid var(--card-border)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                        {t('sidebar.weatherVariables')} {selectedFields.size > 0 && `(${selectedFields.size})`}
                    </Typography>
                </Box>

                {/* Quick Presets */}
                <Box sx={{ px: 1.5, pt: 1, pb: 0.5, borderBottom: '1px solid var(--card-border)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.68rem' }}>{t('sidebar.quickPresets')}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {presets.map((preset, idx) => (
                            <Chip key={idx} label={preset.label} size="small" onClick={() => handleApplyPreset(preset.fields)} sx={{ fontSize: '0.68rem', height: 22, bgcolor: 'var(--background)' }} />
                        ))}
                        <Chip label={t('sidebar.clear')} size="small" onClick={handleClearFields} variant="outlined" sx={{ fontSize: '0.68rem', height: 22 }} />
                    </Box>
                </Box>

                {/* Hourly / Daily Tabs */}
                <Box sx={{ borderBottom: '1px solid var(--card-border)' }}>
                    <Tabs value={fieldTab} onChange={(_, val) => setFieldTab(val)} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, px: 1.5, fontSize: '0.75rem', py: 0 } }}>
                        <Tab label={t('sidebar.hourlyTab')} />
                        <Tab label={t('sidebar.dailyTab')} />
                    </Tabs>
                </Box>

                {/* Category list */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
                                            <ListItemText primary={t(`forecast:${cat.labelKey}`)} primaryTypographyProps={{ fontSize: '0.78rem', fontWeight: 600, color: someSelected ? 'var(--primary)' : 'text.primary' }} />
                                            {isExpanded ? <ExpandLess fontSize="small" color="action" /> : <ExpandMore fontSize="small" color="action" />}
                                        </ListItemButton>
                                    </ListItem>
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ pl: 1, mt: 0.5 }}>
                                            {renderCategoryFields(cat)}
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </List>
                </Box>
            </Box>
        );
    }

    // ── Render individual category fields (ported from sidebar) ──────────────
    function renderCategoryFields(cat: { id: string; fields: string[] }) {
        const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
        const uniqueGroups = new Map<string, { displayField: string; group: string | null }>();

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
                            <ListItemText
                                primary={display?.shortLabelKey ? t(`forecast:${display.shortLabelKey}`) : fieldKey}
                                secondary={display?.unit ? `(${display.unit})` : undefined}
                                primaryTypographyProps={{ fontSize: '0.78rem' }}
                                secondaryTypographyProps={{ fontSize: '0.65rem' }}
                            />
                        </ListItemButton>
                    </ListItem>
                    {isSelected && heights && heights.length > 1 && group && (
                        <Box sx={{ pl: 4, pr: 2, pb: 0.5 }}>
                            <FormControl size="small" fullWidth>
                                <Select value={weatherHeightByField[group] || heights[0]} onChange={e => onHeightChange(group, e.target.value)}
                                    sx={{ fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}>
                                    {heights.map(h => <MenuItem key={h} value={h} sx={{ fontSize: '0.72rem' }}>{h}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </Box>
            );
        });
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            <Paper
                elevation={0}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    px: 1,
                    py: 0.5,
                    minHeight: 40,
                    border: '1px solid var(--card-border)',
                    bgcolor: 'var(--card-bg)',
                    borderRadius: '1.5px',
                    flexShrink: 0,
                }}
            >
                {/* ── Area ─────────────────────────────────────────────────── */}
                <AreaButtonGroup areas={areas} selectedArea={selectedArea} onAreaChange={onAreaChange} />

                <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

                {/* ── Data Source Chips ─────────────────────────────────────── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {SOURCES.map(({ key, labelKey, color, icon }) => {
                        const isActive = getIsActive(key);
                        return (
                            <Box key={key} sx={{
                                display: 'flex', alignItems: 'stretch',
                                height: 26,
                                border: `1px solid ${isActive ? color : 'var(--card-border)'}`,
                                bgcolor: isActive ? `color-mix(in srgb, ${color}, transparent 85%)` : 'transparent',
                                borderRadius: '3px',
                                overflow: 'hidden',
                                transition: 'border-color 0.12s, background-color 0.12s',
                            }}>
                                {/* Toggle area */}
                                <Box
                                    onClick={() => handleToggle(key)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.5,
                                        px: 0.75,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: `color-mix(in srgb, ${color}, transparent 78%)` },
                                        transition: 'background-color 0.1s',
                                    }}
                                >
                                    {icon}
                                    <Typography sx={{
                                        fontSize: '0.72rem',
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? color : 'var(--text-secondary)',
                                        userSelect: 'none', lineHeight: 1,
                                        transition: 'color 0.12s',
                                    }}>
                                        {t(labelKey)}
                                    </Typography>
                                </Box>

                                {/* Sub-options trigger */}
                                <Box
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSourcePopover({ anchor: e.currentTarget as HTMLElement, key });
                                    }}
                                    sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 18,
                                        borderLeft: `1px solid ${isActive ? `color-mix(in srgb, ${color}, transparent 55%)` : 'var(--card-border)'}`,
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.1s',
                                        '&:hover': {
                                            bgcolor: `color-mix(in srgb, ${color}, transparent 72%)`,
                                            color,
                                        },
                                    }}
                                >
                                    <TuneIcon sx={{ fontSize: '0.72rem' }} />
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

                {/* ── Fields Chip + Inline Selected Chips ──────────────────── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {/* Fields button */}
                    <Box
                        onClick={(e) => setFieldsPopoverAnchor(e.currentTarget)}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                            height: 26, px: 1,
                            border: `1px solid ${selectedFields.size > 0 ? 'var(--primary)' : 'var(--card-border)'}`,
                            bgcolor: selectedFields.size > 0 ? 'rgba(0,204,122,0.08)' : 'transparent',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            transition: 'all 0.12s',
                            '&:hover': { borderColor: 'var(--primary)', bgcolor: 'rgba(0,204,122,0.12)' },
                        }}
                    >
                        <Typography sx={{
                            fontSize: '0.72rem',
                            fontWeight: selectedFields.size > 0 ? 600 : 400,
                            color: selectedFields.size > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                            userSelect: 'none', lineHeight: 1,
                        }}>
                            {t('sidebar.weatherVariables')} ({selectedFields.size})
                        </Typography>
                        <ExpandMore sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} />
                    </Box>

                    {/* Inline selected field chips */}
                    {visibleChips.map(field => (
                        <Chip
                            key={field}
                            size="small"
                            label={getFieldLabel(field)}
                            onDelete={() => onFieldToggle(field)}
                            sx={{
                                height: 22,
                                fontSize: '0.68rem',
                                bgcolor: 'var(--background)',
                                border: '1px solid var(--card-border)',
                                '& .MuiChip-label': { px: 0.75 },
                                '& .MuiChip-deleteIcon': {
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    '&:hover': { color: 'error.main' },
                                },
                            }}
                        />
                    ))}
                    {overflowCount > 0 && (
                        <Typography
                            sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}
                            onClick={(e) => setFieldsPopoverAnchor(e.currentTarget)}
                        >
                            +{overflowCount}
                        </Typography>
                    )}
                </Box>

                {/* ── Presets ───────────────────────────────────────────────── */}
                {presetSlot && (
                    <>
                        <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                        {presetSlot}
                    </>
                )}
            </Paper>

            {/* ── Source sub-options popover ───────────────────────────────── */}
            <Popover
                open={Boolean(sourcePopover)}
                anchorEl={sourcePopover?.anchor}
                onClose={() => setSourcePopover(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: { mt: 0.5, border: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)', borderRadius: '4px' },
                }}
            >
                {sourcePopover && (() => {
                    const src = SOURCES.find(s => s.key === sourcePopover.key)!;
                    return (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderBottom: '1px solid var(--card-border)' }}>
                                {src.icon}
                                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                                    {t(src.labelKey)}
                                </Typography>
                            </Box>
                            {renderSourcePopover(sourcePopover.key)}
                        </>
                    );
                })()}
            </Popover>

            {/* ── Fields popover ───────────────────────────────────────────── */}
            <Popover
                open={Boolean(fieldsPopoverAnchor)}
                anchorEl={fieldsPopoverAnchor}
                onClose={() => setFieldsPopoverAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    elevation: 4,
                    sx: { mt: 0.5, border: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)', borderRadius: '4px' },
                }}
            >
                {renderFieldsPopover()}
            </Popover>
        </>
    );
};
