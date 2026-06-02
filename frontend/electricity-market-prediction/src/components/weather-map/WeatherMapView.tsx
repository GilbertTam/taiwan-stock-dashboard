'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Chip, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';
import { useVersionedDateSelection } from '@/hooks/useVersionedDateSelection';
import {
    useWeatherFieldByArea,
    GRID_AREA_CODES,
    type GridAreaCode,
    type WeatherDataset,
} from '@/hooks/useWeatherFieldByArea';
import { useDataPresets } from '@/hooks/useDataPresets';
import { PresetSelector } from '@/components/selectors/PresetSelector';
import { WeatherMapPreview } from '@/components/selectors/presetPreviews';
import { getAreaName } from '@/utils/areaI18n';
import { JapanWeatherChoropleth } from './JapanWeatherChoropleth';
import { WindyOverlayPanel, WINDY_OVERLAYS, type WindyOverlayKey } from './WindyOverlayPanel';
import { WeatherTimeSlider } from './WeatherTimeSlider';
import { WeatherMapControlBar } from './WeatherMapControlBar';
import { suggestWindyOverlay } from './fieldRanges';
import { WEATHER_FIELD_DISPLAY } from '@/constants/weatherCategories';
import type { WeatherMapPresetData } from '@/types/presets';

const FORECAST_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

/** Picks the value with timestampMs closest to `target` AND within ±maxAgeMs.
 *  When `dataset === 'daily'` we widen the tolerance to a full day. */
function pickValueAt(
    series: { timestampMs: number; value: number | null }[],
    target: number,
    dataset: WeatherDataset,
): number | null {
    if (series.length === 0) return null;
    const maxAgeMs = dataset === 'daily' ? 26 * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
    let best: { timestampMs: number; value: number | null } | null = null;
    let bestDist = Infinity;
    for (const p of series) {
        const d = Math.abs(p.timestampMs - target);
        if (d < bestDist) {
            bestDist = d;
            best = p;
        }
    }
    if (!best || bestDist > maxAgeMs) return null;
    return best.value;
}

/**
 * Discreet, discoverable explainer for why the left (our regional data) and
 * right (Windy / ECMWF) panels show different values — so side-by-side
 * viewing builds trust instead of inviting "which one is wrong?" doubt.
 * Renders an info chip that reveals the reasons on hover/tap.
 */
function WhyDifferTooltip() {
    const { t } = useTranslation('weatherMap');
    return (
        <Tooltip
            arrow
            enterTouchDelay={0}
            leaveTouchDelay={8000}
            title={
                <Box sx={{ py: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, mb: 0.5 }}>
                        {t('whyDiffer.title')}
                    </Typography>
                    <Typography sx={{ fontSize: '0.76rem', mb: 0.75, opacity: 0.9 }}>
                        {t('whyDiffer.intro')}
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {(['source', 'resolution', 'time'] as const).map((k) => (
                            <Typography key={k} component="li" sx={{ fontSize: '0.76rem', lineHeight: 1.5 }}>
                                {t(`whyDiffer.${k}`)}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            }
        >
            <Box
                role="button"
                tabIndex={0}
                sx={{
                    ml: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                    px: 0.75,
                    height: 22,
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    border: '1px dashed',
                    borderColor: 'var(--card-border)',
                    borderRadius: '4px',
                    cursor: 'help',
                    whiteSpace: 'nowrap',
                    '&:hover': { color: 'text.primary', borderColor: 'text.secondary' },
                }}
            >
                <InfoOutlinedIcon sx={{ fontSize: '0.95rem' }} />
                {t('whyDiffer.trigger')}
            </Box>
        </Tooltip>
    );
}

export function WeatherMapView() {
    const { t } = useTranslation(['weatherMap', 'common']);

    // Default range ends at tomorrow globally — see `buildPresetDates` in
    // useVersionedDateSelection. '1D' here means today + tomorrow.
    const { selection, commit, applyPreset } = useVersionedDateSelection({ initialPreset: '1D' });

    const handleDateRangePreset = (preset: string | null) => {
        if (preset) applyPreset(preset);
    };

    // Map controls
    const [dataset, setDataset] = useState<WeatherDataset>('hourly');
    const [field, setField] = useState<string>('cloud_cover');
    const [overlay, setOverlay] = useState<WindyOverlayKey>('clouds');
    /** True after the user manually overrides Windy overlay; from then on,
     *  changing the map field will NOT auto-switch overlay. Reset on next
     *  field-driven switch the user accepts via the sync hint. */
    const [overlayManuallyOverridden, setOverlayManuallyOverridden] = useState(false);

    const handleFieldChange = (next: string) => {
        setField(next);
        if (overlayManuallyOverridden) return;
        const suggested = suggestWindyOverlay(next);
        if (suggested && WINDY_OVERLAYS.includes(suggested as WindyOverlayKey)) {
            setOverlay(suggested as WindyOverlayKey);
        }
    };

    const handleOverlayChange = (next: WindyOverlayKey) => {
        setOverlay(next);
        // If user manually clicks the sync hint chip (next === suggestion),
        // treat it as "back in sync" rather than an override.
        const suggested = suggestWindyOverlay(field);
        setOverlayManuallyOverridden(suggested !== next);
    };

    // When the user switches dataset, reset to a sensible default field for
    // that dataset so we don't query e.g. 'cloud_cover' on the daily endpoint.
    const handleDatasetChange = (d: WeatherDataset) => {
        setDataset(d);
        if (d === 'daily' && !field.endsWith('_sum') && !field.endsWith('_mean') && !field.endsWith('_max') && !field.endsWith('_min')) {
            handleFieldChange('temperature_2m_mean');
        } else if (d === 'hourly' && (field.endsWith('_sum') || field.endsWith('_mean') || field.endsWith('_max') || field.endsWith('_min'))) {
            handleFieldChange('cloud_cover');
        }
    };

    // Derive Windy props from current field
    const suggestedOverlay = useMemo<WindyOverlayKey | null>(() => {
        const s = suggestWindyOverlay(field);
        return s && WINDY_OVERLAYS.includes(s as WindyOverlayKey) ? (s as WindyOverlayKey) : null;
    }, [field]);

    const fieldWithoutWindyEquivalent = useMemo<string | null>(() => {
        if (suggestedOverlay) return null;
        const display = WEATHER_FIELD_DISPLAY[field];
        const labelKey = display?.shortLabelKey;
        const label = labelKey ? t(`forecast:${labelKey}`) : field;
        return label && label !== labelKey ? label : field;
    }, [field, suggestedOverlay, t]);

    // ── Presets (server-side, per-user) ──────────────────────────────────────
    const {
        presets: weatherMapPresets,
        isLoading: presetsLoading,
        defaultPreset: weatherMapDefaultPreset,
        savePreset: saveWeatherMapPreset,
        updatePresetData: updateWeatherMapPresetData,
        renamePreset: renameWeatherMapPreset,
        deletePreset: deleteWeatherMapPreset,
        setAsDefault: setWeatherMapAsDefault,
    } = useDataPresets<WeatherMapPresetData>('weather-map');

    const captureState = useCallback((): WeatherMapPresetData => ({
        dataset,
        field,
        windyOverlay: overlay,
    }), [dataset, field, overlay]);

    const applyState = useCallback((data: WeatherMapPresetData) => {
        if (data.dataset && data.dataset !== dataset) setDataset(data.dataset);
        if (data.field && data.field !== field) setField(data.field);
        if (data.windyOverlay && WINDY_OVERLAYS.includes(data.windyOverlay as WindyOverlayKey)) {
            setOverlay(data.windyOverlay as WindyOverlayKey);
            // Reset manual-override flag based on whether the saved overlay
            // matches the saved field's suggestion.
            const suggested = suggestWindyOverlay(data.field);
            setOverlayManuallyOverridden(suggested !== data.windyOverlay);
        }
    }, [dataset, field]);

    // Apply default preset on first mount.
    const didApplyDefaultPreset = useRef(false);
    useEffect(() => {
        if (didApplyDefaultPreset.current || !weatherMapDefaultPreset) return;
        applyState(weatherMapDefaultPreset.data);
        didApplyDefaultPreset.current = true;
    }, [weatherMapDefaultPreset, applyState]);

    const {
        seriesByArea, timeline, failedAreas, isReady, isFetching, error,
    } = useWeatherFieldByArea({
        startDate: selection.startDate,
        endDate: selection.endDate,
        dataset,
        field,
    });

    // Slider position. Defaults to (now + 24h) so the user lands on tomorrow's
    // forecast at the same hour. Re-snaps whenever the timeline changes.
    const [selectedTs, setSelectedTs] = useState<number | null>(null);

    useEffect(() => {
        if (timeline.length === 0) {
            setSelectedTs(null);
            return;
        }
        const target = Date.now() + FORECAST_LOOKAHEAD_MS;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < timeline.length; i++) {
            const d = Math.abs(timeline[i] - target);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        setSelectedTs(timeline[bestIdx]);
    }, [timeline]);

    const valuesByArea = useMemo<Partial<Record<GridAreaCode, number | null>>>(() => {
        if (selectedTs == null) return {};
        const out: Partial<Record<GridAreaCode, number | null>> = {};
        for (const code of GRID_AREA_CODES) {
            out[code] = pickValueAt(seriesByArea[code], selectedTs, dataset);
        }
        return out;
    }, [seriesByArea, selectedTs, dataset]);

    const [showWarning, setShowWarning] = useState(false);
    useEffect(() => {
        setShowWarning(failedAreas.length > 0);
    }, [failedAreas]);

    const failedAreaNames = useMemo(
        () => failedAreas.map((c) => getAreaName(t, c)).join('、'),
        [failedAreas, t],
    );

    return (
        <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {isFetching && <LoadingOverlay />}

            <Snackbar
                open={showWarning}
                autoHideDuration={6000}
                onClose={() => setShowWarning(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setShowWarning(false)} severity="warning" sx={{ width: '100%' }}>
                    {t('weatherMap:fetchError', { areas: failedAreaNames })}
                </Alert>
            </Snackbar>

            <DashboardToolbar
                variant="full"
                startDate={selection.startDate}
                endDate={selection.endDate}
                dateRangePreset={selection.preset}
                onDateChange={commit}
                onDateRangePreset={handleDateRangePreset}
                isLoading={isFetching}
            />

            <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('weatherMap:title')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('weatherMap:subtitle')}</Typography>
            </Box>

            <WeatherMapControlBar
                dataset={dataset}
                onDatasetChange={handleDatasetChange}
                field={field}
                onFieldChange={handleFieldChange}
                presetSlot={
                    <PresetSelector
                        presets={weatherMapPresets}
                        isLoading={presetsLoading}
                        defaultPresetId={weatherMapDefaultPreset?.id ?? null}
                        onSave={(name) => saveWeatherMapPreset(name, captureState())}
                        onLoad={(preset) => applyState(preset.data as WeatherMapPresetData)}
                        onUpdate={(id) => updateWeatherMapPresetData(id, captureState())}
                        onDelete={deleteWeatherMapPreset}
                        onRename={renameWeatherMapPreset}
                        onSetDefault={setWeatherMapAsDefault}
                        renderPreview={(data) => <WeatherMapPreview data={data as WeatherMapPresetData} />}
                    />
                }
            />

            <Box
                sx={{
                    flexShrink: 0,
                    borderTop: '1px solid var(--card-border)',
                    borderBottom: '1px solid var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                }}
            >
                <WeatherTimeSlider
                    timeline={timeline}
                    value={selectedTs}
                    onChange={setSelectedTs}
                    dataset={dataset}
                    disabled={isFetching || !isReady}
                />
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: { md: '1px solid var(--card-border)' },
                        borderBottom: { xs: '1px solid var(--card-border)', md: 'none' },
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1, borderBottom: '1px solid var(--card-border)', flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {t('weatherMap:leftPanelTitle')}
                        </Typography>
                        <Chip
                            size="small"
                            variant="outlined"
                            label={t('weatherMap:leftPanelSource')}
                            sx={{ height: 20, fontSize: '0.68rem', '& .MuiChip-label': { px: 0.75 } }}
                        />
                        <WhyDifferTooltip />
                    </Stack>
                    <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                        {error ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="error">{error}</Typography>
                            </Box>
                        ) : timeline.length === 0 && isReady ? (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">{t('weatherMap:noData')}</Typography>
                            </Box>
                        ) : (
                            <JapanWeatherChoropleth
                                valuesByArea={valuesByArea}
                                field={field}
                                failedAreas={failedAreas}
                            />
                        )}
                    </Box>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1, borderBottom: '1px solid var(--card-border)', flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {t('weatherMap:rightPanelTitle')}
                        </Typography>
                        <Chip
                            size="small"
                            variant="outlined"
                            label={t('weatherMap:rightPanelSource')}
                            sx={{ height: 20, fontSize: '0.68rem', color: 'var(--secondary)', borderColor: 'var(--secondary)', '& .MuiChip-label': { px: 0.75 } }}
                        />
                    </Stack>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <WindyOverlayPanel
                            overlay={overlay}
                            onOverlayChange={handleOverlayChange}
                            timestampMs={selectedTs}
                            suggestedOverlay={suggestedOverlay}
                            fieldWithoutWindyEquivalent={fieldWithoutWindyEquivalent}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
