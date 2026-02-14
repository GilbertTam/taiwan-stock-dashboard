/**
 * 設定頁 | Settings page — placeholder for user preferences.
 */
'use client';

import { Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { DashboardSubPageLayout } from '@/components/layout/DashboardSubPageLayout';

export default function SettingsPage() {
  return (
    <DashboardSubPageLayout title="個人設定" icon={<SettingsIcon />}>
      <Typography variant="body2" sx={{ color: 'var(--muted)', lineHeight: 1.7 }}>
        此功能開發中，敬請期待。
      </Typography>
    </DashboardSubPageLayout>
  );
}
