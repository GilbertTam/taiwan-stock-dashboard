/**
 * 全螢幕載入遮罩 | Full-viewport loading overlay with centered spinner.
 *
 * 使用 fixed 定位，覆蓋整個視窗並顯示半透明背景與置中旋轉圈。
 * Uses fixed positioning to cover the entire viewport with a semi-transparent
 * backdrop and a centered LoadingSpinner.
 *
 * @param label - 傳遞給 LoadingSpinner 的文字 | Text forwarded to LoadingSpinner
 */

import { Box } from '@mui/material';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
    /** 載入提示文字 | Loading hint text */
    label?: string;
}

export function LoadingOverlay({ label }: LoadingOverlayProps) {
    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
        >
            <LoadingSpinner label={label} />
        </Box>
    );
}
