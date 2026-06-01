'use client';

/**
 * LinkedGenerationTimeline
 *
 * Timeseries-mode layout for the generation-mix page: three clearly-labelled charts stacked
 * vertically, all sharing one drag-linked time axis so each moment lines up across all three.
 *
 *   1. OCCTO — generation mix by fuel        (GenerationMixLightweightChart)
 *   2. HJKS  — fleet operating/stopped capacity by fuel (UnitCapacityTimelineChart)
 *   3. 停機時間軸 — HJKS outage events, Gantt-style (OutageTimelineChart)
 *
 * Owns each chart's handle (exposed via onChartReady) and wires useLinkedTimeScales so
 * panning/zooming or hovering any chart drives the others. Only the bottom chart shows the
 * shared time axis; the upper two hide theirs. Comparison mode does not use this component.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Box, ButtonBase, Divider, Paper, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import GenerationMixLightweightChart, { GEN_SOURCES } from './GenerationMixLightweightChart';
import UnitCapacityTimelineChart, { type UnitCapacityMetric } from './UnitCapacityTimelineChart';
import OutageTimelineChart from './OutageTimelineChart';
import { useLinkedTimeScales, type LinkedChartHandle } from '@/hooks/useLinkedTimeScales';
import type { OcctoAreaData, HjksOutage, UnitAvailabilityTimeline } from '@/types';

// Stop-type swatch colours for the outage-timeline legend (match outageStopTypeColors edges).
const STOP_TYPE_LEGEND: { labelKey: string; color: string }[] = [
  { labelKey: 'emergency', color: 'rgba(220,38,38,0.85)' },
  { labelKey: 'planned', color: 'rgba(59,130,246,0.80)' },
  { labelKey: 'stopped', color: 'rgba(156,163,175,0.70)' },
];

interface FuelLegendItem { key: string; labelKey: string; color: string }

/** Small inline legend of colour swatches + labels. */
const Legend: React.FC<{ items: FuelLegendItem[] }> = ({ items }) => {
  const { t } = useTranslation('generationMix');
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
      {items.map((s) => (
        <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{t(s.labelKey)}</Typography>
        </Box>
      ))}
    </Box>
  );
};

/** Pane header: a coloured source tag + descriptor, then arbitrary controls (legend / toggle). */
const PaneHeader: React.FC<{ source: string; accent: string; descriptor: string; children?: React.ReactNode }> = ({
  source, accent, descriptor, children,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.25, flexShrink: 0 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: accent, letterSpacing: 0.3 }}>
        {source}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{descriptor}</Typography>
    </Box>
    {children}
  </Box>
);

export interface LinkedGenerationTimelineProps {
  areaData: OcctoAreaData[];
  unitAvailability: UnitAvailabilityTimeline | null;
  unitMetric: UnitCapacityMetric;
  setUnitMetric: (m: UnitCapacityMetric) => void;
  outages: HjksOutage[];
  isDark: boolean;
  startDate: Date | null;
  endDate: Date | null;
  onHoverIndexChange: (index: number | null) => void;
  onHoverOutagesChange: (outages: HjksOutage[]) => void;
  onClickChange: (index: number | null, time: number | null, outages: HjksOutage[]) => void;
  lockedBarTime: number | null;
}

export const LinkedGenerationTimeline: React.FC<LinkedGenerationTimelineProps> = ({
  areaData,
  unitAvailability,
  unitMetric,
  setUnitMetric,
  outages,
  isDark,
  startDate,
  endDate,
  onHoverIndexChange,
  onHoverOutagesChange,
  onClickChange,
  lockedBarTime,
}) => {
  const { t } = useTranslation('generationMix');

  // Chart 0 = OCCTO (lock-aware master), 1 = HJKS capacity, 2 = outage timeline.
  const [occtoHandle, setOcctoHandle] = useState<LinkedChartHandle | null>(null);
  const [hjksHandle, setHjksHandle] = useState<LinkedChartHandle | null>(null);
  const [ganttHandle, setGanttHandle] = useState<LinkedChartHandle | null>(null);
  // 停機事件時間軸預設關閉 — toggled on from the OCCTO pane header.
  const [showOutages, setShowOutages] = useState(false);

  const lockedTimeRef = useRef<number | null>(lockedBarTime ?? null);
  lockedTimeRef.current = lockedBarTime ?? null;

  const handles = useMemo(
    () => [occtoHandle, hjksHandle, ganttHandle],
    [occtoHandle, hjksHandle, ganttHandle],
  );
  useLinkedTimeScales(handles, { syncCrosshair: true, lockedTimeRef, lockedMasterIndex: 0 });

  // Outage timeline shares the OCCTO time domain so all three axes line up exactly.
  const baselineTimes = useMemo(() => areaData.map((d) => d.datetime), [areaData]);

  // Operable-capacity ceiling for the OCCTO overlay: Σ available_capacity_mw per timestamp.
  // Dips when outages remove capacity → generation pressing against it shows the constraint.
  const ceilingData = useMemo(() => {
    if (!unitAvailability) return undefined;
    return unitAvailability.timeline.map((entry) => ({
      datetime: entry.datetime,
      value: (Object.values(entry.data) as Array<{ available_capacity_mw?: number }>).reduce(
        (sum, dp) => sum + (dp?.available_capacity_mw || 0),
        0,
      ),
    }));
  }, [unitAvailability]);
  const ceilingColor = isDark ? '#eceff1' : '#37474f';

  const occtoLegend = useMemo<FuelLegendItem[]>(
    () => GEN_SOURCES.map((s) => ({ key: s.key as string, labelKey: s.labelKey, color: s.color })),
    [],
  );
  const hjksLegend = useMemo<FuelLegendItem[]>(
    () => GEN_SOURCES
      .filter((s) => (unitAvailability?.keys ?? []).includes(s.key as string))
      .map((s) => ({ key: s.key as string, labelKey: s.labelKey, color: s.color })),
    [unitAvailability],
  );
  const stopTypeLegend = useMemo<FuelLegendItem[]>(
    () => STOP_TYPE_LEGEND.map((s) => ({ key: s.labelKey, labelKey: s.labelKey, color: s.color })),
    [],
  );

  const hasCapacity = !!unitAvailability && unitAvailability.timeline.length > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        flex: '3 1 500px',
        minHeight: 0,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 1.5,
        gap: 0.25,
      }}
    >
      {/* ── 1. OCCTO generation mix ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: '3 1 0', minHeight: 0 }}>
        <PaneHeader source="OCCTO" accent="var(--primary)" descriptor={t('paneOcctoDesc')}>
          <Legend items={occtoLegend} />
          {ceilingData && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <Box sx={{ width: 14, borderTop: `2px dashed ${ceilingColor}` }} />
              <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{t('operableCeiling')}</Typography>
            </Box>
          )}
          <ButtonBase
            onClick={() => setShowOutages((v) => !v)}
            sx={{
              ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.4,
              px: 1, height: 22, borderRadius: 1, whiteSpace: 'nowrap',
              border: '1px solid',
              borderColor: showOutages ? 'rgba(255,167,38,0.5)' : 'var(--card-border)',
              color: showOutages ? '#ffa726' : 'var(--muted)',
              backgroundColor: showOutages ? 'rgba(255,167,38,0.12)' : 'transparent',
              fontSize: 10, fontFamily: 'monospace', fontWeight: showOutages ? 700 : 500,
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 12 }} />
            {t('outageTimelineTitle')}
            {outages.length > 0 ? ` (${outages.length})` : ''}
          </ButtonBase>
        </PaneHeader>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <GenerationMixLightweightChart
            timeseriesData={areaData}
            comparisonItems={[]}
            mode="timeseries"
            isDark={isDark}
            onHoverIndexChange={onHoverIndexChange}
            onHoverOutagesChange={onHoverOutagesChange}
            onClickChange={onClickChange}
            outages={outages}
            lockedBarTime={lockedBarTime}
            autoFit={false}
            showTimeAxis={false}
            onChartReady={setOcctoHandle}
            ceilingData={ceilingData}
            ceilingColor={ceilingColor}
            ceilingLabel={t('operableCeiling')}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 0.5 }} />

      {/* ── 2. HJKS operating/stopped capacity ──────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: '3 1 0', minHeight: 0 }}>
        <PaneHeader source="HJKS" accent="var(--secondary)" descriptor={t('paneHjksDesc')}>
          <Box sx={{ display: 'inline-flex', border: '1px solid var(--card-border)', borderRadius: 1, overflow: 'hidden', height: 22, flexShrink: 0 }}>
            {(['stopped', 'operating'] as UnitCapacityMetric[]).map((m, i) => (
              <React.Fragment key={m}>
                {i > 0 && <Box sx={{ width: '1px', backgroundColor: 'var(--card-border)' }} />}
                <ButtonBase
                  onClick={() => setUnitMetric(m)}
                  sx={{
                    px: 1.25, fontSize: 10, fontFamily: 'monospace', height: '100%', whiteSpace: 'nowrap',
                    ...(unitMetric === m
                      ? { backgroundColor: 'rgba(0,255,157,0.12)', color: 'var(--primary)', fontWeight: 700 }
                      : { color: 'var(--muted)' }),
                  }}
                >
                  {m === 'stopped' ? t('metricStopped') : t('metricOperating')}
                </ButtonBase>
              </React.Fragment>
            ))}
          </Box>
          <Legend items={hjksLegend} />
        </PaneHeader>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          {hasCapacity ? (
            <UnitCapacityTimelineChart
              timeline={unitAvailability}
              metric={unitMetric}
              isDark={isDark}
              autoFit={false}
              showTimeAxis={false}
              onChartReady={setHjksHandle}
            />
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('unitCapacityNoData')}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── 3. 停機時間軸 — outage-event Gantt (default off, toggled from OCCTO header) ── */}
      {showOutages && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: '2 1 0', minHeight: 0 }}>
            <PaneHeader source="HJKS" accent="#ffa726" descriptor={t('outageTimelineTitle')}>
              <Legend items={stopTypeLegend} />
            </PaneHeader>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              {outages.length > 0 ? (
                <OutageTimelineChart
                  outages={outages}
                  baselineTimes={baselineTimes}
                  startDate={startDate}
                  endDate={endDate}
                  isDark={isDark}
                  autoFit={false}
                  onChartReady={setGanttHandle}
                />
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('outageTimelineNoData')}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default LinkedGenerationTimeline;
