import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // eslint-config-next@16 + eslint@9 with Next 15 can throw "Converting circular structure to JSON"
  // during `next build`; run `npm run lint` locally when upgrading the toolchain.
  eslint: { ignoreDuringBuilds: true },
  // Standalone output: next build traces only the modules actually imported at runtime
  // and emits .next/standalone/server.js — eliminates the need to copy all node_modules
  // into the Docker runner stage (~50-100 MB instead of 761 MB).
  output: 'standalone',
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
