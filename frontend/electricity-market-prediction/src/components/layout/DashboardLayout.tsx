'use client';

import { ReactNode } from 'react';
import Header from './Header';

interface DashboardLayoutProps {
    children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
            <Header />

            {/* Main Content Area */}
            <main className="flex-1 p-6 pt-24 overflow-x-hidden" style={{ marginTop: '64px' }}>
                <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                    {children}
                </div>
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
