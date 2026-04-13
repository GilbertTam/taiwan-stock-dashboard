'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { MarketDataProvider } from '@/context/MarketDataContext';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useTheme } from '@/app/ThemeProvider';

function DashboardWithModal({ children }: { children: React.ReactNode }) {
    const { settingsOpen, setSettingsOpen } = useTheme();
    return (
        <>
            <DashboardLayout>{children}</DashboardLayout>
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </>
    );
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <MarketDataProvider>
            <DashboardWithModal>{children}</DashboardWithModal>
        </MarketDataProvider>
    );
}
