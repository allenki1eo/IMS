import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@libsql/client"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
