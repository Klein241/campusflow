import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  staticPageGenerationTimeout: 120,
} satisfies Record<string, unknown>;

export default nextConfig as NextConfig;


