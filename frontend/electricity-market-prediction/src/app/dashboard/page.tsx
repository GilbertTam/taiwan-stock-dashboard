'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { Alert, Snackbar, Box, CircularProgress, Typography, Container } from '@mui/material';
import ElectricityPriceComparison from '@/components/ElectricityPriceComparison';

// 自定義載入中元件
const LoadingComponent = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '50vh',
      gap: 2
    }}
  >
    <CircularProgress color="primary" />
    <Typography variant="h6" color="textSecondary">
      載入電力價格數據中...
    </Typography>
  </Box>
);

export default function Dashboard() {
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  
  useEffect(() => {
    // 檢查是否是從登入頁面跳轉過來的
    const isFromLogin = sessionStorage.getItem('fromLogin') === 'true';
    if (isFromLogin) {
      setShowLoginSuccess(true);
      sessionStorage.removeItem('fromLogin');
    }
  }, []);
  
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Snackbar
        open={showLoginSuccess}
        autoHideDuration={3000}
        onClose={() => setShowLoginSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowLoginSuccess(false)} severity="success">
          Login successful!
        </Alert>
      </Snackbar>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          HD Japan Electricity Market Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Insight of Japan Electricity Market
        </Typography>
      </Box>
      
      <Suspense fallback={<LoadingComponent />}>
        <ElectricityPriceComparison />
      </Suspense>
    </Container>
  );
}
