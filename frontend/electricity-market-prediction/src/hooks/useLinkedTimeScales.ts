'use client';

/**
 * useLinkedTimeScales
 *
 * Links N Lightweight-Charts instances so their **time axes** stay in sync (pan/zoom any
 * one → all move) and, optionally, their **crosshairs** mirror (hover one → marker on the
 * others). Used by the generation-mix page to keep the OCCTO mix, HJKS capacity, and outage
 * timeline charts aligned so each event lines up vertically across all three.
 *
 * LWC 5.1.0 has no `subscribeVisibleTimeRangeChange`, so we trigger on
 * `subscribeVisibleLogicalRangeChange` and apply the source's *time* range
 * (`getVisibleRange` → `setVisibleRange`). Using the time range (not logical indices) keeps
 * charts aligned even when they hold a different number of bars (OCCTO rows vs HJKS 30-min
 * buckets) — all share the same fake-UTC JST `toChartTime` mapping, so wall-clock windows match.
 *
 * Re-entrancy is guarded both by an `isSyncing` flag (synchronous echoes) and by skipping
 * when a target's range/time already matches (asynchronous echoes), so it can't ping-pong.
 */

import { useEffect } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';

export interface LinkedChartHandle {
  chart: IChartApi;
  series: ISeriesApi<any>;
  /** Optional: the series' value at a given (fake-UTC) time, for a natural crosshair price. */
  priceAtTime?: (time: number) => number | null;
}

interface LinkedTimeScaleOptions {
  syncCrosshair?: boolean;
  /** While this chart is click-locked, don't let other charts' hover override its crosshair. */
  lockedTimeRef?: { current: number | null };
  /** Index (in `handles`) of the lock-aware "master" chart (default 0 = OCCTO). */
  lockedMasterIndex?: number;
}

function timeScaleOf(handle: LinkedChartHandle) {
  try {
    return handle.chart.timeScale();
  } catch {
    return null;
  }
}

export function useLinkedTimeScales(
  handles: (LinkedChartHandle | null)[],
  options: LinkedTimeScaleOptions = {},
): void {
  const { syncCrosshair = true, lockedTimeRef, lockedMasterIndex = 0 } = options;

  useEffect(() => {
    // Keep original indices so lockedMasterIndex stays meaningful after filtering.
    const ready = handles
      .map((h, index) => (h ? { handle: h, index } : null))
      .filter((x): x is { handle: LinkedChartHandle; index: number } => x !== null);
    if (ready.length < 2) return;

    // ── Time-axis sync ─────────────────────────────────────────────────────────
    let isRangeSyncing = false;
    const applyRange = (src: LinkedChartHandle, dst: LinkedChartHandle) => {
      const sTs = timeScaleOf(src);
      const dTs = timeScaleOf(dst);
      if (!sTs || !dTs) return;
      const r = sTs.getVisibleRange();
      if (!r) return;
      const cur = dTs.getVisibleRange();
      const from = Number(r.from);
      const to = Number(r.to);
      // Already in sync — skip (prevents async echo loops).
      if (cur && Math.abs(Number(cur.from) - from) < 1 && Math.abs(Number(cur.to) - to) < 1) return;
      try {
        dTs.setVisibleRange({ from: r.from, to: r.to });
      } catch {
        /* chart may be mid-dispose */
      }
    };

    // ── Crosshair sync ───────────────────────────────────────────────────────────
    let isCrossSyncing = false;
    let lastCrossTime: number | null | undefined = undefined;
    const forwardCrosshair = (srcIndex: number, param: any) => {
      if (isCrossSyncing) return;
      const t = param.point && param.time !== undefined ? Number(param.time) : null;
      if (t === lastCrossTime) return;
      lastCrossTime = t;
      isCrossSyncing = true;
      try {
        for (const { handle, index } of ready) {
          if (index === srcIndex) continue;
          // Respect the master chart's click-lock — don't fight its pinned crosshair.
          if (index === lockedMasterIndex && lockedTimeRef?.current != null) continue;
          if (t === null) {
            handle.chart.clearCrosshairPosition();
          } else {
            const price = handle.priceAtTime?.(t) ?? 0;
            handle.chart.setCrosshairPosition(price, param.time as Time, handle.series);
          }
        }
      } catch {
        /* noop */
      }
      isCrossSyncing = false;
    };

    const cleanups: (() => void)[] = [];
    for (const { handle, index } of ready) {
      const ts = timeScaleOf(handle);
      if (!ts) continue;
      const onRange = () => {
        if (isRangeSyncing) return;
        isRangeSyncing = true;
        for (const other of ready) {
          if (other.index !== index) applyRange(handle, other.handle);
        }
        isRangeSyncing = false;
      };
      ts.subscribeVisibleLogicalRangeChange(onRange);
      cleanups.push(() => {
        try { ts.unsubscribeVisibleLogicalRangeChange(onRange); } catch { /* noop */ }
      });

      if (syncCrosshair) {
        const onCross = (param: any) => forwardCrosshair(index, param);
        handle.chart.subscribeCrosshairMove(onCross);
        cleanups.push(() => {
          try { handle.chart.unsubscribeCrosshairMove(onCross); } catch { /* noop */ }
        });
      }
    }

    // Initial alignment: every other chart follows the first ready chart.
    const master = ready[0];
    for (const other of ready) {
      if (other.index !== master.index) applyRange(master.handle, other.handle);
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [handles, syncCrosshair, lockedTimeRef, lockedMasterIndex]);
}
