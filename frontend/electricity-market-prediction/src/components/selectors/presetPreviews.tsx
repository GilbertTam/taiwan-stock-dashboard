'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getAreaName } from '@/utils/areaI18n';
import { WEATHER_FIELD_DISPLAY } from '@/constants/weatherCategories';
import {
    occtoStackedFields,
    INTERCONNECTION_FIELDS,
    BATTERY_FIELDS,
    BID_PLAN_BASE_FIELDS,
    TDGC_FIELDS,
    TDGC_CATEGORIES,
    weatherFields as forecastWeatherFields,
} from '@/components/price-chart/constants';
import type { ForecastPresetData, WeatherPresetData, DailyComparePresetData, WeatherMapPresetData } from '@/types/presets';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.4 }}>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', minWidth: 40, flexShrink: 0, lineHeight: '18px' }}>
                {label}
            </Typography>
            <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '2px', alignItems: 'center' }}>
                {children}
            </Box>
        </Box>
    );
}

function TagChip({ label, active = true, color }: { label: string; active?: boolean; color?: string }) {
    return (
        <Box sx={{
            display: 'inline-flex',
            px: 0.5, py: 0.1,
            fontSize: '0.6rem',
            fontWeight: active ? 600 : 400,
            borderRadius: '2px',
            bgcolor: active ? (color ? `${color}20` : 'rgba(0,204,122,0.12)') : 'var(--background)',
            color: active ? (color ?? 'var(--primary)') : 'var(--text-secondary)',
            border: `1px solid ${active ? (color ? `${color}40` : 'rgba(0,204,122,0.25)') : 'var(--card-border)'}`,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
        }}>
            {label}
        </Box>
    );
}

// ─── Daily-Compare Preview ───────────────────────────────────────────────────

export function DailyComparePreview({ data }: { data: DailyComparePresetData }) {
    const { t } = useTranslation(['dailyCompare', 'common']);

    return (
        <Box>
            <PreviewRow label={t('common:presets.previewMetric')}>
                <TagChip label={t(`dailyCompare:metrics.${data.selectedMetric}`, { defaultValue: data.selectedMetric })} />
            </PreviewRow>
            <PreviewRow label={t('common:presets.previewAreas')}>
                {data.selectedAreas.map(area => (
                    <TagChip key={area} label={getAreaName(t, area)} />
                ))}
            </PreviewRow>
        </Box>
    );
}

// ─── Weather-Map Preview ─────────────────────────────────────────────────────

export function WeatherMapPreview({ data }: { data: WeatherMapPresetData }) {
    const { t } = useTranslation(['weatherMap', 'forecast', 'common']);

    const fieldDisplay = WEATHER_FIELD_DISPLAY[data.field];
    const fieldLabel = fieldDisplay?.shortLabelKey
        ? t(`forecast:${fieldDisplay.shortLabelKey}`, { defaultValue: data.field })
        : data.field;
    const unit = fieldDisplay?.unit;

    const overlayLabel = t(`weatherMap:windyOverlay.${data.windyOverlay}`, { defaultValue: data.windyOverlay });
    const datasetLabel = t(`weatherMap:dataset.${data.dataset}`);

    return (
        <Box>
            <PreviewRow label={t('weatherMap:dataset.label')}>
                <TagChip label={datasetLabel} />
            </PreviewRow>
            <PreviewRow label={t('weatherMap:fieldPicker.label')}>
                <TagChip label={unit ? `${fieldLabel} (${unit})` : fieldLabel} />
            </PreviewRow>
            <PreviewRow label={t('weatherMap:windyOverlay.label')}>
                <TagChip label={overlayLabel} />
            </PreviewRow>
        </Box>
    );
}

// ─── Weather Preview ─────────────────────────────────────────────────────────

export function WeatherPreview({ data }: { data: WeatherPresetData }) {
    const { t } = useTranslation(['weather', 'forecast', 'common']);

    const sources: string[] = [];
    if (data.showActualHourly) sources.push(t('weather:sidebar.actualObs') + ' H');
    if (data.showActualDaily) sources.push(t('weather:sidebar.actualObs') + ' D');
    if (data.showForecastHourly) sources.push(t('weather:sidebar.forecastData') + ' H');
    if (data.showForecastDaily) sources.push(t('weather:sidebar.forecastData') + ' D');

    const models: string[] = [];
    [data.selectedModelActualHourly, data.selectedModelActualDaily,
     data.selectedModelForecastHourly, data.selectedModelForecastDaily].forEach(m => {
        if (m && !models.includes(m)) models.push(m);
    });

    // Translate field names using WEATHER_FIELD_DISPLAY (forecast namespace)
    const translatedFields = (data.selectedFields ?? []).map(field => {
        const display = WEATHER_FIELD_DISPLAY[field];
        if (display) return t(`forecast:${display.shortLabelKey}`, { defaultValue: field });
        return field;
    });

    return (
        <Box>
            <PreviewRow label={t('common:presets.previewSources')}>
                {sources.length > 0
                    ? sources.map(s => <TagChip key={s} label={s} />)
                    : <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>—</Typography>
                }
            </PreviewRow>
            {models.length > 0 && (
                <PreviewRow label={t('common:presets.previewModels')}>
                    {models.map(m => <TagChip key={m} label={m} />)}
                </PreviewRow>
            )}
            <PreviewRow label={t('common:presets.previewFields')}>
                {translatedFields.length > 0
                    ? translatedFields.map(f => <TagChip key={f} label={f} />)
                    : <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>—</Typography>
                }
            </PreviewRow>
        </Box>
    );
}

// ─── Forecast Preview ────────────────────────────────────────────────────────

export function ForecastPreview({ data }: { data: ForecastPresetData }) {
    const { t } = useTranslation(['forecast', 'common']);

    // Active data layers with translated labels
    const layers: Array<{ label: string; color: string }> = [];
    if (data.showActualPrice) layers.push({ label: t('forecast:controlBar.spotActual'), color: '#ef5350' });
    if (data.showIntraday || data.showIntradayAverage) layers.push({ label: t('forecast:controlBar.intradayMarket'), color: '#9c27b0' });
    if (data.showImbalance) layers.push({ label: t('forecast:controlBar.imbalance'), color: '#8884d8' });
    if (data.showWeather) layers.push({ label: t('forecast:controlBar.weather'), color: '#2196f3' });
    if (data.showOcctoArea) layers.push({ label: t('forecast:controlBar.occto'), color: '#009688' });
    if (data.selectedTdgcFields?.length) layers.push({ label: t('forecast:controlBar.tdgc'), color: '#8e24aa' });

    // Translate field names for each category
    const resolveFields = (
        keys: string[],
        defs: Array<{ key?: string; value?: string; labelKey: string }>,
    ): string[] => keys.map(k => {
        const def = defs.find(d => (d.key ?? d.value) === k);
        return def ? t(`forecast:${def.labelKey}`, { defaultValue: k }) : k;
    });

    const fieldGroups: Array<{ label: string; items: string[] }> = [];

    if (data.selectedInterconnectionFields?.length) {
        fieldGroups.push({
            label: t('forecast:controlBar.interconnection'),
            items: resolveFields(data.selectedInterconnectionFields, INTERCONNECTION_FIELDS),
        });
    }
    if (data.selectedBatteryFields?.length) {
        fieldGroups.push({
            label: t('forecast:controlBar.battery'),
            items: resolveFields(data.selectedBatteryFields, BATTERY_FIELDS),
        });
    }
    if (data.selectedBidPlanFields?.length) {
        fieldGroups.push({
            label: t('forecast:controlBar.bidPlans'),
            items: resolveFields(data.selectedBidPlanFields, BID_PLAN_BASE_FIELDS),
        });
    }
    if (data.selectedOcctoFields?.length) {
        fieldGroups.push({
            label: t('forecast:controlBar.occto'),
            items: resolveFields(data.selectedOcctoFields, occtoStackedFields),
        });
    }
    if (data.selectedWeatherFieldsActual?.length) {
        fieldGroups.push({
            label: t('forecast:controlBar.weather') + ' (A)',
            items: resolveFields(data.selectedWeatherFieldsActual, forecastWeatherFields),
        });
    }
    if (data.selectedWeatherFieldsForecast?.length) {
        fieldGroups.push({
            label: t('forecast:controlBar.weather') + ' (F)',
            items: resolveFields(data.selectedWeatherFieldsForecast, forecastWeatherFields),
        });
    }
    if (data.selectedTdgcFields?.length) {
        const catLabels = (data.selectedTdgcCategories ?? [])
            .map(cat => {
                const cfg = TDGC_CATEGORIES[cat];
                return cfg ? t(`forecast:${cfg.labelKey}`) : cat;
            })
            .join(', ');
        fieldGroups.push({
            label: catLabels
                ? `${t('forecast:controlBar.tdgc')} (${catLabels})`
                : t('forecast:controlBar.tdgc'),
            items: resolveFields(data.selectedTdgcFields, TDGC_FIELDS),
        });
    }

    return (
        <Box>
            <PreviewRow label={t('common:presets.previewLayers')}>
                {layers.length > 0
                    ? layers.map(l => <TagChip key={l.label} label={l.label} color={l.color} />)
                    : <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>—</Typography>
                }
            </PreviewRow>
            {data.selectedModels?.length > 0 && (
                <PreviewRow label={t('common:presets.previewModels')}>
                    {data.selectedModels.map(m => (
                        <TagChip key={`${m.id}|${m.name}`} label={m.name} color={m.color} />
                    ))}
                </PreviewRow>
            )}
            {fieldGroups.map(group => (
                <PreviewRow key={group.label} label={group.label}>
                    {group.items.map(item => <TagChip key={item} label={item} />)}
                </PreviewRow>
            ))}
        </Box>
    );
}
