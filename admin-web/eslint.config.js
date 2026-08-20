import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

function asWarn(rules) {
  return Object.fromEntries(
    Object.entries(rules ?? {}).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, ["warn", ...value.slice(1)]];
      }
      return [key, "warn"];
    }),
  );
}

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // v7 recommended 含 React Compiler 规则，会误伤尚未迁移的旧面板
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...asWarn(jsxA11y.flatConfigs.recommended.rules),
      "react-refresh/only-export-components": [
        "warn",
        { allowExportNames: ["useSession"] },
      ],
    },
  },
  eslintConfigPrettier,
]);
