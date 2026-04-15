'use client';

import React from 'react';
import { Box, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CloudIcon from '@mui/icons-material/Cloud';
import CandlestickChartIcon from '@mui/icons-material/CandlestickChart';
import BalanceIcon from '@mui/icons-material/Balance';
import SpeedIcon from '@mui/icons-material/Speed';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import { useTranslation } from 'react-i18next';

export type TabKey =
  | 'profit'
  | 'mae'
  | 'outage'
  | 'interconnection'
  | 'weather'
  | 'intraday'
  | 'supplyDemand'
  | 'tdgc';

interface TabDef {
  key: TabKey;
  labelKey: string;
  icon: React.ElementType;
}

interface TabGroup {
  key: string;
  labelKey: string;
  tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    key: 'modelAnalysis',
    labelKey: 'forecast:tabGroups.modelAnalysis',
    tabs: [
      { key: 'profit', labelKey: 'forecast:tabs.profitAnalysis', icon: TrendingUpIcon },
      { key: 'mae', labelKey: 'forecast:tabs.maeAnalysis', icon: AssessmentIcon },
    ],
  },
  {
    key: 'marketReference',
    labelKey: 'forecast:tabGroups.marketReference',
    tabs: [
      { key: 'outage', labelKey: 'forecast:tabs.outageInfo', icon: WarningAmberIcon },
      { key: 'interconnection', labelKey: 'forecast:tabs.interconnFlow', icon: AccountTreeIcon },
      { key: 'weather', labelKey: 'forecast:tabs.weatherData', icon: CloudIcon },
      { key: 'intraday', labelKey: 'forecast:tabs.intradayMarketTab', icon: CandlestickChartIcon },
      { key: 'supplyDemand', labelKey: 'forecast:tabs.supplyDemandBalance', icon: BalanceIcon },
      { key: 'tdgc', labelKey: 'forecast:tabs.tdgcMarket', icon: SpeedIcon },
    ],
  },
];

interface BottomPanelNavProps {
  activeTab: TabKey;
  collapsed: boolean;
  maximized: boolean;
  onTabSelect: (tab: TabKey) => void;
  onToggleCollapse: () => void;
  onToggleMaximize: () => void;
}

const NAV_HEIGHT = 40;

export const BottomPanelNav: React.FC<BottomPanelNavProps> = ({
  activeTab,
  collapsed,
  maximized,
  onTabSelect,
  onToggleCollapse,
  onToggleMaximize,
}) => {
  const { t } = useTranslation(['forecast', 'common']);

  const handleTabClick = (key: TabKey) => {
    if (collapsed) {
      onTabSelect(key);
      onToggleCollapse(); // expand
    } else if (activeTab === key) {
      onToggleCollapse(); // collapse
    } else {
      onTabSelect(key);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: NAV_HEIGHT,
        minHeight: NAV_HEIGHT,
        flexShrink: 0,
        borderBottom: '1px solid var(--card-border)',
        px: 0.5,
        gap: 0.25,
      }}
    >
      {/* Tab groups */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          gap: 0.25,
          overflow: 'hidden',
        }}
      >
        {TAB_GROUPS.map((group, gi) => (
          <React.Fragment key={group.key}>
            {gi > 0 && (
              <Divider
                orientation="vertical"
                flexItem
                sx={{ my: 0.75, mx: 0.5, borderColor: 'var(--subtle-border)' }}
              />
            )}
            {/* Group label (only when expanded) */}
            {!collapsed && (
              <Typography
                sx={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--text-secondary)',
                  opacity: 0.6,
                  whiteSpace: 'nowrap',
                  mr: 0.25,
                  userSelect: 'none',
                }}
              >
                {t(group.labelKey)}
              </Typography>
            )}
            {/* Tabs */}
            {group.tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;

              if (collapsed) {
                // Icon-only dock bar mode
                return (
                  <Tooltip key={tab.key} title={t(tab.labelKey)} arrow placement="top">
                    <Box
                      component="button"
                      onClick={() => handleTabClick(tab.key)}
                      sx={{
                        all: 'unset',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '4px',
                        border: isActive
                          ? '1px solid var(--primary)'
                          : '1px solid transparent',
                        bgcolor: isActive ? 'var(--primary-alpha-12)' : 'transparent',
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        flexShrink: 0,
                        '&:hover': {
                          bgcolor: isActive
                            ? 'var(--primary-alpha-18)'
                            : 'var(--subtle-bg-hover)',
                          color: isActive ? 'var(--primary)' : 'var(--text-primary, #e5e5e5)',
                        },
                      }}
                    >
                      <Icon sx={{ fontSize: 16 }} />
                    </Box>
                  </Tooltip>
                );
              }

              // Expanded chip mode: icon + label
              return (
                <Box
                  key={tab.key}
                  component="button"
                  onClick={() => handleTabClick(tab.key)}
                  sx={{
                    all: 'unset',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                    height: 26,
                    px: 0.75,
                    borderRadius: '4px',
                    border: isActive
                      ? '1px solid var(--primary)'
                      : '1px solid var(--card-border)',
                    bgcolor: isActive ? 'var(--primary-alpha-12)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.12s',
                    flexShrink: 0,
                    '&:hover': {
                      bgcolor: isActive
                        ? 'var(--primary-alpha-18)'
                        : 'var(--subtle-bg-hover)',
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 15 }} />
                  {t(tab.labelKey)}
                </Box>
              );
            })}
          </React.Fragment>
        ))}
      </Box>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 0.25 }}>
        {!collapsed && (
          <Tooltip
            title={maximized ? t('forecast:tabs.restore') : t('forecast:tabs.maximize')}
            arrow
            placement="top"
          >
            <IconButton
              size="small"
              onClick={onToggleMaximize}
              sx={{ color: 'var(--text-secondary)', p: 0.5 }}
            >
              {maximized ? (
                <CloseFullscreenIcon sx={{ fontSize: 17 }} />
              ) : (
                <OpenInFullIcon sx={{ fontSize: 17 }} />
              )}
            </IconButton>
          </Tooltip>
        )}
        <Tooltip
          title={collapsed ? t('forecast:tabs.expand') : t('forecast:tabs.collapse')}
          arrow
          placement="top"
        >
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{ color: 'var(--text-secondary)', p: 0.5 }}
          >
            {collapsed ? (
              <KeyboardArrowUpIcon sx={{ fontSize: 19 }} />
            ) : (
              <KeyboardArrowDownIcon sx={{ fontSize: 19 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
