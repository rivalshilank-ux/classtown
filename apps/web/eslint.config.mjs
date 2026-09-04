import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import { createBaseConfig } from "@classtown/config/eslint/base";

export default [...createBaseConfig(import.meta.dirname), ...nextCoreWebVitals];
