'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, MenuItem, Select, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';

const WINDY_BASE = 'https://embed.windy.com/embed2.html';

export const WINDY_OVERLAYS = ['clouds', 'temp', 'rain', 'wind', 'rh', 'pressure', 'gust', 'snow'] as const;
export type WindyOverlayKey = typeof WINDY_OVERLAYS[number];

/** ms to wait after the timestamp prop stops changing before remounting Windy.
 *  Keeps the iframe stable during rapid slider scrubbing and auto-play ticks. */
const TIME_DEBOUNCE_MS = 1500;

export interface WindyOverlayPanelProps {
    overlay: WindyOverlayKey;
    onOverlayChange: (overlay: WindyOverlayKey) => void;
    /** Currently-selected JST timestamp (epoch ms). Translated into a Windy
     *  `calendar=<hourOffset>` param when remounting the iframe. */
    timestampMs: number | null;
    /** Suggested overlay derived from the choropleth's selected field. When set
     *  and different from `overlay`, a "Sync to {suggestion}?" hint appears. */
    suggestedOverlay?: WindyOverlayKey | null;
    /** Label for the field that has no Windy equivalent — when set, show a
     *  small "no matching layer" notice instead of a sync suggestion. */
    fieldWithoutWindyEquivalent?: string | null;
    centerLat?: number;
    centerLon?: number;
    zoom?: number;
}

/** Windy embed2 accepts `calendar` as an integer hour offset from wall-clock
 *  now (positive = forecast hours into the future, negative = hours into the
 *  past). It does NOT accept unix timestamps. ECMWF's forecast window is ~240h
 *  forward and free past data is up to 24h back, so we clamp accordingly. */
const WINDY_PAST_HOURS_LIMIT = 24;
const WINDY_FORECAST_HOURS_LIMIT = 240;

function timestampToHourOffset(timestampMs: number, nowMs: number): number {
    const raw = Math.round((timestampMs - nowMs) / 3_600_000);
    return Math.max(-WINDY_PAST_HOURS_LIMIT, Math.min(WINDY_FORECAST_HOURS_LIMIT, raw));
}

function buildWindyUrl(
    overlay: WindyOverlayKey,
    timestampMs: number | null,
    lat: number,
    lon: number,
    zoom: number,
): string {
    const calendar = timestampMs != null
        ? String(timestampToHourOffset(timestampMs, Date.now()))
        : 'now';
    const params = new URLSearchParams({
        lat: lat.toFixed(3),
        lon: lon.toFixed(3),
        detailLat: lat.toFixed(3),
        detailLon: lon.toFixed(3),
        zoom: String(zoom),
        level: 'surface',
        overlay,
        product: 'ecmwf',
        menu: '',
        message: 'true',
        marker: '',
        calendar,
        pressure: '',
        type: 'map',
        location: 'coordinates',
        detail: '',
        metricWind: 'default',
        metricTemp: 'default',
        radarRange: '-1',
    });
    return `${WINDY_BASE}?${params.toString()}`;
}

/**
 * Embed Windy with a chosen overlay and a debounced timestamp. The iframe
 * remounts whenever the *committed* (debounced) timestamp or overlay changes
 * — never on every slider tick — so the user doesn't see a grey reload during
 * scrubbing or auto-play.
 */
export function WindyOverlayPanel({
    overlay,
    onOverlayChange,
    timestampMs,
    suggestedOverlay,
    fieldWithoutWindyEquivalent,
    centerLat = 36.5,
    centerLon = 138.0,
    zoom = 5,
}: WindyOverlayPanelProps) {
    const { t } = useTranslation('weatherMap');

    // Debounced ("committed") timestamp drives the iframe key.
    const [committedTs, setCommittedTs] = useState<number | null>(timestampMs);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setCommittedTs(timestampMs);
            debounceTimer.current = null;
        }, TIME_DEBOUNCE_MS);
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
        };
    }, [timestampMs]);

    const url = useMemo(
        () => buildWindyUrl(overlay, committedTs, centerLat, centerLon, zoom),
        [overlay, committedTs, centerLat, centerLon, zoom],
    );

    const showSyncHint = suggestedOverlay != null && suggestedOverlay !== overlay;
    const showNoMatchHint = !showSyncHint && fieldWithoutWindyEquivalent != null;

    return (
        <Box sx={{ width: '100%', height: '100%', minHeight: 320, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ px: 1.5, py: 0.5, borderBottom: '1px solid var(--card-border)', bgcolor: 'var(--card-bg)', flexWrap: 'wrap' }}
            >
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                    {t('windyOverlay.label')}
                </Typography>
                <Select
                    size="small"
                    value={overlay}
                    onChange={(e) => onOverlayChange(e.target.value as WindyOverlayKey)}
                    sx={{ fontSize: '0.78rem', '& .MuiSelect-select': { py: 0.4 }, bgcolor: 'var(--background)', minWidth: 130 }}
                >
                    {WINDY_OVERLAYS.map((k) => (
                        <MenuItem key={k} value={k} sx={{ fontSize: '0.78rem' }}>
                            {t(`windyOverlay.${k}`)}
                        </MenuItem>
                    ))}
                </Select>

                {showSyncHint && (
                    <Tooltip title={t('windyOverlay.syncHintTooltip', { overlay: t(`windyOverlay.${suggestedOverlay}`) })}>
                        <Box
                            onClick={() => onOverlayChange(suggestedOverlay)}
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.4,
                                px: 0.75,
                                height: 22,
                                fontSize: '0.65rem',
                                border: '1px solid rgba(0,204,122,0.4)',
                                bgcolor: 'rgba(0,204,122,0.08)',
                                color: 'var(--primary)',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(0,204,122,0.16)' },
                            }}
                        >
                            <InfoOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                            {t('windyOverlay.syncHint', { overlay: t(`windyOverlay.${suggestedOverlay}`) })}
                        </Box>
                    </Tooltip>
                )}

                {showNoMatchHint && (
                    <Tooltip title={t('windyOverlay.noMatchTooltip', { field: fieldWithoutWindyEquivalent })}>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.4,
                                px: 0.75,
                                height: 22,
                                fontSize: '0.65rem',
                                border: '1px dashed var(--card-border)',
                                color: 'text.secondary',
                                borderRadius: '3px',
                            }}
                        >
                            <InfoOutlinedIcon sx={{ fontSize: '0.85rem' }} />
                            {t('windyOverlay.noMatch')}
                        </Box>
                    </Tooltip>
                )}
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <iframe
                    key={`${overlay}__${committedTs ?? 'now'}`}
                    src={url}
                    title={`Windy ${overlay}`}
                    style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </Box>

            <Typography
                variant="caption"
                sx={{ px: 1, py: 0.5, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'right', flexShrink: 0 }}
            >
                {t('windyDisclaimer')}
            </Typography>
        </Box>
    );
}
