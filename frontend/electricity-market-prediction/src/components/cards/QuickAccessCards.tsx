'use client';

import React from 'react';
import {
  TrendingUp,
  Assessment,
  Info,
  ArrowForward
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  isPrimary?: boolean;
  viewDetailsLabel: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  title,
  description,
  icon,
  color,
  href,
  isPrimary = false,
  viewDetailsLabel
}) => {
  const router = useRouter();

  return (
    <div
      className={`relative p-5 rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-[var(--primary)] bg-[var(--card-bg)] ${isPrimary
          ? 'border-2 border-[var(--primary)]'
          : 'border-[var(--card-border)]'
        }`}
      onClick={() => router.push(href)}
    >
      {/* Primary accent bar */}
      {isPrimary && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]" />
      )}

      <div className="flex items-start gap-4">
        {/* Icon container */}
        <div
          className="flex items-center justify-center w-12 h-12 rounded-lg"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-1 text-[var(--foreground)]">
            {title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            {description}
          </p>
          <div className="flex items-center text-[var(--primary)] font-medium">
            <span className="text-xs mr-1">{viewDetailsLabel}</span>
            <ArrowForward sx={{ fontSize: 14 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuickAccessCards: React.FC = () => {
  const { t } = useTranslation('dashboard');

  const accessCards: QuickAccessCardProps[] = [
    {
      title: t('quickAccess.forecastTitle'),
      description: t('quickAccess.forecastDesc'),
      icon: <TrendingUp sx={{ fontSize: 28 }} />,
      color: 'var(--primary)',
      href: '/dashboard/forecast',
      isPrimary: true,
      viewDetailsLabel: t('quickAccess.viewDetails')
    },
    {
      title: t('quickAccess.modelTitle'),
      description: t('quickAccess.modelDesc'),
      icon: <Assessment sx={{ fontSize: 28 }} />,
      color: '#109618',
      href: '/dashboard/forecast',
      viewDetailsLabel: t('quickAccess.viewDetails')
    },
    {
      title: t('quickAccess.marketTitle'),
      description: t('quickAccess.marketDesc'),
      icon: <Info sx={{ fontSize: 28 }} />,
      color: '#990099',
      href: '/dashboard/forecast?panel=market-info',
      viewDetailsLabel: t('quickAccess.viewDetails')
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {accessCards.map((card, index) => (
        <QuickAccessCard key={index} {...card} />
      ))}
    </div>
  );
};
