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

const TOOLS = [
  { name: 'Apache ECharts', desc: '圖表庫', url: 'https://echarts.apache.org/' },
  { name: 'TradingView Lightweight Charts', desc: '金融圖表元件', url: 'https://www.tradingview.com/lightweight-charts/' },
  { name: 'MUI (Material UI)', desc: 'UI 元件庫', url: 'https://mui.com/' },
  { name: 'Next.js', desc: 'React 框架', url: 'https://nextjs.org/' },
];

const TECH_STACK: { label: string; tags: string[] }[] = [
  { label: '前端', tags: ['Next.js 15', 'React 19', 'TypeScript', 'Material UI 6', 'ECharts'] },
  { label: '後端', tags: ['FastAPI', 'Pydantic', 'SQLAlchemy (async)'] },
  { label: '資料庫', tags: ['SQLite（使用者資料）', 'Elasticsearch（市場與預測資料）'] },
  { label: '優化', tags: ['PuLP', 'Pandas', 'NumPy'] },
  { label: '基礎設施', tags: ['Docker', 'Docker Compose', 'Nginx'] },
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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ flexShrink: 0, p: 0.5 }}>
        <DashboardToolbar variant="minimal" />
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <DashboardSubPageLayout title="關於網站" icon={<InfoOutlinedIcon />} backHref="/dashboard">
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
              日本電力現貨市場資料視覺化
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              即時價格、預測與儲能收益分析。
            </Typography>
          </Paper>
          </RevealSection>

          {/* 資料來源 */}
          <RevealSection>
          <Paper elevation={0} sx={sectionCardSx}>
            <GradientBar />
            <Typography variant="subtitle1" sx={sectionTitleSx}>
              <InfoOutlinedIcon fontSize="small" />
              資料來源
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 1 }}>
              本系統資料經由後端 API 提供，主要包含以下類別：
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
              <li>區域與現貨價格（各區域即時與歷史價格）</li>
              <li>預測模型與預測結果（自訂模型預測資料）</li>
              <li>不平衡（imbalance）</li>
              <li>連線流量（interconnection flow）</li>
              <li>停機資訊（HJKS）</li>
              <li>OCCTO（區域／連線／事件）</li>
              <li>TDGC</li>
              <li>天氣實測與預報</li>
              <li>地震資訊</li>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mt: 1.5 }}>
              以上資料源自日本電力市場相關公開資訊。
            </Typography>
          </Paper>
          </RevealSection>

          {/* 圖表與前端工具來源 */}
          <RevealSection>
          <Paper elevation={0} sx={sectionCardSx}>
            <GradientBar />
            <Typography variant="subtitle1" sx={sectionTitleSx}>
              <BarChartIcon fontSize="small" />
              圖表與前端工具來源
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
              本系統圖表與介面使用以下開源與第三方工具：
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
              技術架構
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.7, mb: 2 }}>
              本專案技術棧與 README 對齊：
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
