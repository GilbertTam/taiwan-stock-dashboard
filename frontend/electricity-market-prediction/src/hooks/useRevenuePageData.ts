'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { fetchActualPrices } from '@/services/marketApi';
import { fetchPredictions, fetchSpecificPredictions } from '@/services/predictionsApi';
import { AreaPrice, PricePrediction } from '@/types';
import { SelectedModelConfig } from '@/hooks/useModelSelection';

export interface UseRevenuePageDataParams {
    area: string;
    startDate: Date | null;
    endDate: Date | null;
    selectedModels: SelectedModelConfig[];
    /** Monotonically increasing version from useMarketData's selectionVersion */
    dateVersion: number;
}

export interface UseRevenuePageDataReturn {
    /** True only when ALL data (actual prices + every selected model) has settled for the current session */
    isReady: boolean;
    /** True while the coordinated fetch is in-flight */
    isFetching: boolean;
    actualPrices: AreaPrice[];
    predictionsByModel: Record<string, PricePrediction[]>;
    /** Model keys that failed to fetch — non-blocking, simulation still runs for others */
    failedModelKeys: string[];
    /** Stable string encoding all inputs; changes atomically with any input change */
    sessionKey: string;
    error: string | null;
}

/**
 * Coordinates fetching of actual prices + all selected model predictions as a
 * single atomic operation for the site-revenue page.
 *
 * Design goals:
 * - `isReady` only flips to true after Promise.allSettled completes for the
 *   current session, eliminating partial-model race conditions.
 * - `sessionKey` is the sole useEffect dependency, so there is exactly one
 *   code path that clears and re-fetches — no dual-effect race window.
 * - Individual model failures do not block the simulation for other models.
 */
export function useRevenuePageData(params: UseRevenuePageDataParams): UseRevenuePageDataReturn {
    const { area, startDate, endDate, selectedModels, dateVersion } = params;

    const [isReady,             setIsReady]             = useState(false);
    const [isFetching,          setIsFetching]          = useState(false);
    const [actualPrices,        setActualPrices]        = useState<AreaPrice[]>([]);
    const [predictionsByModel,  setPredictionsByModel]  = useState<Record<string, PricePrediction[]>>({});
    const [failedModelKeys,     setFailedModelKeys]     = useState<string[]>([]);
    const [error,               setError]               = useState<string | null>(null);

    // Monotonically increasing fetch ID; used to discard stale responses.
    const fetchIdRef = useRef(0);

    const sessionKey = useMemo(() => {
        if (!area || !startDate || !endDate) return '';
        const start = format(startDate, 'yyyyMMdd');
        const end   = format(endDate,   'yyyyMMdd');
        // Sort model entries so the key is order-independent
        const modelPart = selectedModels
            .map(m => `${m.id}|${m.name}|${m.calculatingDate}`)
            .sort()
            .join(',');
        return `${area}__${start}__${end}__v${dateVersion}__${modelPart}`;
    }, [area, startDate, endDate, selectedModels, dateVersion]);

    useEffect(() => {
        if (!sessionKey) return;

        // Immediately gate the simulation — no partial-state window
        setIsReady(false);
        setIsFetching(true);
        setError(null);
        setActualPrices([]);
        setPredictionsByModel({});
        setFailedModelKeys([]);

        const myId = ++fetchIdRef.current;
        const formattedStart = format(startDate!, 'yyyyMMdd');
        const formattedEnd   = format(endDate!,   'yyyyMMdd');

        const run = async () => {
            try {
                const actualPromise = fetchActualPrices({
                    start_date: formattedStart,
                    end_date:   formattedEnd,
                    name:       area,
                });

                // Each model promise resolves (never rejects) so allSettled never blocks on failure
                const modelPromises = selectedModels.map(m => {
                    const modelKey = `${m.id}|${m.name}`;
                    const p = m.calculatingDate === 'latest'
                        ? fetchPredictions({
                            start_date:  formattedStart,
                            end_date:    formattedEnd,
                            area_name:   area,
                            model_name:  m.name,
                            latest_only: true,
                        })
                        : fetchSpecificPredictions({
                            start_date:       formattedStart,
                            end_date:         formattedEnd,
                            area_name:        area,
                            model_name:       m.name,
                            calculating_date: m.calculatingDate,
                        });
                    return p.then(
                        data => ({ modelKey, data, failed: false }),
                        ()   => ({ modelKey, data: [] as PricePrediction[], failed: true })
                    );
                });

                // Single await — state is never set in a partial condition
                const [actualResult, ...modelResults] = await Promise.allSettled([
                    actualPromise,
                    ...modelPromises,
                ]);

                // Discard if a newer session has started
                if (myId !== fetchIdRef.current) return;

                const prices = actualResult.status === 'fulfilled' ? actualResult.value : [];
                const byModel: Record<string, PricePrediction[]> = {};
                const failed: string[] = [];

                for (const r of modelResults) {
                    if (r.status === 'fulfilled') {
                        byModel[r.value.modelKey] = r.value.data;
                        if (r.value.failed) failed.push(r.value.modelKey);
                    }
                }

                setActualPrices(prices);
                setPredictionsByModel(byModel);
                setFailedModelKeys(failed);
                setIsReady(true);   // single atomic flip — all data is present
                setIsFetching(false);
            } catch (e: any) {
                if (myId !== fetchIdRef.current) return;
                setError(e?.message ?? 'Fetch failed');
                setIsFetching(false);
            }
        };

        run();
        // sessionKey is the sole dependency — it encodes area, dates, models, and version
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionKey]);

    return { isReady, isFetching, actualPrices, predictionsByModel, failedModelKeys, sessionKey, error };
}
