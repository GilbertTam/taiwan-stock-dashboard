'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';

/**
 * Single chokepoint for protecting /dashboard/* pages.
 *
 * Mounted once in `app/dashboard/layout.tsx`, so every dashboard page is
 * guarded — closes the existing gap where sub-pages like
 * `/dashboard/data-status` had NO auth check and could be reached by URL
 * while signed out.
 *
 * Three states are handled, in order:
 *
 *   1. `isLoading`  — first /account/me hydration is still in flight.
 *                     Render <LoadingOverlay/> so we DON'T flash the login
 *                     page for a frame (which the old immediate-redirect
 *                     pattern did).
 *   2. unauthenticated — redirect to /login.
 *   3. /dashboard/admin* and not superuser — redirect to /dashboard.
 *
 * All hooks are declared before any conditional return per CLAUDE.md.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isSuperuser, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const isAdminPath = (pathname ?? '').startsWith('/dashboard/admin');

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.replace('/login');
            return;
        }
        if (isAdminPath && !isSuperuser) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, isAdminPath, isLoading, isSuperuser, router]);

    if (isLoading) return <LoadingOverlay />;
    if (!isAuthenticated) return <LoadingOverlay />;
    if (isAdminPath && !isSuperuser) return <LoadingOverlay />;

    return <>{children}</>;
}
