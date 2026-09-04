import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared workspace packages ship TypeScript source directly (no build
  // step of their own), so Next.js needs to transpile them itself.
  transpilePackages: ["@classtown/ui", "@classtown/shared-types", "@classtown/i18n"],
};

export default nextConfig;
