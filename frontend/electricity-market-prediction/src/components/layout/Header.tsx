'use client';

import { useState } from 'react';
import {
    Logout as LogoutIcon,
    Person as PersonIcon,
    LightMode as LightModeIcon,
    DarkMode as DarkModeIcon
} from '@mui/icons-material';
import {
    IconButton, Tooltip, Avatar, Menu, MenuItem, Divider,
    ListItemIcon, Box, AppBar, Toolbar, Typography, Stack, ButtonBase
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/app/ThemeProvider';

const Header = () => {
    const { user, logout } = useAuth();
    const { darkMode, setDarkMode } = useTheme();

    // State for User Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    const handleThemeToggle = () => {
        setDarkMode(!darkMode);
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                backgroundColor: 'var(--header-bg)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--card-border)',
                zIndex: 30, // low z-index but above content
                height: '64px',
                justifyContent: 'center'
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
                {/* Left Side: Title / Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span">
                            <Typography component="span" variant="inherit" color="primary.main" fontWeight="bold">
                                HDJP Electricity Market Dashboard
                            </Typography>
                        </Box>
                    </Typography>
                </Box>

                {/* Right Side: Controls */}
                <Stack direction="row" spacing={3} alignItems="center">

                    {/* Theme Toggle Switch */}
                    <Box
                        onClick={handleThemeToggle}
                        sx={{
                            position: 'relative',
                            width: 52,
                            height: 28,
                            borderRadius: 14,
                            cursor: 'pointer',
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                            border: '1px solid',
                            borderColor: darkMode ? 'rgba(255,255,255,0.2)' : '#bdbdbd',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            px: 0.5
                        }}
                    >
                        {/* Background Icons */}
                        <Box sx={{ position: 'absolute', left: 6, top: 4, opacity: darkMode ? 1 : 0, transition: 'opacity 0.3s' }}>
                            <DarkModeIcon sx={{ fontSize: 16, color: '#fbbf24' }} />
                        </Box>
                        <Box sx={{ position: 'absolute', right: 6, top: 4, opacity: !darkMode ? 1 : 0, transition: 'opacity 0.3s' }}>
                            <LightModeIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                        </Box>

                        {/* Sliding Knob */}
                        <Box
                            sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: darkMode ? 'var(--primary)' : '#fff',
                                boxShadow: 2,
                                transform: darkMode ? 'translateX(24px)' : 'translateX(0)',
                                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1
                            }}
                        >
                            {darkMode
                                ? <DarkModeIcon sx={{ fontSize: 12, color: 'black' }} />
                                : <LightModeIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                            }
                        </Box>
                    </Box>

                    {/* Separator */}
                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--card-border)', height: 24, my: 'auto' }} />

                    {/* User Profile Pill */}
                    <Tooltip title="Account Settings">
                        <ButtonBase
                            onClick={handleMenuClick}
                            sx={{
                                borderRadius: 20,
                                pl: 2,
                                pr: 0.5,
                                py: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.08)'
                                        : 'rgba(0, 0, 0, 0.04)'
                                }
                            }}
                        >
                            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', lineHeight: 1.2 }}>
                                    {user || 'Guest'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                    Admin
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: '2px',
                                    borderRadius: '50%',
                                    background: open
                                        ? 'linear-gradient(45deg, var(--primary), var(--secondary))'
                                        : (theme) => theme.palette.divider,
                                    transition: 'background 0.3s'
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: 'background.paper',
                                        color: 'text.primary',
                                        fontWeight: 'bold',
                                        border: '2px solid transparent'
                                    }}
                                >
                                    {user ? user.charAt(0).toUpperCase() : <PersonIcon />}
                                </Avatar>
                            </Box>
                        </ButtonBase>
                    </Tooltip>

                    {/* Dropdown Menu */}
                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleMenuClose}
                        onClick={handleMenuClose}
                        PaperProps={{
                            elevation: 0,
                            sx: {
                                overflow: 'visible',
                                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                mt: 1.5,
                                bgcolor: 'var(--card-bg)',
                                color: 'var(--foreground)',
                                border: '1px solid var(--card-border)',
                                backdropFilter: 'blur(10px)',
                                '& .MuiAvatar-root': {
                                    width: 32,
                                    height: 32,
                                    ml: -0.5,
                                    mr: 1,
                                },
                                '&:before': {
                                    content: '""',
                                    display: 'block',
                                    position: 'absolute',
                                    top: 0,
                                    right: 14,
                                    width: 10,
                                    height: 10,
                                    bgcolor: 'var(--card-bg)',
                                    transform: 'translateY(-50%) rotate(45deg)',
                                    zIndex: 0,
                                    borderLeft: '1px solid var(--card-border)',
                                    borderTop: '1px solid var(--card-border)',
                                },
                            },
                        }}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                        <MenuItem onClick={handleMenuClose} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                            <Avatar sx={{ bgcolor: 'transparent', color: 'var(--foreground)' }} /> Profile
                        </MenuItem>
                        <Divider sx={{ borderColor: 'var(--card-border)' }} />
                        <MenuItem onClick={handleLogout} sx={{ color: '#ff4d4d', '&:hover': { bgcolor: 'rgba(255,77,77,0.1)' } }}>
                            <ListItemIcon>
                                <LogoutIcon fontSize="small" sx={{ color: '#ff4d4d' }} />
                            </ListItemIcon>
                            Logout
                        </MenuItem>
                    </Menu>
                </Stack>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
