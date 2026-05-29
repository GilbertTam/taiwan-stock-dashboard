'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useTranslation } from 'react-i18next';
import type { WeatherDataset } from '@/hooks/useWeatherFieldByArea';

const TZ = 'Asia/Tokyo';

export interface WeatherTimeSliderProps {
    /** Sorted ascending list of epoch-ms timestamps the slider can land on */
    timeline: number[];
    /** Currently-selected timestamp (must be in `timeline`); falls back to first when not) */
    value: number | null;
    onChange: (timestampMs: number) => void;
    /** Hourly → show "yyyy/MM/dd HH:mm"; daily → show "yyyy/MM/dd" */
    dataset: WeatherDataset;
    /** When true, the slider is disabled (e.g. while loading) */
    disabled?: boolean;
}

const SPEEDS = [0.5, 1, 2] as const;
type Speed = (typeof SPEEDS)[number];

export function WeatherTimeSlider({ timeline, value, onChange, dataset, disabled }: WeatherTimeSliderProps) {
    const { t } = useTranslation('weatherMap');

    const idx = useMemo(() => {
        if (!value || timeline.length === 0) return 0;
        const found = timeline.indexOf(value);
        return found >= 0 ? found : 0;
    }, [timeline, value]);

    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState<Speed>(1);
    const rafRef = useRef<number | null>(null);
    const lastTickRef = useRef<number>(0);

    useEffect(() => {
        if (timeline.length === 0 && playing) setPlaying(false);
    }, [timeline.length, playing]);

    useEffect(() => {
        if (!playing || timeline.length === 0) return;

        const step = () => {
            const now = performance.now();
            const intervalMs = 1000 / speed;
            if (now - lastTickRef.current >= intervalMs) {
                lastTickRef.current = now;
                const nextIdx = (idx + 1) % timeline.length;
                onChange(timeline[nextIdx]);
                if (nextIdx === timeline.length - 1) {
                    setPlaying(false);
                    return;
                }
            }
            rafRef.current = requestAnimationFrame(step);
        };
        lastTickRef.current = performance.now();
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [playing, speed, idx, timeline, onChange]);

    const handleSliderChange = useCallback((_e: Event, newIdx: number | number[]) => {
        const i = Array.isArray(newIdx) ? newIdx[0] : newIdx;
        if (timeline[i] != null) onChange(timeline[i]);
    }, [timeline, onChange]);

    const handleTogglePlay = useCallback(() => {
        if (timeline.length === 0) return;
        setPlaying((p) => !p);
    }, [timeline.length]);

    const handleSpeedChange = useCallback((_e: React.MouseEvent<HTMLElement>, v: Speed | null) => {
        if (v != null) setSpeed(v);
    }, []);

    const currentLabel = useMemo(() => {
        if (timeline.length === 0 || value == null) return '—';
        const jst = toZonedTime(new Date(value), TZ);
        return dataset === 'daily'
            ? format(jst, 'yyyy/MM/dd')
            : format(jst, 'yyyy/MM/dd HH:mm');
    }, [timeline.length, value, dataset]);

    const hasTimeline = timeline.length > 0;

    return (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1, width: '100%' }}>
            <IconButton
                size="small"
                onClick={handleTogglePlay}
                disabled={disabled || !hasTimeline}
                title={playing ? t('slider.pause') : t('slider.play')}
                sx={{ flexShrink: 0 }}
            >
                {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>

            <ToggleButtonGroup
                size="small"
                value={speed}
                exclusive
                onChange={handleSpeedChange}
                disabled={disabled || !hasTimeline}
                sx={{ flexShrink: 0 }}
            >
                {SPEEDS.map((s) => (
                    <ToggleButton key={s} value={s} sx={{ px: 1, py: 0.25, fontSize: '0.75rem', textTransform: 'none' }}>
                        {s}x
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>

            <Slider
                size="small"
                value={idx}
                min={0}
                max={Math.max(0, timeline.length - 1)}
                step={1}
                onChange={handleSliderChange}
                disabled={disabled || !hasTimeline}
                sx={{ flex: 1, minWidth: 100 }}
            />

            <Box sx={{ minWidth: 140, textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1 }}>
                    {t('slider.currentTime')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {currentLabel}
                </Typography>
            </Box>
        </Stack>
    );
}
