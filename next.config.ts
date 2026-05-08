import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@libsql/client"],
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
