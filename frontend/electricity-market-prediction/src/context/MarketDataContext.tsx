'use client';

import React, { createContext, useContext } from 'react';
import { useMarketData } from '@/hooks/useMarketData';

type MarketDataValue = ReturnType<typeof useMarketData>;

const MarketDataContext = createContext<MarketDataValue | null>(null);

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
  const value = useMarketData();

  // The hook already returns stable handlers, and state changes should re-render consumers.
  // Avoid over-memoization that can confuse debugging.
  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>;
}

export function useMarketDataContext() {
  const ctx = useContext(MarketDataContext);
  if (!ctx) {
    throw new Error('useMarketDataContext must be used within a MarketDataProvider');
  }
  return ctx;
}

