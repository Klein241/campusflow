import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Skip separate tsc type-check step during build (prevents OOM on large codebases).
  // Types are validated by the IDE/editor and the MCP analyzer.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;


