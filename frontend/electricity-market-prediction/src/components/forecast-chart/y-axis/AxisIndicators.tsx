import React, { useState, useEffect } from 'react';
import { Box, Typography, Tooltip, IconButton, Popover, Button, Stack } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragHandle';
import KeyboardIcon from '@mui/icons-material/Keyboard';

const TOOLTIP_STORAGE_KEY = 'forecast-y-axis-tooltip-dismissed';

export const PrimaryAxisIndicator: React.FC = () => {
    return (
        <Box
            data-testid="primary-indicator"
            sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 10,
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'primary.main',
                boxShadow: 1
            }}
        >
            <Typography variant="caption" fontWeight="bold">Y1: 可拖拽</Typography>
        </Box>
    );
};

export const SecondaryAxisIndicator: React.FC = () => {
    return (
        <Box
            data-testid="secondary-indicator"
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                mt: 1
            }}
        >
            <KeyboardIcon fontSize="small" />
            <Typography variant="caption">副轴通过输入框精确控制</Typography>
        </Box>
    );
};

export const AxisControlIntroTooltip: React.FC<{
    anchorEl: HTMLElement | null;
}> = ({ anchorEl }) => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem(TOOLTIP_STORAGE_KEY);
        if (!isDismissed && anchorEl) {
            setOpen(true);
        }
    }, [anchorEl]);

    const handleDismiss = () => {
        localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
        setOpen(false);
    };

    return (
        <Popover
            open={open && Boolean(anchorEl)}
            anchorEl={anchorEl}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }}
            disableAutoFocus
            disableEnforceFocus
        >
            <Box sx={{ p: 2, maxWidth: 300 }} data-testid="intro-tooltip">
                <Typography variant="subtitle2" gutterBottom>
                    双Y轴控制说明
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    右侧主轴（Y1）支持直接拖拽和缩放操作。左侧副轴（Y2）请通过侧边栏的输入框进行精确数值配置。
                </Typography>
                <Stack direction="row" justifyContent="flex-end">
                    <Button size="small" onClick={handleDismiss} data-testid="dismiss-tooltip">
                        不再显示
                    </Button>
                </Stack>
            </Box>
        </Popover>
    );
};
