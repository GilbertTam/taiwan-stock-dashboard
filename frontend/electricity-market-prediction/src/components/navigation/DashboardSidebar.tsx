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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import LanguageIcon from '@mui/icons-material/Language';
import type { ThemePreference, LocalePreference } from '@/app/ThemeProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/app/ThemeProvider';
import { useTranslation } from 'react-i18next';

type NavItem = { key: string; labelKey: string; path: string; Icon: React.ElementType };

const BASE_NAV_ITEMS: NavItem[] = [
    { key: 'home',            labelKey: 'sidebar.overview',      path: '/dashboard',                  Icon: DashboardIcon          },
    { key: 'price',           labelKey: 'sidebar.forecast',      path: '/dashboard/forecast',         Icon: TrendingUpIcon         },
    { key: 'generation-mix',  labelKey: 'sidebar.generationMix', path: '/dashboard/generation-mix',   Icon: EnergySavingsLeafIcon  },
    { key: 'site-revenue',    labelKey: 'sidebar.siteRevenue',   path: '/dashboard/site-revenue',     Icon: StorefrontIcon         },
    { key: 'weather',         labelKey: 'sidebar.weather',       path: '/dashboard/weather',          Icon: WbSunnyIcon            },
    { key: 'daily-compare',   labelKey: 'sidebar.dailyCompare',  path: '/dashboard/daily-compare',    Icon: LayersIcon             },
    { key: 'data-status',     labelKey: 'sidebar.dataStatus',    path: '/dashboard/data-status',      Icon: MonitorHeartIcon       },
];

// Appended only for superusers; matched by `pathname.startsWith('/dashboard/admin')`.
const ADMIN_NAV_ITEM: NavItem = {
    key: 'admin', labelKey: 'sidebar.adminPage', path: '/dashboard/admin', Icon: AdminPanelSettingsIcon,
};

const COLLAPSED_W = 60;
const EXPANDED_W  = 200;
// Fixed icon slot width = collapsed sidebar width (icon always centered in same spot)
const ICON_SLOT_W = COLLAPSED_W;

const THEME_OPTIONS: { value: ThemePreference; Icon: React.ElementType }[] = [
    { value: 'dark',   Icon: Brightness4Icon },
    { value: 'light',  Icon: Brightness7Icon },
    { value: 'system', Icon: SettingsBrightnessIcon },
];

const LANG_OPTIONS: { value: LocalePreference; label: string }[] = [
    { value: 'zh-TW',  label: '中' },
    { value: 'en',     label: 'EN' },
    { value: 'ja',     label: '日' },
    { value: 'system', label: 'Auto' },
];

const THEME_ICON_MAP: Record<ThemePreference, React.ElementType> = {
    dark: Brightness4Icon,
    light: Brightness7Icon,
    system: SettingsBrightnessIcon,
};

function SegmentedIcons<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; Icon: React.ElementType }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <Box sx={{ display: 'flex', gap: '2px', p: '2px', borderRadius: '7px', background: 'var(--subtle-bg)' }}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <ButtonBase
                        key={opt.value}
                        disableRipple
                        onClick={() => onChange(opt.value)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 24,
                            borderRadius: '5px',
                            transition: 'all 0.15s ease',
                            backgroundColor: active ? 'rgba(0,204,122,0.12)' : 'transparent',
                            color: active ? 'var(--primary)' : 'var(--muted)',
                            '&:hover': { backgroundColor: active ? 'rgba(0,204,122,0.18)' : 'var(--hover-bg)' },
                        }}
                    >
                        <opt.Icon sx={{ fontSize: 14 }} />
                    </ButtonBase>
                );
            })}
        </Box>
    );
}

function SegmentedText<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <Box sx={{ display: 'flex', gap: '2px', p: '2px', borderRadius: '7px', background: 'var(--subtle-bg)' }}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <ButtonBase
                        key={opt.value}
                        disableRipple
                        onClick={() => onChange(opt.value)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 28,
                            height: 24,
                            px: 0.5,
                            borderRadius: '5px',
                            transition: 'all 0.15s ease',
                            backgroundColor: active ? 'rgba(0,204,122,0.12)' : 'transparent',
                            color: active ? 'var(--primary)' : 'var(--muted)',
                            fontSize: 11,
                            fontWeight: active ? 700 : 500,
                            '&:hover': { backgroundColor: active ? 'rgba(0,204,122,0.18)' : 'var(--hover-bg)' },
                        }}
                    >
                        {opt.label}
                    </ButtonBase>
                );
            })}
        </Box>
    );
}

export function DashboardSidebar() {
    const router   = useRouter();
    const pathname = usePathname();
    const { user, logout, isSuperuser } = useAuth();
    // Show admin entry only for superusers — guarded again by RouteGuard
    // on /dashboard/admin paths, so this is just UI gating.
    const navItems: NavItem[] = isSuperuser ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;
    const { darkMode, themePreference, setThemePreference, localePreference, setLocale, setSettingsOpen } = useTheme();
    const { t } = useTranslation('navigation');
    const [expanded, setExpanded] = useState(false);

    const avatarLetter = user ? user.charAt(0).toUpperCase() : null;

    // Current theme icon for collapsed state
    const CurrentThemeIcon = THEME_ICON_MAP[themePreference];

    // Cycle helpers for collapsed click
    const cycleTheme = () => {
        const order: ThemePreference[] = ['dark', 'light', 'system'];
        const next = order[(order.indexOf(themePreference) + 1) % order.length];
        setThemePreference(next);
    };
    const cycleLang = () => {
        const order: LocalePreference[] = ['zh-TW', 'en', 'ja', 'system'];
        const next = order[(order.indexOf(localePreference) + 1) % order.length];
        setLocale(next);
    };

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
                {navItems.map(({ key, labelKey, path, Icon }) => {
                    const label = t(labelKey);
                    const isActive =
                        pathname === path ||
                        (key === 'price'           && pathname.startsWith('/dashboard/forecast'))          ||
                        (key === 'generation-mix'  && pathname.startsWith('/dashboard/generation-mix'))    ||
                        (key === 'weather'         && pathname.startsWith('/dashboard/weather'))            ||
                        (key === 'site-revenue'    && pathname.startsWith('/dashboard/site-revenue'))      ||
                        (key === 'admin'           && pathname.startsWith('/dashboard/admin'));

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
                            {isSuperuser ? t('sidebar.admin') : t('sidebar.user')}
                        </Typography>
                    </Box>
                </Box>

                {/* Theme segmented control */}
                <Box
                    sx={{
                        width: '100%',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                    }}
                >
                    <Box
                        component={expanded ? 'div' : ButtonBase}
                        {...(!expanded && { disableRipple: true, onClick: cycleTheme })}
                        title={!expanded ? t('sidebar.theme') : undefined}
                        sx={{
                            width: ICON_SLOT_W,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexShrink: 0,
                            ...(!expanded && {
                                height: 40,
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'var(--hover-bg)' },
                                transition: 'background-color 0.15s ease',
                            }),
                        }}
                    >
                        <CurrentThemeIcon sx={{ fontSize: 18, color: 'var(--muted)' }} />
                    </Box>
                    <Box sx={{ opacity: expanded ? 1 : 0, pointerEvents: expanded ? 'auto' : 'none', transition: 'opacity 0.15s ease' }}>
                        <SegmentedIcons options={THEME_OPTIONS} value={themePreference} onChange={setThemePreference} />
                    </Box>
                </Box>

                {/* Language segmented control */}
                <Box
                    sx={{
                        width: '100%',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                    }}
                >
                    <Box
                        component={expanded ? 'div' : ButtonBase}
                        {...(!expanded && { disableRipple: true, onClick: cycleLang })}
                        title={!expanded ? t('sidebar.language') : undefined}
                        sx={{
                            width: ICON_SLOT_W,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexShrink: 0,
                            ...(!expanded && {
                                height: 40,
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'var(--hover-bg)' },
                                transition: 'background-color 0.15s ease',
                            }),
                        }}
                    >
                        <LanguageIcon sx={{ fontSize: 18, color: 'var(--muted)' }} />
                    </Box>
                    <Box sx={{ opacity: expanded ? 1 : 0, pointerEvents: expanded ? 'auto' : 'none', transition: 'opacity 0.15s ease' }}>
                        <SegmentedText options={LANG_OPTIONS} value={localePreference} onChange={setLocale} />
                    </Box>
                </Box>

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
