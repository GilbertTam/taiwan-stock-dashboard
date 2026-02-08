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
      title: '預測詳細分析',
      description: '查看完整的預測圖表、模型比較和市場資訊',
      icon: <TrendingUp sx={{ fontSize: 28 }} />,
      color: 'var(--primary)',
      href: '/dashboard/forecast',
      isPrimary: true
    },
    {
      title: '模型效能分析',
      description: '在預測分析頁下方展開收益分析與 MAE 分析，比較不同模型表現',
      icon: <Assessment sx={{ fontSize: 28 }} />,
      color: '#109618',
      href: '/dashboard/forecast'
    },
    {
      title: '市場資訊總覽',
      description: '在預測分析頁下方選擇市場資訊，查看停機、互連、天氣',
      icon: <Info sx={{ fontSize: 28 }} />,
      color: '#990099',
      href: '/dashboard/forecast?panel=market-info'
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
