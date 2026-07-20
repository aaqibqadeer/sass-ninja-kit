/**
 * scripts/load-env.ts — load `.env*` files for standalone Node scripts.
 *
 * Next.js loads these automatically for `next dev` / `next build`, but `tsx`
 * scripts (seed, seed-test) run outside that pipeline. Import this module
 * first — before `@/config/env.schema` — so `process.env` matches dev.
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
