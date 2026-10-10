import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(resolve(process.cwd(), "package.json"));
const tseslint = require("typescript-eslint");

/** Keep numbers in sync with skills/complexity-anti-drift/references/thresholds.md */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/coverage/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    rules: {
      complexity: ["error", 10],
      "max-depth": ["error", 4],
      "max-lines-per-function": [
        "warn",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "max-lines": ["warn", { max: 1000, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", 4],
    },
  },
);
