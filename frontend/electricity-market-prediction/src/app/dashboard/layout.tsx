'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { MarketDataProvider } from '@/context/MarketDataContext';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <MarketDataProvider>
            <DashboardLayout>{children}</DashboardLayout>
        </MarketDataProvider>
    );
}
