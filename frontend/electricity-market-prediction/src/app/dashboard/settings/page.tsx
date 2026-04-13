'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/ThemeProvider';

/**
 * Settings page redirects to /dashboard and opens the settings modal.
 * The settings UI is now delivered via SettingsModal.
 */
export default function SettingsRedirect() {
  const router = useRouter();
  const { setSettingsOpen } = useTheme();

  useEffect(() => {
    setSettingsOpen(true);
    router.replace('/dashboard');
  }, [router, setSettingsOpen]);

  return null;
}
