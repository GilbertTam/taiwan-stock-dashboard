'use client';

import React from 'react';
import { WatchlistSidebar } from './WatchlistSidebar';

/**
 * RightSidebar - TradingView-style sidebar wrapper
 * Uses WatchlistSidebar for the actual content
 */
export function RightSidebar() {
  return <WatchlistSidebar />;
}
