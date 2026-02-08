'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
    children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
            {/* Main Content Area - TradingView-like maximized layout */}
            <main className="flex-1 overflow-hidden">
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
