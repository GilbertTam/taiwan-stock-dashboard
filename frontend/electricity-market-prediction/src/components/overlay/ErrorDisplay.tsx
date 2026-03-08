import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorDisplayProps {
    message?: string;
    onRetry?: () => void;
    height?: number | string;
}

export function ErrorDisplay({
    message = '發生未知的錯誤',
    onRetry,
    height = '100%'
}: ErrorDisplayProps) {
    return (
        <Box
            sx={{
                height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    textAlign: 'center',
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--error-main, #f44336)',
                    borderRadius: 2,
                    maxWidth: 400,
                    width: '100%',
                }}
            >
                <ErrorOutlineIcon sx={{ fontSize: 48, color: 'var(--error-main, #f44336)', mb: 2 }} />
                <Typography variant="h6" color="text.primary" gutterBottom>
                    資料載入失敗
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {message}
                </Typography>
                {onRetry && (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<RefreshIcon />}
                        onClick={onRetry}
                        size="small"
                    >
                        重新試一次
                    </Button>
                )}
            </Paper>
        </Box>
    );
}
