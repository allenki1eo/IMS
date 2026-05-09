import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
