import js from "@eslint/js";
import tseslint from "typescript-eslint";

export function createBaseConfig(tsconfigRootDir) {
  return tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
      },
    },
    {
      files: ["**/*.config.{js,mjs,cjs,ts,mts,cts}"],
      ...tseslint.configs.disableTypeChecked,
    },
    {
      ignores: ["dist/**", ".next/**", ".turbo/**", "node_modules/**"],
    },
  );
}
