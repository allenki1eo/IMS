import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["recharts", "date-fns", "lucide-react"],
  },
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
  ],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
