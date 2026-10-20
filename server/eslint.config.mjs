// @ts-check

import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  // Base configuration recommended by ESLint
  eslint.configs.recommended,

  // Configuration recommended by Prettier, disables ESLint rules that conflict with Prettier
  eslintPluginPrettierRecommended,

  // Custom configuration
  {
    languageOptions: {
      ecmaVersion: "latest", // Use the latest ECMAScript features
      sourceType: "module", // Use ES modules
      globals: {
        ...globals.node, // Add Node.js global variables (like 'require', 'module', etc.)
        ...globals.jest, // Add Jest global variables (like 'describe', 'test', 'expect', etc.)
      },
    },
    rules: {
      "prettier/prettier": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
