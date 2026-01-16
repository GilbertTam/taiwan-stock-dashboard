'use client';

import { useState, useEffect, Suspense } from 'react';
import { Alert, Snackbar } from '@mui/material';
import ElectricityPriceComparison from '@/components/ElectricityPriceComparison';

// Custom Loader with new styling
const LoadingComponent = () => (
  <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-[var(--card-border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
    </div>
    <p className="text-[var(--foreground)] opacity-70 animate-pulse">
      Loading Market Data...
    </p>
  </div>
);

export default function Dashboard() {
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  useEffect(() => {
    // Check if redirected from login
    const isFromLogin = sessionStorage.getItem('fromLogin') === 'true';
    if (isFromLogin) {
      setShowLoginSuccess(true);
      sessionStorage.removeItem('fromLogin');
    }
  }, []);

  return (
    <div className="space-y-6">
      <Snackbar
        open={showLoginSuccess}
        autoHideDuration={3000}
        onClose={() => setShowLoginSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowLoginSuccess(false)}
          severity="success"
          sx={{
            bgcolor: 'var(--card-bg)',
            color: 'var(--success)',
            border: '1px solid var(--success)',
            backdropFilter: 'blur(10px)'
          }}
        >
          Login successful!
        </Alert>
      </Snackbar>

      {/* Main Content */}
      <Suspense fallback={<LoadingComponent />}>
        <ElectricityPriceComparison />
      </Suspense>
    </div>
  );
}
