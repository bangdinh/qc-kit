/**
 * Project wiring for the per-worker login.
 *
 * All the logic lives in `src/core/auth.ts`; this file only says which account
 * to use and which baseURL the throwaway login context gets. When the core
 * becomes a package, this is the part that stays in the project.
 *
 * Specs opt in through `authenticatedTest` in `src/fixtures/index.ts` — never
 * by calling `LoginPage.signIn()` in a `beforeEach`.
 */
import { config } from '../config/environments';
import { createAuthFixture } from '../core/auth';
import { standardUser } from '../data/authenticators';

export const authFixture = createAuthFixture(standardUser, { baseURL: config.baseURL });

export type { AuthWorkerFixtures } from '../core/auth';
