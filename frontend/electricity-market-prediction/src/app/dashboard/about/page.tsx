/**
 * 關於頁 | About page — data sources and frontend tools attribution.
 */
'use client';

import { ReactNode } from 'react';
import { Box, Typography, Link as MuiLink, Paper, Chip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import CodeIcon from '@mui/icons-material/Code';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DashboardSubPageLayout } from '@/components/layout/DashboardSubPageLayout';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { useInView } from '@/hooks/useInView';
import { useTranslation } from 'react-i18next';

const sectionCardSx = {
  position: 'relative' as const,
  p: 2.5,
  mb: 2,
  borderRadius: 1.5,
  border: '1px solid var(--card-border)',
  backgroundColor: 'var(--card-bg)',
  backdropFilter: 'blur(12px)',
  overflow: 'hidden',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    borderColor: 'var(--primary)',
  },
};

const sectionTitleSx = {
  fontWeight: 700,
  color: 'var(--foreground)',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  mb: 1.5,
  borderLeft: '3px solid var(--primary)',
  pl: 1.5,
  ml: -0.25,
};

const TOOL_URLS = [
  { name: 'Apache ECharts', key: 'echarts', url: 'https://echarts.apache.org/' },
  { name: 'TradingView Lightweight Charts', key: 'lwc', url: 'https://www.tradingview.com/lightweight-charts/' },
  { name: 'MUI (Material UI)', key: 'mui', url: 'https://mui.com/' },
  { name: 'Next.js', key: 'nextjs', url: 'https://nextjs.org/' },
];

function GradientBar() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
      }}
    />
  );
}

function RevealSection({ children }: { children: ReactNode }) {
  const [ref, inView] = useInView({ threshold: 0.1, rootMargin: '0px 0px -5% 0px', triggerOnce: true });
  return (
    <Box
      ref={ref}
      sx={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'opacity 0.35s ease-out',
          transform: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}

export default function AboutPage() {
  const { t } = useTranslation('common');

  const TOOLS = TOOL_URLS.map(tool => ({ ...tool, desc: t(`about.tools.${tool.key}`) }));

  const TECH_STACK: { label: string; tags: string[] }[] = [
    { label: t('about.stack.frontend'), tags: ['Next.js 15', 'React 19', 'TypeScript', 'Material UI 6', 'ECharts'] },
    { label: t('about.stack.backend'), tags: ['FastAPI', 'Pydantic', 'SQLAlchemy (async)'] },
    { label: t('about.stack.database'), tags: [t('about.dbItems.sqlite'), t('about.dbItems.elasticsearch')] },
    { label: t('about.stack.optimization'), tags: ['PuLP', 'Pandas', 'NumPy'] },
    { label: t('about.stack.infrastructure'), tags: ['Docker', 'Docker Compose', 'Nginx'] },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, p: 0.5 }}>
        <DashboardToolbar variant="minimal" />
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <DashboardSubPageLayout title={t('about.title')} icon={<InfoOutlinedIcon />} backHref="/dashboard">
          {/* Hero */}
          <RevealSection>
          <Paper
            elevation={0}
            sx={{
              position: 'relative',
              p: 2.5,
              mb: 3,
              borderRadius: 1.5,
              border: '1px solid var(--card-border)',
              backgroundColor: 'var(--card-bg)',
              backdropFilter: 'blur(12px)',
              overflow: 'hidden',
            }}
          >
            <GradientBar />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'var(--foreground)',
                mb: 0.5,
                fontSize: '1.125rem',
              }}
            >
              {t('about.heroTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {t('about.heroDesc')}
            </Typography>
          </Paper>
          </RevealSection>

          {/* 資料來源 */}
          <RevealSection>
          <Paper elevation={0} sx={sectionCardSx}>
            <GradientBar />
            <Typography variant="subtitle1" sx={sectionTitleSx}>
              <InfoOutlinedIcon fontSize="small" />
              {t('about.dataSources')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 1 }}>
              {t('about.dataSourcesDesc')}
            </Typography>
            <Box
              component="ul"
              sx={{
                m: 0,
                pl: 2.5,
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                lineHeight: 1.8,
              }}
            >
              <li>{t('about.dataItems.spotPrice')}</li>
              <li>{t('about.dataItems.forecast')}</li>
              <li>{t('about.dataItems.imbalance')}</li>
              <li>{t('about.dataItems.interconnection')}</li>
              <li>{t('about.dataItems.outage')}</li>
              <li>{t('about.dataItems.occto')}</li>
              <li>TDGC</li>
              <li>{t('about.dataItems.weather')}</li>
              <li>{t('about.dataItems.earthquake')}</li>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mt: 1.5 }}>
              {t('about.dataSourcesFooter')}
            </Typography>
          </Paper>
          </RevealSection>

          {/* 圖表與前端工具來源 */}
          <RevealSection>
          <Paper elevation={0} sx={sectionCardSx}>
            <GradientBar />
            <Typography variant="subtitle1" sx={sectionTitleSx}>
              <BarChartIcon fontSize="small" />
              {t('about.chartTools')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
              {t('about.chartToolsDesc')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 2,
              }}
            >
              {TOOLS.map((tool) => (
                <MuiLink
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  sx={{
                    display: 'block',
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid var(--card-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--foreground)',
                    transition: 'background-color 0.2s, border-color 0.2s',
                    '&:hover': {
                      backgroundColor: 'var(--hover-bg)',
                      borderColor: 'var(--primary)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--foreground)' }}>
                        {tool.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                        {tool.desc}
                      </Typography>
                    </Box>
                    <OpenInNewIcon sx={{ fontSize: 16, color: 'var(--primary)', flexShrink: 0 }} />
                  </Box>
                </MuiLink>
              ))}
            </Box>
          </Paper>
          </RevealSection>

          {/* 技術架構 */}
          <RevealSection>
          <Paper elevation={0} sx={{ ...sectionCardSx, mb: 0 }}>
            <GradientBar />
            <Typography variant="subtitle1" sx={sectionTitleSx}>
              <CodeIcon fontSize="small" />
              {t('about.techStack')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
              {t('about.techStackDesc')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {TECH_STACK.map((row) => (
                <Box key={row.label} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--foreground)', minWidth: 72 }}>
                    {row.label}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {row.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--hover-bg)',
                          border: '1px solid var(--card-border)',
                          color: 'var(--foreground)',
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
          </RevealSection>
        </DashboardSubPageLayout>
      </Box>
    </Box>
  );
}
