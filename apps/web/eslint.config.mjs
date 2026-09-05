import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { createBaseConfig } from "@classtown/config/eslint/base";

const config = [
  ...createBaseConfig(import.meta.dirname),
  ...nextCoreWebVitals,
];

export default config;
