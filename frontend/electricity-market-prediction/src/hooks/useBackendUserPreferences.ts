'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchUserPreferences, updateUserPreferences } from '@/services/userPreferencesApi';

const DEBOUNCE_MS = 500;

/**
 * Backend-synced per-user preferences (singleton row, JSON blob).
 *
 * Mount once → GET; subsequent writes are merged into an internal ref
 * and PUT to the backend with a 500ms debounce so rapid changes
 * (e.g. dragging a slider) coalesce into a single request.
 *
 * Failures are logged but never throw — UI must keep working offline.
 */
export function useBackendUserPreferences() {
    const [loaded, setLoaded] = useState(false);
    const prefsRef = useRef<Record<string, unknown>>({});
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inflightRef = useRef<Promise<unknown> | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await fetchUserPreferences();
                if (cancelled) return;
                prefsRef.current = data ?? {};
            } catch (err) {
                console.warn('[useBackendUserPreferences] Failed to fetch preferences:', err);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    const flush = useCallback(async () => {
        const snapshot = { ...prefsRef.current };
        try {
            inflightRef.current = updateUserPreferences(snapshot);
            await inflightRef.current;
        } catch (err) {
            console.warn('[useBackendUserPreferences] Failed to save preferences:', err);
        } finally {
            inflightRef.current = null;
        }
    }, []);

    const scheduleFlush = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void flush();
        }, DEBOUNCE_MS);
    }, [flush]);

    const updatePreferences = useCallback((partial: Record<string, unknown>) => {
        prefsRef.current = { ...prefsRef.current, ...partial };
        scheduleFlush();
    }, [scheduleFlush]);

    return {
        loaded,
        prefsRef,
        updatePreferences,
    };
}
