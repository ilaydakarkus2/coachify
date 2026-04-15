import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React strict mode - gelistirme uyariari
  reactStrictMode: true,

  // Statik sayfalar icin压缩
  compress: true,

  // Gereksiz kaynak haritalarini uretme (production)
  productionBrowserSourceMaps: false,

  // Statik optimizasyon
  poweredByHeader: false,

  // Deneysel performans iyilestirmeleri
  experimental: {
    // Serverless function daha iyi cold start
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
