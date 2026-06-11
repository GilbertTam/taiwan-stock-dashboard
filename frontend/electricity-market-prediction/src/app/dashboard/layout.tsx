'use client';

import { useEffect } from 'react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useTheme, type SettingsTab } from '@/app/ThemeProvider';

// One-shot handoff key: the OAuth bridge writes which tab the dashboard
// should pop the Settings modal on after a successful bind.
const SETTINGS_TAB_FLAG = 'hdjp-settings-tab-on-mount';

function DashboardWithModal({ children }: { children: React.ReactNode }) {
    const { settingsOpen, setSettingsOpen, openSettings } = useTheme();

    useEffect(() => {
        const flag = sessionStorage.getItem(SETTINGS_TAB_FLAG);
        if (flag === 'account' || flag === 'preferences') {
            sessionStorage.removeItem(SETTINGS_TAB_FLAG);
            openSettings(flag as SettingsTab);
        }
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
    return (
        <RouteGuard>
            <DashboardWithModal>{children}</DashboardWithModal>
        </RouteGuard>
    );
}
