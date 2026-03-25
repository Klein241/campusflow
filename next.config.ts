import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {
    // TODO: Remove once all pre-existing TS errors are fixed project-wide
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
