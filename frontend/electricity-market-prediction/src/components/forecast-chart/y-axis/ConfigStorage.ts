import { YAxisRange } from './types';

export const CONFIG_STORAGE_KEY = 'forecast-y-axis-config';
export const CURRENT_CONFIG_VERSION = '1.0';

export interface AppYAxisConfig {
    primary: YAxisRange | null;
    secondary: YAxisRange | null;
    dataSourceMapping: Record<string, 'primary' | 'secondary'>;
}

/**
 * Enhanced configuration interface for persistence
 */
export interface PersistedYAxisConfig extends AppYAxisConfig {
    version: string;
    lastUpdated: number;
}

/**
 * Storage adapter for YAxis configuration, managing serialization,
 * deserialization, and basic version tracking.
 */
export class ConfigStorage {
    private key: string;

    constructor(key: string = CONFIG_STORAGE_KEY) {
        this.key = key;
    }

    /**
     * Loads the configuration from local storage.
     * If config is invalid or missing, returns null.
     */
    loadConfig(): PersistedYAxisConfig | null {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return null;

            const config = JSON.parse(raw);

            // Handle potential version migrations here in the future
            if (config.version !== CURRENT_CONFIG_VERSION) {
                console.warn(`Config version mismatch: expected ${CURRENT_CONFIG_VERSION}, got ${config.version}`);
                // For MVP, just return null to fallback to generic defaults
                return null;
            }

            return config as PersistedYAxisConfig;
        } catch (error) {
            console.warn('Failed to load Y-axis config from storage', error);
            return null;
        }
    }

    /**
     * Saves the configuration to local storage.
     */
    saveConfig(config: AppYAxisConfig): void {
        try {
            const persistedConfig: PersistedYAxisConfig = {
                ...config,
                version: CURRENT_CONFIG_VERSION,
                lastUpdated: Date.now()
            };

            localStorage.setItem(this.key, JSON.stringify(persistedConfig));
        } catch (error) {
            console.warn('Failed to save Y-axis config', error);
            // Expected to not blow up if storage quota exceeded, 
            // just show a non-blocking warning which we might surface to user in the future.
            throw new Error('Config storage failed');
        }
    }

    /**
     * Clears the saved configuration.
     */
    clearConfig(): void {
        localStorage.removeItem(this.key);
    }
}
