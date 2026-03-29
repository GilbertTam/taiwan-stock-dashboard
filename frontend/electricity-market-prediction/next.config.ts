import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
