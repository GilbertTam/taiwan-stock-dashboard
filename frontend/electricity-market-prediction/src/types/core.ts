/**
 * @fileoverview Core Domain Types
 *
 * Fundamental types used across the application including areas,
 * prediction models, and API response wrappers.
 */

/**
 * Electricity grid area (region).
 *
 * Japan's electricity grid is divided into 9 major areas,
 * each operated by a different utility company.
 */
export interface Area {
    /** Unique identifier */
    id: number;
    /** English name (used as key) */
    name: string;
    /** Chinese display name */
    name_ch: string;
    /** Japanese display name */
    name_jp: string;
}

/**
 * Price prediction model metadata.
 */
export interface PredictionModel {
    /** Unique identifier (may be string for ES-sourced IDs) */
    id: string | number;
    /** Model name/source identifier */
    name: string;
    /** Model version string */
    version: string;
    /** Human-readable description */
    description: string;
    /** ISO timestamp when model was created */
    created_at: string;
    /** ISO timestamp when model was last updated */
    updated_at: string;
}

/**
 * Generic API response wrapper.
 */
export interface ApiResponse<T> {
    /** Result messages (usually success/error info) */
    result: Array<{
        Message: string;
    }>;
    /** Status code (0 = success, non-zero = error) */
    code: number;
    /** Response data payload */
    data: T;
}
