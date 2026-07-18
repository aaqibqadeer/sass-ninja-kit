import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // `next/core-web-vitals` = React/Next best practices.
  // `next/typescript` layers in `@typescript-eslint/recommended` (per CLAUDE.md §6).
  // `prettier` = eslint-config-prettier, last so it disables any formatting rules
  // that would fight Prettier. No custom rule overrides at this stage (CLAUDE.md §6).
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
