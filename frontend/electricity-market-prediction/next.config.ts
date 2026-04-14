import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material', 'echarts', 'date-fns'],
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      const cacheGroups = (config.optimization.splitChunks as any).cacheGroups || {};
      // Split large charting/UI libraries into separate chunks for better caching
      cacheGroups.echarts = {
        test: /[\\/]node_modules[\\/](echarts|zrender|echarts-for-react)[\\/]/,
        name: 'echarts',
        chunks: 'all' as const,
        priority: 20,
      };
      cacheGroups.mui = {
        test: /[\\/]node_modules[\\/]@mui[\\/]/,
        name: 'mui',
        chunks: 'all' as const,
        priority: 20,
      };
      (config.optimization.splitChunks as any).cacheGroups = cacheGroups;
    }
    return config;
  },
  async rewrites() {
    // Only proxy during local dev (when NEXT_PUBLIC_API_PORT is set).
    // In full-Docker deployment nginx handles /api directly, so no rewrite is needed.
    const apiPort = process.env.NEXT_PUBLIC_API_PORT;
    if (!apiPort) return [];

    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:${apiPort}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
