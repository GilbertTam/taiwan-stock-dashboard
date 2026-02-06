'use client';

import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  FitScreen,
  Download,
  Fullscreen,
  FullscreenExit,
  Settings
} from '@mui/icons-material';

interface ChartToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitScreen?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  onSettings?: () => void;
  isFullscreen?: boolean;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onDownload,
  onFullscreen,
  onSettings,
  isFullscreen = false
}) => {
  const [downloadMenuAnchor, setDownloadMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  const handleDownload = (format: 'png' | 'svg' | 'csv') => {
    if (onDownload) {
      onDownload();
    }
    handleDownloadMenuClose();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        p: 0.5,
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 1
      }}
    >
      {/* Zoom Controls */}
      <Tooltip title="放大 (Ctrl +)">
        <span>
          <IconButton
            size="small"
            onClick={onZoomIn}
            disabled={!onZoomIn}
            sx={{ color: 'var(--foreground)' }}
          >
            <ZoomIn fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="縮小 (Ctrl -)">
        <span>
          <IconButton
            size="small"
            onClick={onZoomOut}
            disabled={!onZoomOut}
            sx={{ color: 'var(--foreground)' }}
          >
            <ZoomOut fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="適應螢幕">
        <span>
          <IconButton
            size="small"
            onClick={onFitScreen}
            disabled={!onFitScreen}
            sx={{ color: 'var(--foreground)' }}
          >
            <FitScreen fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24 }} />

      {/* Download */}
      <Tooltip title="下載">
        <span>
          <IconButton
            size="small"
            onClick={handleDownloadMenuOpen}
            sx={{ color: 'var(--foreground)' }}
          >
            <Download fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={downloadMenuAnchor}
        open={Boolean(downloadMenuAnchor)}
        onClose={handleDownloadMenuClose}
      >
        <MenuItem onClick={() => handleDownload('png')}>下載為 PNG</MenuItem>
        <MenuItem onClick={() => handleDownload('svg')}>下載為 SVG</MenuItem>
        <MenuItem onClick={() => handleDownload('csv')}>下載為 CSV</MenuItem>
      </Menu>

      {/* Fullscreen */}
      {onFullscreen && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24 }} />
          <Tooltip title={isFullscreen ? '退出全螢幕' : '全螢幕'}>
            <span>
              <IconButton
                size="small"
                onClick={onFullscreen}
                sx={{ color: 'var(--foreground)' }}
              >
                {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}

      {/* Settings */}
      {onSettings && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24 }} />
          <Tooltip title="設定">
            <span>
              <IconButton
                size="small"
                onClick={onSettings}
                sx={{ color: 'var(--foreground)' }}
              >
                <Settings fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
    </Box>
  );
};
