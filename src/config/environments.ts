/**
 * This project's environments — the only file that knows a URL.
 *
 * Anything that differs between local / dev / beta / staging / prod belongs
 * here; secrets belong in .env, never in this file. How the table is read lives
 * in `define-environments.ts`, which is framework code and ships with the core.
 */
import { defineEnvironments } from './define-environments';

export const environments = defineEnvironments(
  {
    local: {
      baseURL: 'http://localhost:3000',
      apiURL: 'http://localhost:3000/api',
      timeouts: { action: 15_000, navigation: 30_000, expect: 10_000, test: 60_000 },
    },
    dev: {
      baseURL: 'https://dev.example.com',
      apiURL: 'https://dev.example.com/api',
      timeouts: { action: 15_000, navigation: 30_000, expect: 10_000, test: 60_000 },
    },
    /** FPT VMSmart beta — https://beta-vmsmart-next.fcam.vn */
    beta: {
      baseURL: 'https://beta-vmsmart-next.fcam.vn',
      apiURL: 'https://beta-vmsmart-next.fcam.vn/api',
      timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 },
    },
    staging: {
      baseURL: 'https://staging.example.com',
      apiURL: 'https://staging.example.com/api',
      timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 },
    },
    prod: {
      baseURL: 'https://www.example.com',
      apiURL: 'https://www.example.com/api',
      timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 },
    },
  },
  { fallback: 'local' },
);

/** Names this project accepts in `TEST_ENV`. */
export type EnvName = (typeof environments.names)[number];

/** Resolved config for this run: table entry + `.env` overrides. */
export const config = environments.resolve();
