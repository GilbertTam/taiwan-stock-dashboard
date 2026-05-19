'use client';

import { useEffect } from 'react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { MarketDataProvider } from '@/context/MarketDataContext';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useTheme, type SettingsTab } from '@/app/ThemeProvider';

// Key for the one-shot handoff: the OAuth bridge writes which tab the
// dashboard should pop the Settings modal on after a successful bind.
const SETTINGS_TAB_FLAG = 'hdjp-settings-tab-on-mount';

function DashboardWithModal({ children }: { children: React.ReactNode }) {
    const { settingsOpen, setSettingsOpen, openSettings } = useTheme();

    // Consume the one-shot OAuth-bridge handoff exactly once on mount.
    // Effect runs after the layout mounts (i.e. after navigating in from
    // /oauth/callback), reads the flag, clears it, and opens the modal
    // on the requested tab. Cleared immediately so refreshing the page
    // doesn't re-pop the modal.
    useEffect(() => {
        const flag = sessionStorage.getItem(SETTINGS_TAB_FLAG);
        if (flag === 'account' || flag === 'preferences') {
            sessionStorage.removeItem(SETTINGS_TAB_FLAG);
            openSettings(flag as SettingsTab);
        }
        // openSettings is stable across renders for our purposes; eslint
        // exhaustive-deps would force us to include it, but doing so risks
        // re-firing if the provider ever produces a new identity. One-shot
        // by design.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <DashboardLayout>{children}</DashboardLayout>
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </>
    );
}

export default function Layout({ children }: { children: React.ReactNode }) {
    // RouteGuard wraps everything UNDER /dashboard, including sub-paths like
    // /dashboard/data-status (previously unguarded) and the new
    // /dashboard/admin (admin-only). It runs before MarketDataProvider's data
    // fetches kick off, so unauthenticated users don't trigger API calls.
    return (
        <RouteGuard>
            <MarketDataProvider>
                <DashboardWithModal>{children}</DashboardWithModal>
            </MarketDataProvider>
        </RouteGuard>
    );
}
