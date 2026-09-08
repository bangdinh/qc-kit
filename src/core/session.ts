/**
 * Reading and writing cached browser sessions.
 *
 * Signing in through the UI is the slowest thing the suite does, so it happens
 * once per run (tests/setup/auth.setup.ts) or, for specs that must do it
 * themselves, once per worker (src/fixtures/auth.fixture.ts) — never once per
 * spec file.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import { envNumber } from '../config/env';

export type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

const EMPTY_STATE: StorageState = { cookies: [], origins: [] };

/** How long a cached session is trusted before the UI login runs again. */
export function sessionTtlMs(): number {
  return envNumber('SESSION_TTL_MINUTES', 30) * 60_000;
}

/**
 * True when `file` holds a usable session — it exists, parses, carries at
 * least one cookie, and is younger than the TTL. Anything else means "log in".
 */
export function hasFreshSession(file: string, maxAgeMs = sessionTtlMs()): boolean {
  try {
    if (Date.now() - fs.statSync(file).mtimeMs > maxAgeMs) return false;
    const state = JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<StorageState>;
    return Array.isArray(state.cookies) && state.cookies.length > 0;
  } catch {
    return false;
  }
}

/**
 * Write a session file atomically.
 *
 * Workers read this file while another one may be refreshing it; a reader that
 * catches a half-written JSON file fails the whole run. Writing to a private
 * temp file and renaming it means every reader sees either the old session or
 * the new one, never a torn one.
 */
export function writeSession(file: string, state: StorageState): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

/** Snapshot a live context into `file`, atomically. */
export async function saveSession(context: BrowserContext, file: string): Promise<void> {
  writeSession(file, await context.storageState());
}

/** Placeholder state so projects that depend on the file can still start. */
export function writeEmptySession(file: string): void {
  writeSession(file, EMPTY_STATE);
}

/** Drop a cached session — e.g. after the app rejects it as expired. */
export function clearSession(file: string): void {
  fs.rmSync(file, { force: true });
}
