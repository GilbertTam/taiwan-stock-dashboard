import { IChartApi } from 'lightweight-charts';
import { YAxisRange, YAxisConfig } from './types';
import { ConfigStorage, AppYAxisConfig } from './ConfigStorage';

/**
 * Y-Axis Change Listener
 * Callback function type for Y-axis range changes
 */
export type YAxisChangeListener = (range: YAxisRange) => void;

/**
 * YAxisController
 * 
 * Manages both primary and secondary Y-axis state and interactions.
 * The controller interfaces with the lightweight-charts API to control
 * axis ranges and handle user interactions.
 * 
 * Primary axis (Y1/right): Supports native drag and zoom interactions
 * Secondary axis (Y2/left): Controlled via UI inputs using setVisibleRange API
 */
export class YAxisController {
  private chart: IChartApi;
  private config: YAxisConfig;
  private listeners: Set<YAxisChangeListener>;
  private storage: ConfigStorage;
  private primaryPollingInterval: NodeJS.Timeout | null = null;
  private lastPolledPrimaryRange: string | null = null;

  /**
   * Creates a new YAxisController instance
   * 
   * @param chart - The lightweight-charts IChartApi instance
   * @param initialConfig - Optional initial configuration for Y-axes
   */
  constructor(chart: IChartApi, initialConfig?: YAxisConfig, storageKey?: string) {
    this.chart = chart;
    this.storage = new ConfigStorage(storageKey);
    const persistedConfig = this.storage.loadConfig();

    this.config = initialConfig || {
      primary: persistedConfig?.primary || null,
      secondary: persistedConfig?.secondary || null,
    };
    this.listeners = new Set();

    // If we loaded a secondary config, we should try to restore it visually.
    // Primary axis will auto-scale naturally unless user interacts with it, so we don't force it here 
    // unless needed. Lightweight charts natively bounds drag/zoom on primary.
    if (!initialConfig && this.config.secondary) {
      // Defer setting range slightly to allow chart initialization to complete and series to be added
      setTimeout(() => {
        this.setSecondaryRange(this.config.secondary!).catch(() => {
          // If it fails, fallback by resetting 
          console.warn('Fallback: Failed to restore secondary axis range from config');
          this.resetSecondaryRange();
        });
      }, 0);
    }
  }

  /**
   * Manually save current configuration to storage.
   * Allows passing data source mappings to save alongside axes states.
   */
  saveConfig(dataSourceMapping: Record<string, 'primary' | 'secondary'> = {}): void {
    const configToSave: AppYAxisConfig = {
      primary: this.config.primary,
      secondary: this.config.secondary,
      dataSourceMapping
    };
    this.storage.saveConfig(configToSave);
  }

  /**
   * Get the storage instance for direct access to loaded configs if needed
   */
  getStorageParams(): AppYAxisConfig | null {
    return this.storage.loadConfig();
  }

  /**
   * Gets the current visible range of the primary axis (Y1/right)
   * 
   * @returns The current primary axis range
   * @throws Error if primary price scale is not available
   */
  getPrimaryRange(): YAxisRange {
    const primaryScale = this.chart.priceScale('right');

    if (!primaryScale) {
      throw new Error('Primary price scale (right) not found');
    }

    // If we have a configured range, return it
    if (this.config.primary) {
      return this.config.primary;
    }

    // Otherwise, get the current visible range from the chart
    const visibleRange = primaryScale.getVisibleRange();

    if (!visibleRange) {
      throw new Error('Unable to get visible range from primary axis');
    }

    return {
      min: visibleRange.from,
      max: visibleRange.to,
    };
  }

  /**
   * Resets the primary axis to auto-calculated default range
   * 
   * This will clear any manual range configuration and allow the chart
   * to automatically calculate the optimal range based on visible data.
   */
  resetPrimaryRange(): void {
    const primaryScale = this.chart.priceScale('right');

    if (!primaryScale) {
      throw new Error('Primary price scale (right) not found');
    }

    // Enable auto-scaling to reset to default range
    primaryScale.applyOptions({
      autoScale: true,
    });

    // Clear the configured range
    this.config.primary = null;
    this.saveConfig(); // Persist the reset
  }

  /**
   * Registers a callback to be invoked when the primary axis range changes
   * Note: This is triggered by the polling mechanism if started.
   * 
   * @param callback - Function to call when primary range changes
   */
  onPrimaryRangeChange(callback: YAxisChangeListener): void {
    this.listeners.add(callback);
  }

  /**
   * Starts polling to detect manual changes to the primary price scale (e.g. user dragging the Y axis)
   * since lightweight-charts doesn't natively expose a price scale change event.
   * 
   * @param intervalMs - Polling interval in milliseconds
   */
  startPrimaryRangePolling(intervalMs: number = 1000): void {
    this.stopPrimaryRangePolling();

    this.primaryPollingInterval = setInterval(() => {
      try {
        const currentRange = this.getPrimaryRange();
        const rangeStr = JSON.stringify(currentRange);

        if (this.lastPolledPrimaryRange && this.lastPolledPrimaryRange !== rangeStr) {
          // IMPORTANT: Check if autoScale is enabled before treating this area as a manual range change.
          // If the chart is auto-scaling, any range change is driven by data, not the user.
          const primaryScale = this.chart.priceScale('right');
          const scaleOptions = primaryScale?.options();
          if (scaleOptions && !scaleOptions.autoScale) {
            // The range changed via manual drag/zoom
            this.config.primary = currentRange;
            this.saveConfig(); // Persist changes

            // Notify listeners
            this.listeners.forEach(listener => listener(currentRange));
          }
        }

        this.lastPolledPrimaryRange = rangeStr;
      } catch (e) {
        // Ignore errors (e.g. chart not fully ready or scale missing)
      }
    }, intervalMs);
  }

  /**
   * Stops the primary range polling
   */
  stopPrimaryRangePolling(): void {
    if (this.primaryPollingInterval) {
      clearInterval(this.primaryPollingInterval);
      this.primaryPollingInterval = null;
    }
  }

  /**
   * Gets the current visible range of the secondary axis (Y2/left)
   * 
   * @returns The current secondary axis range
   * @throws Error if secondary price scale is not available
   */
  getSecondaryRange(): YAxisRange {
    const secondaryScale = this.chart.priceScale('left');

    if (!secondaryScale) {
      throw new Error('Secondary price scale (left) not found');
    }

    // If we have a configured range, return it
    if (this.config.secondary) {
      return this.config.secondary;
    }

    // Otherwise, get the current visible range from the chart
    const visibleRange = secondaryScale.getVisibleRange();

    if (!visibleRange) {
      throw new Error('Unable to get visible range from secondary axis');
    }

    return {
      min: visibleRange.from,
      max: visibleRange.to,
    };
  }

  /**
   * Sets the visible range of the secondary axis (Y2/left)
   * 
   * This method uses the lightweight-charts API to programmatically
   * set the secondary axis range. It disables auto-scaling and applies
   * the specified range.
   * 
   * @param range - The desired range for the secondary axis
   * @throws Error if secondary price scale is not available or API call fails
   */
  async setSecondaryRange(range: YAxisRange): Promise<void> {
    const secondaryScale = this.chart.priceScale('left');

    if (!secondaryScale) {
      throw new Error('Secondary price scale (left) not found');
    }

    try {
      // Disable auto-scaling to allow manual range control
      secondaryScale.applyOptions({
        autoScale: false,
      });

      // Set the visible range using the API
      secondaryScale.setVisibleRange({
        from: range.min,
        to: range.max,
      });

      // Update our internal config
      this.config.secondary = range;
      this.saveConfig(); // Persist the change
    } catch (error) {
      // Re-throw with more context
      throw new Error(
        `Failed to set secondary axis range: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Resets the secondary axis to auto-calculated default range
   * 
   * This will clear any manual range configuration and allow the chart
   * to automatically calculate the optimal range based on visible data.
   */
  resetSecondaryRange(): void {
    const secondaryScale = this.chart.priceScale('left');

    if (!secondaryScale) {
      throw new Error('Secondary price scale (left) not found');
    }

    // Enable auto-scaling to reset to default range
    secondaryScale.applyOptions({
      autoScale: true,
    });

    // Clear the configured range
    this.config.secondary = null;
    this.saveConfig(); // Persist the reset
  }
}
