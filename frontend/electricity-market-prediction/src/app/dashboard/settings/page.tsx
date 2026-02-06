'use client';

import { useRouter } from 'next/navigation';
import { Box, Typography, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        p: 3,
        maxWidth: 800,
        mx: 'auto',
      }}
    >
      <Link
        component="button"
        variant="body2"
        onClick={() => router.push('/dashboard')}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: 'var(--primary)',
          textDecoration: 'none',
          mb: 2,
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 18 }} />
        返回首頁
      </Link>

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
        <SettingsIcon />
        個人設定
      </Typography>

      <Typography variant="body2" sx={{ color: 'var(--muted)', lineHeight: 1.7 }}>
        此功能開發中，敬請期待。
      </Typography>
    </Box>
  );
}
