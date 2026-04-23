import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Required for pnpm monorepos: traces files relative to the monorepo root
  // so the standalone output preserves the apps/web/server.js path structure
  outputFileTracingRoot: path.join(__dirname, "../../"),
  ...(process.env.WIKI_DIR ? { env: { WIKI_DIR: process.env.WIKI_DIR } } : {}),
};

export default nextConfig;
