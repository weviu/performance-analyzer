import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local tooling and generated paths that are not app source:
    "fastapi/.venv/**",
    "logs/**",
    "dev-server.js",
    "ecosystem.config.cjs",
    "scripts/processBenchmarks.js",
  ]),
]);

export default eslintConfig;
