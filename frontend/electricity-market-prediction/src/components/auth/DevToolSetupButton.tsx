'use client';

import { useState } from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import { createDefaultAdmin } from '@/services/authApi';

interface DevToolSetupButtonProps {
  onSetupComplete: () => void;
}

export function DevToolSetupButton({ onSetupComplete }: DevToolSetupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await createDefaultAdmin();
      onSetupComplete();
    } catch {
      setError('建立預設帳號失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 1.5, width: '100%', maxWidth: 380 }}>
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 1,
            py: 0.5,
            backgroundColor: 'color-mix(in srgb, var(--error) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--error) 40%, transparent)',
            color: 'var(--error)',
            fontSize: 12,
            '& .MuiAlert-icon': { color: 'var(--error)' },
          }}
        >
          {error}
        </Alert>
      )}
      <Button
        fullWidth
        variant="outlined"
        onClick={handleClick}
        disabled={isLoading}
        startIcon={
          isLoading
            ? <CircularProgress size={14} sx={{ color: 'var(--text-secondary)' }} />
            : <BugReportOutlinedIcon sx={{ fontSize: 16 }} />
        }
        sx={{
          py: 0.75,
          borderRadius: 1,
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'none',
          borderColor: 'var(--card-border)',
          color: 'var(--text-secondary)',
          '&:hover': {
            borderColor: 'var(--primary)',
            color: 'var(--primary)',
            backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)',
          },
          '&.Mui-disabled': {
            borderColor: 'var(--card-border)',
            color: 'var(--text-secondary)',
            opacity: 0.5,
          },
        }}
      >
        Dev: admin / 1234 快速設定
      </Button>
    </Box>
  );
}
