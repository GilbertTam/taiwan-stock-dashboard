/**
 * @fileoverview 儀表板子頁面通用佈局 | Shared layout for dashboard sub-pages (settings, about, etc.)
 *
 * 提供帶有標題和圖示的可重用頁面殼，確保子頁面擁有一致的視覺風格。
 * Provides a reusable page shell with title and icon for consistent sub-page styling.
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { Box, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface DashboardSubPageLayoutProps {
    /** 頁面標題 | Page title */
    title: string;
    /** 標題旁的圖示 | Optional icon next to the title */
    icon?: ReactNode;
    /** 返回連結（例如 /dashboard）| Optional back link for navigation */
    backHref?: string;
    /** 子內容 | Child content */
    children: ReactNode;
}

/**
 * 儀表板子頁面的共用 Layout 元件。
 * Shared layout component for dashboard sub-pages.
 *
 * @example
 * <DashboardSubPageLayout title="設定" icon={<SettingsIcon />} backHref="/dashboard">
 *   <p>Content here</p>
 * </DashboardSubPageLayout>
 */
export function DashboardSubPageLayout({ title, icon, backHref, children }: DashboardSubPageLayoutProps) {
    return (
        <Box
            sx={{
                maxWidth: 720,
                mx: 'auto',
                py: 5,
                px: 3,
            }}
        >
            {backHref && (
                <Box sx={{ mb: 2 }}>
                    <Button
                        component={Link}
                        href={backHref}
                        size="small"
                        startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            color: 'var(--primary)',
                            '&:hover': {
                                backgroundColor: 'var(--hover-bg)',
                            },
                        }}
                    >
                        返回總覽
                    </Button>
                </Box>
            )}
            <Typography
                variant="h5"
                sx={{
                    fontWeight: 700,
                    color: 'var(--foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 3,
                }}
            >
                {icon}
                {title}
            </Typography>
            {children}
        </Box>
    );
}
