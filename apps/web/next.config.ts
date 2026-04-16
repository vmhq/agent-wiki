import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    WIKI_DIR: process.env.WIKI_DIR ?? "/wiki",
  },
};

export default nextConfig;
