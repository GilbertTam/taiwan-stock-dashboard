'use client';

import { useRouter } from 'next/navigation';
import { Box, Typography, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function AboutPage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        p: 3,
        maxWidth: 800,
        mx: 'auto',
      }}
    >
      <Link
        component="button"
        variant="body2"
        onClick={() => router.push('/dashboard')}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: 'var(--primary)',
          textDecoration: 'none',
          mb: 2,
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 18 }} />
        返回總覽
      </Link>

      <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--foreground)', mb: 3 }}>
        關於網站
      </Typography>

      {/* 資料來源 */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: 'var(--foreground)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
          }}
        >
          <InfoOutlinedIcon fontSize="small" />
          資料來源
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--muted)', lineHeight: 1.7, mb: 1 }}>
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
          <li>連線潮流（interconnection flow）</li>
          <li>停機資訊（HJKS）</li>
          <li>OCCTO（區域／連線／事件）</li>
          <li>TDGC</li>
          <li>天氣實測與預報</li>
          <li>地震資訊</li>
        </Box>
        <Typography variant="body2" sx={{ color: 'var(--muted)', lineHeight: 1.7, mt: 1.5 }}>
          以上資料源自日本電力市場相關公開資訊。
        </Typography>
      </Box>

      {/* 圖表與前端工具來源 */}
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: 'var(--foreground)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
          }}
        >
          <BarChartIcon fontSize="small" />
          圖表與前端工具來源
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--muted)', lineHeight: 1.7, mb: 1.5 }}>
          本系統圖表與介面使用以下開源與第三方工具：
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '0.875rem', lineHeight: 2, color: 'var(--foreground)' }}>
          <li>
            <strong>Apache ECharts</strong> — 圖表庫
            <br />
            <Link
              href="https://echarts.apache.org/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'var(--primary)', fontSize: '0.8125rem' }}
            >
              https://echarts.apache.org/
            </Link>
          </li>
          <li>
            <strong>TradingView Lightweight Charts</strong> — 金融圖表元件
            <br />
            <Link
              href="https://www.tradingview.com/lightweight-charts/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'var(--primary)', fontSize: '0.8125rem' }}
            >
              https://www.tradingview.com/lightweight-charts/
            </Link>
          </li>
          <li>
            <strong>MUI (Material UI)</strong> — UI 元件庫
            <br />
            <Link
              href="https://mui.com/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'var(--primary)', fontSize: '0.8125rem' }}
            >
              https://mui.com/
            </Link>
          </li>
          <li>
            <strong>Next.js</strong> — React 框架
            <br />
            <Link
              href="https://nextjs.org/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'var(--primary)', fontSize: '0.8125rem' }}
            >
              https://nextjs.org/
            </Link>
          </li>
        </Box>
      </Box>
    </Box>
  );
}
