/**
 * Canonical date range selection type used across all dashboard pages.
 * The `version` counter increments on every user action, enabling forced
 * re-fetches even when the selected dates are identical to the previous range.
 */
export interface DateRangeSelection {
  /** Normalized to 00:00:00.000 local time */
  startDate: Date;
  /**
   * Normalized to 00:00:00.000 local time.
   * Use `< addDays(endDate, 1)` for inclusive end-day filtering.
   */
  endDate: Date;
  /**
   * Monotonically increasing counter. Increments on every user action,
   * even when startDate and endDate values are unchanged.
   * This forces re-fetches for subset-range selections.
   */
  version: number;
  /** Named preset that produced this selection, or null for custom ranges */
  preset: string | null;
}
