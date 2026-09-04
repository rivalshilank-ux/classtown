import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@classtown/ui",
    "@classtown/shared-types",
    "@classtown/i18n",
    "@classtown/game-client",
  ],
};

export default nextConfig;
