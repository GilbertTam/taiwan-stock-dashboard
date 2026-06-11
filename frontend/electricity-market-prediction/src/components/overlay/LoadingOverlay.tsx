'use client';

import { Box, CircularProgress } from '@mui/material';

export function LoadingOverlay() {
    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)',
                zIndex: 1300,
            }}
        >
            <CircularProgress size={32} sx={{ color: 'var(--primary)' }} />
        </Box>
    );
}
