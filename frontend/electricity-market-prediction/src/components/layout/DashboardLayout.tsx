'use client';

import { ReactNode } from 'react';
import { DashboardSidebar } from '@/components/navigation/DashboardSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * 主內容佈局 | Main dashboard layout — full-screen container with sidebar navigation.
 */
const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      <DashboardSidebar />
      {/* Main Content Area — offset by collapsed sidebar width (60px) */}
      <main className="flex-1 overflow-hidden" style={{ marginLeft: 60 }}>
        {children}
      </main>
    </div>
  );
};

// Add simple fade-in animation
const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;

export default DashboardLayout;
