/**
 * 設定頁 | Settings page — user preferences (theme, etc.).
 */
'use client';

import { Box, Paper, Typography, Switch, FormControlLabel } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PreferencesIcon from '@mui/icons-material/Tune';
import { DashboardSubPageLayout } from '@/components/layout/DashboardSubPageLayout';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { useTheme } from '@/app/ThemeProvider';

const sectionCardSx = {
  position: 'relative' as const,
  p: 2.5,
  mb: 2,
  borderRadius: 1.5,
  border: '1px solid var(--card-border)',
  backgroundColor: 'var(--card-bg)',
  backdropFilter: 'blur(12px)',
  overflow: 'hidden',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    borderColor: 'var(--primary)',
  },
};

const sectionTitleSx = {
  fontWeight: 700,
  color: 'var(--foreground)',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  mb: 1.5,
  borderLeft: '3px solid var(--primary)',
  pl: 1.5,
  ml: -0.25,
};

function GradientBar() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
      }}
    />
  );
}

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, p: 0.5 }}>
        <DashboardToolbar variant="minimal" />
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <DashboardSubPageLayout title="個人設定" icon={<SettingsIcon />} backHref="/dashboard">
          {/* 顯示 */}
          <Paper elevation={0} sx={sectionCardSx}>
            <GradientBar />
            <Typography variant="subtitle1" sx={sectionTitleSx}>
              <DarkModeIcon fontSize="small" />
              顯示
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
              切換介面為深色或淺色主題。
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(_, checked) => setDarkMode(checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'var(--primary)',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: 'var(--primary)',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'var(--foreground)', fontWeight: 500 }}>
                  {darkMode ? '深色模式' : '淺色模式'}
                </Typography>
              }
            />
          </Paper>

          {/* 偏好（即將推出） */}
          <Paper
            elevation={0}
            sx={{ ...sectionCardSx, mb: 0 }}
          >
            <GradientBar />
            <Typography variant="subtitle1" sx={sectionTitleSx}>
              <PreferencesIcon fontSize="small" />
              偏好設定
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              預設日期範圍、時區顯示等設定即將推出，敬請期待。
            </Typography>
          </Paper>
        </DashboardSubPageLayout>
      </Box>
    </Box>
  );
}
