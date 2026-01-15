import React from 'react';
import { Box, Typography, IconButton, Paper, Avatar } from '@mui/material';
import { Brightness4, Brightness7, Person, Logout } from '@mui/icons-material';
import { useTheme } from '@/app/ThemeProvider';
import { useAuth } from '@/context/AuthContext';

const DashboardHeader: React.FC = () => {
    const { darkMode, setDarkMode } = useTheme();
    const { user, logout } = useAuth();

    const toggleTheme = () => setDarkMode(!darkMode);

    const colors = {
        text: darkMode ? '#d9d9d9' : '#000000',
        subText: darkMode ? '#a6a6a6' : '#595959',
        headerBg: darkMode ? '#1f1f1f' : '#f5f5f5',
    };

    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            p: 2,
            backgroundColor: colors.headerBg,
            borderRadius: 1
        }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: colors.text, mb: 0 }}>
                Spot Price Dashboard
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {user && (
                    <Paper elevation={0} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 0.5,
                        backgroundColor: 'transparent',
                        border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`
                    }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                            <Person sx={{ fontSize: '1rem' }} />
                        </Avatar>
                        <Typography variant="body2" sx={{ color: colors.text }}>
                            {user}
                        </Typography>
                        <IconButton size="small" onClick={logout} title="Logout">
                            <Logout fontSize="small" />
                        </IconButton>
                    </Paper>
                )}

                <IconButton onClick={toggleTheme} color="inherit">
                    {darkMode ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
            </Box>
        </Box>
    );
};

export default DashboardHeader;
