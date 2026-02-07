'use client';

import React from 'react';
import {
  TrendingUp,
  Assessment,
  Info,
  ArrowForward
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  isPrimary?: boolean;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  title,
  description,
  icon,
  color,
  href,
  isPrimary = false
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
            <span className="text-xs mr-1">查看詳細</span>
            <ArrowForward sx={{ fontSize: 14 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuickAccessCards: React.FC = () => {
  const accessCards: QuickAccessCardProps[] = [
    {
      title: '價格預測詳細分析',
      description: '查看完整的價格預測圖表、模型比較和市場資訊',
      icon: <TrendingUp sx={{ fontSize: 28 }} />,
      color: 'var(--primary)',
      href: '/dashboard/price-prediction',
      isPrimary: true
    },
    {
      title: '模型效能分析',
      description: '查看 MAE 分析和收益分析，比較不同模型的表現',
      icon: <Assessment sx={{ fontSize: 28 }} />,
      color: '#109618',
      href: '/dashboard/price-prediction?tab=model-performance'
    },
    {
      title: '市場資訊總覽',
      description: '查看停機資訊、互連流量、天氣等市場資料',
      icon: <Info sx={{ fontSize: 28 }} />,
      color: '#990099',
      href: '/dashboard/price-prediction?tab=market-info'
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
