/**
 * OutageRangePrimitive
 *
 * LWC primitive that marks outage start times on the GenerationMix chart.
 * Color is keyed to stop_type.
 *
 * Visual design:
 *   - Dashed vertical line at start_datetime (full chart height)
 *   - Fixed label badge at the top of the line: "{plant} {unit} ↓{n}MW"
 *     (always visible — no hover required)
 *   - Multiple outages at the same timestamp: badges stack vertically
 *   - zOrder: 'top' — rendered above StackedBarSeries bars
 *
 * Pattern: mirrors OutageMarkersPrimitive (src/components/dashboard/charts/OutageMarkersPrimitive.ts)
 */

import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  PrimitiveHoveredItem,
} from 'lightweight-charts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutageRangeZone {
  startTime: number; // UTC seconds
  endTime: number;   // UTC seconds (kept for interface compat, not rendered)
  fillColor: string; // badge background color
  edgeColor: string; // line + badge border + text color
  label: string;     // already-truncated display text
}

interface ChartWithTimeScale {
  timeScale(): {
    timeToCoordinate(t: Time): number | null;
    getVisibleLogicalRange(): unknown;
  };
}

// ─── Color helper ─────────────────────────────────────────────────────────────

export function outageStopTypeColors(stopType: string): { fillColor: string; edgeColor: string } {
  if (stopType.includes('緊急')) {
    return { fillColor: 'rgba(220,38,38,0.25)', edgeColor: 'rgba(220,38,38,0.85)' };
  }
  if (stopType.includes('計画') || stopType.includes('計畫')) {
    return { fillColor: 'rgba(59,130,246,0.20)', edgeColor: 'rgba(59,130,246,0.80)' };
  }
  return { fillColor: 'rgba(156,163,175,0.18)', edgeColor: 'rgba(156,163,175,0.70)' };
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

interface PrimitivePaneRenderer {
  draw(target: any): void;
}

class OutageRangeRenderer implements PrimitivePaneRenderer {
  private _zones: OutageRangeZone[];
  private _source: OutageRangePrimitive;

  constructor(zones: OutageRangeZone[], source: OutageRangePrimitive) {
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

      let timeScale: ReturnType<ChartWithTimeScale['timeScale']> | null = null;
      try {
        timeScale = chart.timeScale();
      } catch {
        return;
      }
      if (!timeScale) return;

      const FONT_SIZE = Math.round(9 * vRatio);
      const BADGE_PAD_H = 4 * hRatio;
      const BADGE_PAD_V = 2 * vRatio;
      const BADGE_H = FONT_SIZE + BADGE_PAD_V * 2;
      const BADGE_GAP = 2 * vRatio;
      const LINE_W = Math.max(1, hRatio);

      ctx.font = `${FONT_SIZE}px monospace`;

      // Group zones by their bitmap x-coordinate so overlapping markers share one line
      const xMap = new Map<number, OutageRangeZone[]>();
      this._zones.forEach((zone) => {
        try {
          const xRaw = timeScale!.timeToCoordinate(zone.startTime as Time);
          if (xRaw === null) return;
          const bx = Math.round(xRaw * hRatio);
          if (bx < -1 || bx > width + 1) return;
          const group = xMap.get(bx) ?? [];
          group.push(zone);
          xMap.set(bx, group);
        } catch {
          // chart may be disposed during iteration
        }
      });

      const MIN_BADGE_GAP = 4 * hRatio;
      // Sort groups left-to-right so collision detection is sequential
      const sortedGroups = [...xMap.entries()].sort(([a], [b]) => a - b);
      let nextAvailableBadgeX = 0; // tracks right edge of last drawn badge

      sortedGroups.forEach(([bx, zones]) => {
        ctx.save();

        // ── Dashed vertical line (always drawn) ─────────────────────────────
        ctx.strokeStyle = zones[0].edgeColor;
        ctx.lineWidth = LINE_W;
        ctx.setLineDash([Math.round(3 * hRatio), Math.round(3 * hRatio)]);
        ctx.beginPath();
        ctx.moveTo(bx + 0.5, 0);
        ctx.lineTo(bx + 0.5, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Badges: only draw if horizontal space allows ─────────────────────
        const rawBadgeX = bx + LINE_W + 1;
        if (rawBadgeX >= nextAvailableBadgeX) {
          let badgeY = 4 * vRatio;
          let maxBadgeW = 0;

          zones.forEach((zone) => {
            if (!zone.label) {
              badgeY += BADGE_H + BADGE_GAP;
              return;
            }
            const textW = ctx.measureText(zone.label).width;
            const badgeW = textW + BADGE_PAD_H * 2;
            // Flip to left side only if it would overflow the right edge
            const badgeX =
              rawBadgeX + badgeW <= width
                ? rawBadgeX
                : bx - badgeW - LINE_W - 1;
            if (badgeX < 0) {
              badgeY += BADGE_H + BADGE_GAP;
              return;
            }

            maxBadgeW = Math.max(maxBadgeW, badgeW);

            // Badge background
            ctx.fillStyle = zone.fillColor;
            ctx.fillRect(badgeX, badgeY, badgeW, BADGE_H);

            // Badge border
            ctx.strokeStyle = zone.edgeColor;
            ctx.lineWidth = Math.max(0.5, 0.5 * hRatio);
            ctx.strokeRect(badgeX, badgeY, badgeW, BADGE_H);

            // Badge text
            ctx.fillStyle = zone.edgeColor;
            ctx.fillText(
              zone.label,
              badgeX + BADGE_PAD_H,
              badgeY + BADGE_PAD_V + FONT_SIZE - 1 * vRatio,
            );

            badgeY += BADGE_H + BADGE_GAP;
          });

          if (maxBadgeW > 0) {
            nextAvailableBadgeX = rawBadgeX + maxBadgeW + MIN_BADGE_GAP;
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

class OutageRangePaneView implements PrimitivePaneView {
  private _source: OutageRangePrimitive;
  private _zones: OutageRangeZone[] = [];

  constructor(source: OutageRangePrimitive) {
    this._source = source;
  }

  update(): void {
    this._zones = this._source.zones();
  }

  renderer(): PrimitivePaneRenderer | null {
    return new OutageRangeRenderer(this._zones, this._source);
  }

  zOrder(): 'top' {
    return 'top';
  }
}

// ─── Primitive ────────────────────────────────────────────────────────────────

export class OutageRangePrimitive implements ISeriesPrimitive<Time> {
  private _paneViews: OutageRangePaneView[];
  private _zones: OutageRangeZone[] = [];
  private _chart: ChartWithTimeScale | null = null;
  private _requestUpdate: (() => void) | null = null;

  constructor() {
    this._paneViews = [new OutageRangePaneView(this)];
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

  /** Replace all zones and trigger a repaint. */
  setZones(zones: OutageRangeZone[]): void {
    this._zones = zones;
    this._paneViews.forEach((pv) => pv.update());
    this._requestUpdate?.();
  }

  zones(): OutageRangeZone[] {
    return this._zones;
  }
}
