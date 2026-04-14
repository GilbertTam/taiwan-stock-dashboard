'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import LanguageIcon from '@mui/icons-material/Language';
import TuneIcon from '@mui/icons-material/Tune';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTheme, type Locale, type ThemePreference } from '@/app/ThemeProvider';
import { useTranslation } from 'react-i18next';

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

const LOCALE_LABELS: Record<Locale, string> = {
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
  const { themePreference, setThemePreference, darkMode, locale, setLocale } = useTheme();
  const { t } = useTranslation('settings');

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
          pb: 1,
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

      <DialogContent sx={{ px: 3, pb: 3, pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            value={locale}
            exclusive
            onChange={(_, value) => { if (value) setLocale(value as Locale); }}
            size="small"
            sx={toggleButtonGroupSx}
          >
            {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([value, label]) => (
              <ToggleButton key={value} value={value}>
                {label}
              </ToggleButton>
            ))}
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
      </DialogContent>
    </Dialog>
  );
}
