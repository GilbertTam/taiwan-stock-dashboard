'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import LanguageIcon from '@mui/icons-material/Language';
import TuneIcon from '@mui/icons-material/Tune';
import SettingsIcon from '@mui/icons-material/Settings';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { useTheme, type LocalePreference, type SettingsTab, type ThemePreference } from '@/app/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { AccountSettingsPanel } from '@/components/account';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const sectionCardSx = {
  position: 'relative' as const,
  p: 2.5,
  borderRadius: 1.5,
  border: '1px solid var(--subtle-border)',
  backgroundColor: 'var(--subtle-bg)',
  overflow: 'hidden',
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
        height: 2,
        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
      }}
    />
  );
}

const LOCALE_LABELS: Record<Exclude<LocalePreference, 'system'>, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
};

const THEME_ICONS: Record<ThemePreference, typeof DarkModeIcon> = {
  dark: DarkModeIcon,
  light: LightModeIcon,
  system: SettingsBrightnessIcon,
};

const toggleButtonGroupSx = {
  gap: 1,
  '& .MuiToggleButton-root': {
    border: '1px solid var(--subtle-border-medium)',
    borderRadius: '6px !important',
    color: 'var(--muted)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    px: 2,
    py: 0.75,
    textTransform: 'none',
    '&.Mui-selected': {
      backgroundColor: 'var(--primary-alpha-12)',
      borderColor: 'var(--primary)',
      color: 'var(--primary)',
      '&:hover': { backgroundColor: 'var(--primary-alpha-18)' },
    },
    '&:hover': { backgroundColor: 'var(--subtle-bg-hover)', borderColor: 'var(--subtle-border-medium)' },
  },
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  // CLAUDE.md — all hooks before any conditional return.
  const { themePreference, setThemePreference, localePreference, setLocale, settingsInitialTab } =
    useTheme();
  const { t } = useTranslation('settings');
  const [tab, setTab] = useState<SettingsTab>(settingsInitialTab);

  // Resync local tab state every time the modal opens so callers that target
  // a specific tab (e.g. UserMenu's "Account Settings" → 'account') land on
  // the right one even if the user previously closed the modal on another tab.
  useEffect(() => {
    if (open) setTab(settingsInitialTab);
  }, [open, settingsInitialTab]);

  const ThemeIcon = THEME_ICONS[themePreference];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'var(--card-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--card-border)',
          borderRadius: 2,
          boxShadow: 'var(--modal-shadow)',
          overflow: 'hidden',
        },
      }}
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' },
        },
      }}
    >
      {/* Top gradient accent bar */}
      <Box
        sx={{
          height: 3,
          background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
          flexShrink: 0,
        }}
      />

      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 0,
          pt: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ color: 'var(--primary)', fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '1rem' }}>
            {t('title')}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'var(--muted)', '&:hover': { color: 'var(--foreground)' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Tabs sit between the title and the panel content so they stay visible
          while the content scrolls if it needs to. */}
      <Box sx={{ px: 3, pt: 1.5 }}>
        <Tabs
          value={tab}
          onChange={(_, next: SettingsTab) => setTab(next)}
          variant="fullWidth"
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              textTransform: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--muted)',
              '&.Mui-selected': { color: 'var(--primary)' },
            },
            '& .MuiTabs-indicator': { backgroundColor: 'var(--primary)' },
          }}
        >
          <Tab
            value="preferences"
            label={t('tabs.preferences')}
            icon={<TuneIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
          <Tab
            value="account"
            label={t('tabs.account')}
            icon={<ManageAccountsIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tab === 'preferences' && (
          <>
            {/* Appearance */}
            <Box sx={sectionCardSx}>
              <GradientBar />
              <Typography variant="subtitle2" sx={sectionTitleSx}>
                <ThemeIcon fontSize="small" />
                {t('appearance.title')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
                {t('appearance.description')}
              </Typography>
              <ToggleButtonGroup
                value={themePreference}
                exclusive
                onChange={(_, value) => { if (value) setThemePreference(value as ThemePreference); }}
                size="small"
                sx={toggleButtonGroupSx}
              >
                <ToggleButton value="light">
                  <LightModeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {t('appearance.lightMode')}
                </ToggleButton>
                <ToggleButton value="dark">
                  <DarkModeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {t('appearance.darkMode')}
                </ToggleButton>
                <ToggleButton value="system">
                  <SettingsBrightnessIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {t('appearance.systemMode')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider sx={{ borderColor: 'var(--subtle-border)' }} />

            {/* Language */}
            <Box sx={sectionCardSx}>
              <GradientBar />
              <Typography variant="subtitle2" sx={sectionTitleSx}>
                <LanguageIcon fontSize="small" />
                {t('language.title')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
                {t('language.description')}
              </Typography>
              <ToggleButtonGroup
                value={localePreference}
                exclusive
                onChange={(_, value) => { if (value) setLocale(value as LocalePreference); }}
                size="small"
                sx={toggleButtonGroupSx}
              >
                {(Object.entries(LOCALE_LABELS) as [string, string][]).map(([value, label]) => (
                  <ToggleButton key={value} value={value}>
                    {label}
                  </ToggleButton>
                ))}
                <ToggleButton value="system">
                  <SettingsBrightnessIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {t('language.systemLocale')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider sx={{ borderColor: 'var(--subtle-border)' }} />

            {/* Preferences placeholder */}
            <Box sx={sectionCardSx}>
              <GradientBar />
              <Typography variant="subtitle2" sx={sectionTitleSx}>
                <TuneIcon fontSize="small" />
                {t('preferences.title')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {t('preferences.comingSoon')}
              </Typography>
            </Box>
          </>
        )}

        {tab === 'account' && <AccountSettingsPanel />}
      </DialogContent>
    </Dialog>
  );
}
