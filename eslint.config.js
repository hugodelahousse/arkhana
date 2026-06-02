import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ["build/**", "node_modules/**", ".react-router/**", ".claude/worktrees/**", "tmp-reference/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs", "scripts/**/*.js", "server.js"],
    languageOptions: {
      globals: { Buffer: "readonly", process: "readonly", console: "readonly" },
    },
  },
  {
    files: ["public/tz.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        Intl: "readonly",
      },
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        clients: "readonly",
        caches: "readonly",
        fetch: "readonly",
      },
    },
  },
  prettierConfig,
];
