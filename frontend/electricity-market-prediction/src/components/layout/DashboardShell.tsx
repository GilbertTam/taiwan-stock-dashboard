'use client';

import React from 'react';

interface DashboardShellProps {
  header?: React.ReactNode;
  main: React.ReactNode;
  sidebar: React.ReactNode;
}

/**
 * TradingView-like shell: left main workspace + right sidebar.
 * Tailwind-first: uses CSS variables defined in `app/globals.css`.
 */
export function DashboardShell({ header, main, sidebar }: DashboardShellProps) {
  return (
    <div className="space-y-2">
      {header ? <div>{header}</div> : null}

      {/* Split layout kicks in from md to讓右側欄在一般筆電寬度就能看見 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="min-w-0 space-y-3">{main}</section>
        <aside className="min-w-0 space-y-3">{sidebar}</aside>
      </div>
    </div>
  );
}

