/**
 * Environment loading + typed access.
 *
 * Values are resolved in this order (first wins):
 *   1. real process environment (CI variables, shell exports)
 *   2. .env file at the project root
 *   3. the default declared here
 *
 * No external dependency: the .env file is parsed by `loadDotEnv()` below,
 * so the project runs straight after `npm install` with nothing extra.
 */
import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

/** Parse the root .env file into process.env without overwriting real env vars. */
export function loadDotEnv(file = path.resolve(process.cwd(), '.env')): void {
  if (loaded) return;
  loaded = true;
  if (!fs.existsSync(file)) return;

  for (const rawLine of fs.readFileSync(file, 'utf-8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      // Unquoted value: drop a trailing `# comment`. The hash must follow
      // whitespace, so a password like "Pw#1" survives — quote the value when
      // it really does contain " #".
      const comment = value.search(/\s#/);
      if (comment !== -1) value = value.slice(0, comment).trim();
    }
    // `KEY=` with nothing after it means "leave it to the default", not "".
    // Without this, .env.example's blank placeholders would override every
    // value in environments.ts with an empty string.
    if (value === '') continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/**
 * Raw lookup used by every getter below. An empty value — from a blank line in
 * .env or an unset CI variable declared as `BASE_URL: ""` — counts as absent,
 * so the declared default always wins over "".
 */
function readEnv(key: string): string | undefined {
  loadDotEnv();
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? undefined : value;
}

/** Read a variable, falling back to a default. Throws when required and missing. */
export function envVar(key: string, fallback?: string): string {
  const value = readEnv(key) ?? fallback;
  if (value === undefined) {
    throw new Error(
      `Missing environment variable "${key}". Add it to your .env file (see .env.example).`,
    );
  }
  return value;
}

export function envFlag(key: string, fallback = false): boolean {
  const value = readEnv(key);
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function envNumber(key: string, fallback: number): number {
  const value = readEnv(key);
  // Number('') is 0, which Playwright reads as "no timeout" — readEnv() has
  // already turned a blank value into undefined so the fallback applies.
  const parsed = value === undefined ? NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const isCI = envFlag('CI');

/*
 * Which environments exist, and which one this run targets, is not decided
 * here: the list of names is product knowledge. A project declares its table
 * with `defineEnvironments()` and gets `config.name` back — see
 * `define-environments.ts` and `environments.ts`.
 */
