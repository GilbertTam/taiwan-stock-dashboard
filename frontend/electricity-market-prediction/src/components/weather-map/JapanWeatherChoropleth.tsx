'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { MapChart } from 'echarts/charts';
import { TooltipComponent, VisualMapComponent, TitleComponent, GeoComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/ThemeProvider';
import { getAreaName } from '@/utils/areaI18n';
import { WEATHER_FIELD_DISPLAY } from '@/constants/weatherCategories';
import type { GridAreaCode } from '@/hooks/useWeatherFieldByArea';
import { resolveFieldRange } from './fieldRanges';

echarts.use([MapChart, TooltipComponent, VisualMapComponent, TitleComponent, GeoComponent, CanvasRenderer]);

const MAP_NAME = 'japan-grid';
const GEOJSON_URL = '/maps/japan-grid-regions.geojson';

interface JapanGeoFeature {
    type: 'Feature';
    properties: { area_code: GridAreaCode; name_en: string; name_ja: string };
    geometry: { type: string; coordinates: unknown };
}

interface JapanGeoJson {
    type: 'FeatureCollection';
    features: JapanGeoFeature[];
}

let mapRegistered = false;
let geoJsonCache: JapanGeoJson | null = null;

async function loadAndRegisterMap(): Promise<JapanGeoJson> {
    if (geoJsonCache) {
        if (!mapRegistered) {
            echarts.registerMap(MAP_NAME, geoJsonCache as unknown as Parameters<typeof echarts.registerMap>[1]);
            mapRegistered = true;
        }
        return geoJsonCache;
    }
    const res = await fetch(GEOJSON_URL);
    if (!res.ok) throw new Error(`Failed to load ${GEOJSON_URL}: ${res.status}`);
    const json = (await res.json()) as JapanGeoJson;
    geoJsonCache = json;
    echarts.registerMap(MAP_NAME, json as unknown as Parameters<typeof echarts.registerMap>[1]);
    mapRegistered = true;
    return json;
}

export interface JapanWeatherChoroplethProps {
    /** Numeric value per area at the currently selected timestamp (null when missing) */
    valuesByArea: Partial<Record<GridAreaCode, number | null>>;
    /** Field name (key into WEATHER_FIELD_DISPLAY and FIELD_RANGES) */
    field: string;
    /** Area codes that completely failed to fetch — rendered with a "no data" pattern */
    failedAreas?: GridAreaCode[];
    onAreaClick?: (areaCode: GridAreaCode) => void;
    onAreaHover?: (areaCode: GridAreaCode | null) => void;
}

export function JapanWeatherChoropleth({
    valuesByArea,
    field,
    failedAreas = [],
    onAreaClick,
    onAreaHover,
}: JapanWeatherChoroplethProps) {
    const { t } = useTranslation(['weatherMap', 'forecast', 'common']);
    const { darkMode } = useTheme();
    const [mapReady, setMapReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadAndRegisterMap()
            .then(() => { if (!cancelled) setMapReady(true); })
            .catch((e: Error) => { if (!cancelled) setLoadError(e.message); });
        return () => { cancelled = true; };
    }, []);

    const display = WEATHER_FIELD_DISPLAY[field];
    const fieldLabelKey = display?.shortLabelKey;
    const fieldLongLabelKey = display?.longLabelKey;
    const unit = display?.unit ?? '';

    const fieldLongLabel = fieldLongLabelKey ? t(`forecast:${fieldLongLabelKey}`) : field;
    const fieldShortLabel = fieldLabelKey ? t(`forecast:${fieldLabelKey}`) : field;

    const range = useMemo(
        () => resolveFieldRange(field, Object.values(valuesByArea)),
        [field, valuesByArea],
    );

    const option = useMemo<EChartsOption>(() => {
        const failedSet = new Set(failedAreas);
        const data = (Object.keys(valuesByArea) as GridAreaCode[]).map((code) => {
            const value = valuesByArea[code];
            return {
                name: code,
                value: value ?? NaN,
                _areaCode: code,
                _localizedName: getAreaName(t, code),
                _failed: failedSet.has(code),
            };
        });

        const textColor = darkMode ? '#e6e6e6' : '#1f1f1f';
        const subTextColor = darkMode ? '#9ca3af' : '#4b5563';
        const borderColor = darkMode ? '#374151' : '#cbd5e1';

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: darkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.96)',
                borderColor,
                textStyle: { color: textColor, fontSize: 12 },
                formatter: (params: unknown) => {
                    const p = params as { name: string; value: number; data?: { _failed?: boolean; _localizedName?: string } };
                    const failed = p.data?._failed;
                    const v = p.value;
                    const displayName = p.data?._localizedName ?? p.name;
                    const valStr = failed || v == null || Number.isNaN(v)
                        ? t('weatherMap:tooltip.noData')
                        : `${v.toFixed(2)}${unit ? ' ' + unit : ''}`;
                    return `
                        <div style="font-weight:600;margin-bottom:4px;">${displayName}</div>
                        <div style="color:${subTextColor};font-size:11px;">
                            ${fieldShortLabel}:
                            <span style="color:${textColor};font-weight:600;">${valStr}</span>
                        </div>
                    `;
                },
            },
            visualMap: {
                left: 12,
                bottom: 12,
                min: range.min,
                max: range.max,
                calculable: true,
                orient: 'vertical',
                itemHeight: 110,
                itemWidth: 14,
                inRange: { color: range.colors },
                outOfRange: { color: ['#444'] },
                text: [t('weatherMap:legend.high'), t('weatherMap:legend.low')],
                textStyle: { color: subTextColor, fontSize: 11 },
            },
            series: [
                {
                    name: fieldLongLabel as string,
                    type: 'map',
                    map: MAP_NAME,
                    roam: false,
                    nameProperty: 'area_code',
                    aspectScale: 0.85,
                    zoom: 1.1,
                    label: {
                        show: true,
                        fontSize: 10,
                        color: textColor,
                        formatter: (params) => {
                            const d = (params as { name: string; data?: { _localizedName?: string } | null }).data;
                            return d?._localizedName ?? (params as { name: string }).name;
                        },
                    },
                    itemStyle: {
                        borderColor,
                        borderWidth: 0.8,
                        areaColor: darkMode ? '#1f2937' : '#f3f4f6',
                    },
                    emphasis: {
                        label: { fontSize: 12, fontWeight: 700, color: textColor },
                        itemStyle: { borderColor: darkMode ? '#fff' : '#111', borderWidth: 1.5 },
                    },
                    select: { disabled: true },
                    data,
                },
            ],
        };
    }, [valuesByArea, failedAreas, darkMode, t, unit, fieldLongLabel, fieldShortLabel, range]);

    const onEvents = useMemo(() => ({
        click: (params: unknown) => {
            const p = params as { data?: { _areaCode?: GridAreaCode } };
            if (p?.data?._areaCode && onAreaClick) onAreaClick(p.data._areaCode);
        },
        mouseover: (params: unknown) => {
            const p = params as { data?: { _areaCode?: GridAreaCode } };
            if (p?.data?._areaCode && onAreaHover) onAreaHover(p.data._areaCode);
        },
        mouseout: () => { if (onAreaHover) onAreaHover(null); },
    }), [onAreaClick, onAreaHover]);

    if (loadError) {
        return (
            <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
                <Typography variant="body2">{loadError}</Typography>
            </Box>
        );
    }

    if (!mapReady) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherMap:loading')}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', minHeight: 320 }}>
            <ReactECharts
                option={option}
                style={{ width: '100%', height: '100%' }}
                onEvents={onEvents}
                opts={{ renderer: 'canvas' }}
                notMerge
            />
        </Box>
    );
}
