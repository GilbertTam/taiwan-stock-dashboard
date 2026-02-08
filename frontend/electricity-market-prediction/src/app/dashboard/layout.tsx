'use client';

import DashboardLayout from '@/shared/components/layout/DashboardLayout';
import { MarketDataProvider } from '@/context/MarketDataContext';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <MarketDataProvider>
            <DashboardLayout>{children}</DashboardLayout>
        </MarketDataProvider>
    );
}
