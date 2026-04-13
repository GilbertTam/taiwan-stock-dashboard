'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  IconButton,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LanguageIcon from '@mui/icons-material/Language';
import TuneIcon from '@mui/icons-material/Tune';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTheme, type Locale } from '@/app/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const sectionCardSx = {
  position: 'relative' as const,
  p: 2.5,
  borderRadius: 1.5,
  border: '1px solid rgba(255,255,255,0.06)',
  backgroundColor: 'rgba(255,255,255,0.03)',
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

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { darkMode, setDarkMode, locale, setLocale } = useTheme();
  const { t } = useTranslation('settings');

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
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
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
            {darkMode ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            {t('appearance.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
            {t('appearance.description')}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(_, checked) => setDarkMode(checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--primary)' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--primary)' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: 'var(--foreground)', fontWeight: 500 }}>
                {darkMode ? t('appearance.darkMode') : t('appearance.lightMode')}
              </Typography>
            }
          />
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

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
            sx={{
              gap: 1,
              '& .MuiToggleButton-root': {
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px !important',
                color: 'var(--muted)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                px: 2,
                py: 0.75,
                textTransform: 'none',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0,255,157,0.12)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  '&:hover': { backgroundColor: 'rgba(0,255,157,0.18)' },
                },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' },
              },
            }}
          >
            {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([value, label]) => (
              <ToggleButton key={value} value={value}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

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
