'use client';

import React, { useState } from 'react';
import { Box, Typography, ButtonBase, Avatar, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import LayersIcon from '@mui/icons-material/Layers';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/app/ThemeProvider';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS: { key: string; labelKey: string; path: string; Icon: React.ElementType }[] = [
    { key: 'home',            labelKey: 'sidebar.overview',      path: '/dashboard',                  Icon: DashboardIcon          },
    { key: 'price',           labelKey: 'sidebar.forecast',      path: '/dashboard/forecast',         Icon: TrendingUpIcon         },
    { key: 'generation-mix',  labelKey: 'sidebar.generationMix', path: '/dashboard/generation-mix',   Icon: EnergySavingsLeafIcon  },
    { key: 'site-revenue',    labelKey: 'sidebar.siteRevenue',   path: '/dashboard/site-revenue',     Icon: StorefrontIcon         },
    { key: 'weather',         labelKey: 'sidebar.weather',       path: '/dashboard/weather',          Icon: WbSunnyIcon            },
    { key: 'daily-compare',   labelKey: 'sidebar.dailyCompare',  path: '/dashboard/daily-compare',    Icon: LayersIcon             },
    { key: 'data-status',     labelKey: 'sidebar.dataStatus',    path: '/dashboard/data-status',      Icon: MonitorHeartIcon       },
];

const COLLAPSED_W = 60;
const EXPANDED_W  = 200;
// Fixed icon slot width = collapsed sidebar width (icon always centered in same spot)
const ICON_SLOT_W = COLLAPSED_W;

export function DashboardSidebar() {
    const router   = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { darkMode, setDarkMode, setSettingsOpen } = useTheme();
    const { t } = useTranslation('navigation');
    const [expanded, setExpanded] = useState(false);

    const avatarLetter = user ? user.charAt(0).toUpperCase() : null;

    return (
        <Box
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                width: expanded ? EXPANDED_W : COLLAPSED_W,
                transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
                zIndex: 1200,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--sidebar-bg)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRight: '1px solid var(--sidebar-border)',
                overflow: 'hidden',
            }}
        >
            {/* ── Brand ── */}
            <ButtonBase
                disableRipple
                onClick={() => router.push('/dashboard')}
                sx={{
                    width: '100%',
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexShrink: 0,
                    '&:hover .brand-icon': { color: 'var(--primary)' },
                }}
            >
                {/* Fixed icon slot */}
                <Box sx={{ width: ICON_SLOT_W, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <ElectricBoltIcon
                        className="brand-icon"
                        sx={{ fontSize: 18, color: '#00cc7a', transition: 'color 0.15s ease', filter: 'drop-shadow(0 0 6px rgba(0,204,122,0.4))' }}
                    />
                </Box>
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: 'var(--foreground)',
                        fontFamily: 'monospace',
                        letterSpacing: 1.5,
                        whiteSpace: 'nowrap',
                        opacity: expanded ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                    }}
                >
                    HDRE
                </Typography>
            </ButtonBase>

            <Divider sx={{ borderColor: 'var(--sidebar-border)', flexShrink: 0 }} />

            {/* ── Nav items ── */}
            <Box sx={{ flex: 1, py: 0.5, display: 'flex', flexDirection: 'column' }}>
                {NAV_ITEMS.map(({ key, labelKey, path, Icon }) => {
                    const label = t(labelKey);
                    const isActive =
                        pathname === path ||
                        (key === 'price'           && pathname.startsWith('/dashboard/forecast'))          ||
                        (key === 'generation-mix'  && pathname.startsWith('/dashboard/generation-mix'))    ||
                        (key === 'weather'         && pathname.startsWith('/dashboard/weather'))            ||
                        (key === 'site-revenue'    && pathname.startsWith('/dashboard/site-revenue'));

                    return (
                        <ButtonBase
                            key={key}
                            disableRipple
                            title={!expanded ? label : undefined}
                            onClick={() => router.push(path)}
                            sx={{
                                width: '100%',
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                flexShrink: 0,
                                backgroundColor: isActive ? 'rgba(0,204,122,0.12)' : 'transparent',
                                borderLeft: 'none',
                                transition: 'background-color 0.15s ease',
                                '&:hover': {
                                    backgroundColor: isActive ? 'rgba(0,204,122,0.18)' : 'var(--hover-bg)',
                                },
                            }}
                        >
                            {/* Fixed icon slot */}
                            <Box sx={{ width: ICON_SLOT_W, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                <Icon
                                    sx={{
                                        fontSize: 18,
                                        color: isActive ? 'var(--primary)' : 'var(--muted)',
                                        transition: 'color 0.15s ease',
                                    }}
                                />
                            </Box>
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: 13,
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? 'var(--primary)' : 'var(--muted)',
                                    whiteSpace: 'nowrap',
                                    opacity: expanded ? 1 : 0,
                                    transition: 'opacity 0.15s ease',
                                    letterSpacing: 0.2,
                                }}
                            >
                                {label}
                            </Typography>
                        </ButtonBase>
                    );
                })}
            </Box>

            <Divider sx={{ borderColor: 'var(--sidebar-border)', flexShrink: 0 }} />

            {/* ── Profile section ── */}
            <Box sx={{ flexShrink: 0, py: 0.5, display: 'flex', flexDirection: 'column' }}>
                {/* User info */}
                <Box
                    sx={{
                        width: '100%',
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Box sx={{ width: ICON_SLOT_W, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        <Avatar
                            sx={{
                                width: 18,
                                height: 18,
                                bgcolor: 'var(--primary)',
                                color: 'black',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                            }}
                        >
                            {avatarLetter ?? <PersonIcon sx={{ fontSize: 13 }} />}
                        </Avatar>
                    </Box>
                    <Box sx={{ minWidth: 0, opacity: expanded ? 1 : 0, transition: 'opacity 0.15s ease' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                            {user || 'Guest'}
                        </Typography>
                        <Typography sx={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                            {t('sidebar.admin')}
                        </Typography>
                    </Box>
                </Box>

                {/* Theme toggle */}
                <ButtonBase
                    disableRipple
                    title={!expanded ? t(darkMode ? 'sidebar.lightMode' : 'sidebar.darkMode') : undefined}
                    onClick={() => setDarkMode(!darkMode)}
                    sx={{
                        width: '100%',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        transition: 'background-color 0.15s ease',
                        '&:hover': { backgroundColor: 'var(--hover-bg)' },
                    }}
                >
                    <Box sx={{ width: ICON_SLOT_W, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        {darkMode
                            ? <Brightness7Icon sx={{ fontSize: 18, color: 'var(--muted)' }} />
                            : <Brightness4Icon sx={{ fontSize: 18, color: 'var(--muted)' }} />
                        }
                    </Box>
                    <Typography
                        component="span"
                        sx={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap', opacity: expanded ? 1 : 0, transition: 'opacity 0.15s ease' }}
                    >
                        {t(darkMode ? 'sidebar.lightMode' : 'sidebar.darkMode')}
                    </Typography>
                </ButtonBase>

                {/* Settings → opens modal */}
                <ButtonBase
                    disableRipple
                    title={!expanded ? t('sidebar.settings') : undefined}
                    onClick={() => setSettingsOpen(true)}
                    sx={{
                        width: '100%',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        transition: 'background-color 0.15s ease',
                        '&:hover': { backgroundColor: 'var(--hover-bg)' },
                    }}
                >
                    <Box sx={{ width: ICON_SLOT_W, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        <SettingsIcon sx={{ fontSize: 18, color: 'var(--muted)' }} />
                    </Box>
                    <Typography
                        component="span"
                        sx={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap', opacity: expanded ? 1 : 0, transition: 'opacity 0.15s ease' }}
                    >
                        {t('sidebar.settings')}
                    </Typography>
                </ButtonBase>

                {/* Logout */}
                <ButtonBase
                    disableRipple
                    title={!expanded ? t('sidebar.logout') : undefined}
                    onClick={logout}
                    sx={{
                        width: '100%',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        transition: 'background-color 0.15s ease',
                        '&:hover': { backgroundColor: 'rgba(239,68,68,0.07)' },
                    }}
                >
                    <Box sx={{ width: ICON_SLOT_W, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        <LogoutIcon sx={{ fontSize: 18, color: 'rgba(248,113,113,0.7)' }} />
                    </Box>
                    <Typography
                        component="span"
                        sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(248,113,113,0.7)', whiteSpace: 'nowrap', opacity: expanded ? 1 : 0, transition: 'opacity 0.15s ease' }}
                    >
                        {t('sidebar.logout')}
                    </Typography>
                </ButtonBase>
            </Box>
        </Box>
    );
}
