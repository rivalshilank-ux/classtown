import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * @param {string} tsconfigRootDir - pass import.meta.dirname from the consuming package
 * @returns {import("eslint").Linter.Config[]}
 */
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
      // Config files aren't part of any tsconfig's `include`, and downstream
      // configs (e.g. eslint-config-next) may swap the parser for these files
      // too — turning off type-checked rules here (not just relying on
      // parserOptions) is what survives that override.
      files: ["**/*.config.{js,mjs,cjs,ts,mts,cts}"],
      ...tseslint.configs.disableTypeChecked,
    },
    {
      ignores: ["dist/**", ".next/**", ".turbo/**", "node_modules/**"],
    },
  );
}
