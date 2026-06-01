/**
 * OutageBandPrimitive
 *
 * LWC primitive that draws HJKS outage events as a Gantt-style timeline:
 * one filled horizontal band per event, spanning start_datetime → end_datetime,
 * placed on a lane (row) so overlapping events don't collide. Colour is keyed to
 * stop_type via outageStopTypeColors (緊急=red, 計画=blue, others=grey).
 *
 * Rendered on the bottom chart of the linked generation-mix view; its time axis is
 * kept in sync with the top OCCTO stacked chart so each band lines up vertically with
 * the generation it affected.
 *
 * Pattern: mirrors OutageRangePrimitive.ts (same ISeriesPrimitive<Time> skeleton +
 * useBitmapCoordinateSpace canvas rendering), but draws horizontal bands instead of
 * dashed start-time markers.
 */

import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  PrimitiveHoveredItem,
} from 'lightweight-charts';
import { outageStopTypeColors } from './OutageRangePrimitive';
import type { HjksOutage } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutageBandZone {
  startTime: number; // UTC seconds (fake-UTC, JST wall time)
  endTime: number;   // UTC seconds (fake-UTC, JST wall time)
  laneIndex: number; // which row this band sits on
  totalLanes: number; // total number of rows (for band height)
  fillColor: string;
  edgeColor: string;
  label: string;     // unit / plant name shown inside the band when it fits
}

interface ChartTimeScale {
  timeToCoordinate(t: Time): number | null;
  getVisibleRange(): { from: Time; to: Time } | null;
}

interface ChartWithTimeScale {
  timeScale(): ChartTimeScale;
}

// ─── Lane packing ───────────────────────────────────────────────────────────────

const JST_NO_TZ = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;

/** Parse a JST datetime string to epoch seconds (used only for lane ordering). */
function toEpochSeconds(datetime: string): number | null {
  if (!datetime) return null;
  // Treat no-timezone strings as JST so ordering matches the chart's fake-UTC axis.
  const iso = JST_NO_TZ.test(datetime)
    ? datetime.replace(' ', 'T') + '+09:00'
    : datetime;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export interface OutageLaneResult {
  outage: HjksOutage;
  start: number; // epoch seconds
  end: number;   // epoch seconds
  laneIndex: number;
}

/**
 * Greedy interval-partition lane assignment: events that don't overlap in time share
 * a lane, minimising the lane count so the short bottom pane stays readable. Events are
 * processed in start-time order (optimal for minimising lanes). Each band is labelled
 * with its unit so it is still identifiable regardless of lane.
 */
export function computeOutageLanes(outages: HjksOutage[]): {
  lanes: OutageLaneResult[];
  totalLanes: number;
} {
  const events = outages
    .map((o) => {
      const start = toEpochSeconds(o.start_datetime);
      const end = toEpochSeconds(o.end_datetime);
      if (start === null || end === null || end <= start) return null;
      return { outage: o, start, end, laneIndex: 0 } as OutageLaneResult;
    })
    .filter((e): e is OutageLaneResult => e !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const laneEnds: number[] = []; // end time of the last event placed on each lane
  for (const ev of events) {
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= ev.start) {
        ev.laneIndex = i;
        laneEnds[i] = ev.end;
        placed = true;
        break;
      }
    }
    if (!placed) {
      ev.laneIndex = laneEnds.length;
      laneEnds.push(ev.end);
    }
  }

  return { lanes: events, totalLanes: Math.max(laneEnds.length, 1) };
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

interface PrimitivePaneRenderer {
  draw(target: any): void;
}

class OutageBandRenderer implements PrimitivePaneRenderer {
  private _zones: OutageBandZone[];
  private _source: OutageBandPrimitive;

  constructor(zones: OutageBandZone[], source: OutageBandPrimitive) {
    this._zones = zones;
    this._source = source;
  }

  draw(target: any): void {
    const chart = this._source.chart;
    if (!chart || !this._zones.length) return;

    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context as CanvasRenderingContext2D;
      const hRatio: number = scope.horizontalPixelRatio ?? 1;
      const vRatio: number = scope.verticalPixelRatio ?? 1;
      const width: number = scope.bitmapSize.width;
      const height: number = scope.bitmapSize.height;

      let timeScale: ChartTimeScale | null = null;
      try {
        timeScale = chart.timeScale();
      } catch {
        return;
      }
      if (!timeScale) return;

      const visible = timeScale.getVisibleRange();
      if (!visible) return;
      const vFrom = Number(visible.from);
      const vTo = Number(visible.to);

      const totalLanes = Math.max(1, this._zones[0]?.totalLanes ?? 1);
      const LANE_PAD = Math.max(1, Math.round(2 * vRatio));
      const laneH = height / totalLanes;
      const FONT_SIZE = Math.max(8, Math.round(9 * vRatio));
      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.textBaseline = 'middle';

      this._zones.forEach((zone) => {
        // Skip bands entirely outside the visible window.
        if (zone.endTime < vFrom || zone.startTime > vTo) return;
        // Clamp to the visible range so timeToCoordinate stays in-domain.
        const s = Math.max(zone.startTime, vFrom);
        const e = Math.min(zone.endTime, vTo);

        let x0: number | null = null;
        let x1: number | null = null;
        try {
          x0 = timeScale!.timeToCoordinate(s as Time);
          x1 = timeScale!.timeToCoordinate(e as Time);
        } catch {
          return;
        }
        if (x0 === null || x1 === null) return;

        let bx0 = Math.round(x0 * hRatio);
        let bx1 = Math.round(x1 * hRatio);
        if (bx1 < bx0) [bx0, bx1] = [bx1, bx0];
        bx0 = Math.max(0, bx0);
        bx1 = Math.min(width, bx1);
        const bw = Math.max(2 * hRatio, bx1 - bx0);

        const by = Math.round(zone.laneIndex * laneH) + LANE_PAD;
        const bh = Math.max(2, Math.round(laneH) - LANE_PAD * 2);

        ctx.save();
        // Band body
        ctx.fillStyle = zone.fillColor;
        ctx.fillRect(bx0, by, bw, bh);
        // Band border
        ctx.strokeStyle = zone.edgeColor;
        ctx.lineWidth = Math.max(0.5, 0.75 * hRatio);
        ctx.strokeRect(bx0 + 0.5, by + 0.5, bw - 1, bh - 1);

        // Label inside the band when there's room.
        if (zone.label && bh >= FONT_SIZE) {
          const textW = ctx.measureText(zone.label).width;
          const PAD = 4 * hRatio;
          if (bw >= textW + PAD * 2) {
            ctx.fillStyle = zone.edgeColor;
            ctx.fillText(zone.label, bx0 + PAD, by + bh / 2);
          }
        }
        ctx.restore();
      });
    });
  }
}

// ─── Pane view ────────────────────────────────────────────────────────────────

interface PrimitivePaneView {
  update(): void;
  renderer(): PrimitivePaneRenderer | null;
  zOrder?(): 'bottom' | 'normal' | 'top';
}

class OutageBandPaneView implements PrimitivePaneView {
  private _source: OutageBandPrimitive;
  private _zones: OutageBandZone[] = [];

  constructor(source: OutageBandPrimitive) {
    this._source = source;
  }

  update(): void {
    this._zones = this._source.zones();
  }

  renderer(): PrimitivePaneRenderer | null {
    return new OutageBandRenderer(this._zones, this._source);
  }

  zOrder(): 'top' {
    return 'top';
  }
}

// ─── Primitive ────────────────────────────────────────────────────────────────

export class OutageBandPrimitive implements ISeriesPrimitive<Time> {
  private _paneViews: OutageBandPaneView[];
  private _zones: OutageBandZone[] = [];
  private _chart: ChartWithTimeScale | null = null;
  private _requestUpdate: (() => void) | null = null;

  constructor() {
    this._paneViews = [new OutageBandPaneView(this)];
  }

  get chart(): ChartWithTimeScale | null {
    return this._chart;
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart as unknown as ChartWithTimeScale;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._requestUpdate = null;
  }

  paneViews(): readonly PrimitivePaneView[] {
    return this._paneViews;
  }

  hitTest(): PrimitiveHoveredItem | null {
    return null;
  }

  /** Replace all bands and trigger a repaint. */
  setZones(zones: OutageBandZone[]): void {
    this._zones = zones;
    this._paneViews.forEach((pv) => pv.update());
    this._requestUpdate?.();
  }

  zones(): OutageBandZone[] {
    return this._zones;
  }
}

export { outageStopTypeColors };
