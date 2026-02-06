'use client';

import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { Home, ChevronRight } from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        separator={<ChevronRight fontSize="small" sx={{ color: 'text.secondary' }} />}
        aria-label="breadcrumb"
      >
        <Link
          component="button"
          variant="body2"
          onClick={() => router.push('/dashboard')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.secondary',
            textDecoration: 'none',
            '&:hover': {
              color: 'var(--primary)',
              textDecoration: 'underline'
            }
          }}
        >
          <Home sx={{ fontSize: 16 }} />
          首頁
        </Link>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return isLast ? (
            <Typography key={item.href} variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
              {item.label}
            </Typography>
          ) : (
            <Link
              key={item.href}
              component="button"
              variant="body2"
              onClick={() => router.push(item.href)}
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': {
                  color: 'var(--primary)',
                  textDecoration: 'underline'
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
