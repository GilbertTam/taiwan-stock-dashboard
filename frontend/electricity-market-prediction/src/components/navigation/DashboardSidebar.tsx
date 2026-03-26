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
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS: { key: string; label: string; path: string; Icon: React.ElementType }[] = [
    { key: 'home',            label: '現貨總覽', path: '/dashboard',                  Icon: DashboardIcon          },
    { key: 'price',           label: '市場分析', path: '/dashboard/forecast',         Icon: TrendingUpIcon         },
    { key: 'generation-mix',  label: '發電組合', path: '/dashboard/generation-mix',   Icon: EnergySavingsLeafIcon  },
    { key: 'site-revenue',    label: '案場收益', path: '/dashboard/site-revenue',     Icon: StorefrontIcon         },
    { key: 'weather',         label: '天氣分析', path: '/dashboard/weather',          Icon: WbSunnyIcon            },
];

const COLLAPSED_W = 60;
const EXPANDED_W  = 200;
// Fixed icon slot width = collapsed sidebar width (icon always centered in same spot)
const ICON_SLOT_W = COLLAPSED_W;

export function DashboardSidebar() {
    const router   = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
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
                background: 'rgba(10,13,20,0.96)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
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

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* ── Nav items ── */}
            <Box sx={{ flex: 1, py: 0.5, display: 'flex', flexDirection: 'column' }}>
                {NAV_ITEMS.map(({ key, label, path, Icon }) => {
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
                                    backgroundColor: isActive ? 'rgba(0,204,122,0.18)' : 'rgba(255,255,255,0.05)',
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

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

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
                            管理員
                        </Typography>
                    </Box>
                </Box>

                {/* Settings */}
                <ButtonBase
                    disableRipple
                    title={!expanded ? '個人設定' : undefined}
                    onClick={() => router.push('/dashboard/settings')}
                    sx={{
                        width: '100%',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexShrink: 0,
                        transition: 'background-color 0.15s ease',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                >
                    <Box sx={{ width: ICON_SLOT_W, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        <SettingsIcon sx={{ fontSize: 18, color: 'var(--muted)' }} />
                    </Box>
                    <Typography
                        component="span"
                        sx={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap', opacity: expanded ? 1 : 0, transition: 'opacity 0.15s ease' }}
                    >
                        個人設定
                    </Typography>
                </ButtonBase>

                {/* Logout */}
                <ButtonBase
                    disableRipple
                    title={!expanded ? '登出' : undefined}
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
                        登出
                    </Typography>
                </ButtonBase>
            </Box>
        </Box>
    );
}
