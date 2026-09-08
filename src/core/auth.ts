/**
 * Authentication contract — the seam between the framework and the app.
 *
 * Nothing in here may know what a login screen looks like. A project hands in
 * an `Authenticator` (see `src/data/authenticators.ts`); this module decides
 * *when* to sign in, *where* the session is cached and *who* pays for it — once
 * per run in the setup project, or once per worker in the fixture below.
 *
 * That is what keeps `src/core` publishable: the day this becomes a package,
 * this file moves as-is and only the project's authenticator stays behind.
 */
import { test as base, type Browser, type Page } from '@playwright/test';
import { STORAGE_STATE, storageStatePath } from '../config/paths';
import { logger } from './logger';
import { hasFreshSession, saveSession, sessionTtlMs, writeEmptySession } from './session';

/** What the framework needs from a project in order to sign in. */
export interface Authenticator {
  /** Drive the app's login flow. Should throw or fail an assertion if it fails. */
  signIn(): Promise<void>;
  /** Cache the resulting session, atomically, at `file`. */
  saveSession(file?: string): Promise<void>;
}

/**
 * Builds the authenticator for a page.
 *
 * Return `null` when the account is not configured (no credentials in .env) —
 * the setup project then writes an empty session so dependent projects can
 * still start, instead of failing the whole run.
 */
export type AuthenticatorFactory = (page: Page) => Authenticator | null;

export interface AuthSetupOptions {
  /** Title of the generated setup test. */
  title?: string;
  /** Where to cache the session. Defaults to the shared `STORAGE_STATE`. */
  file?: string;
}

/**
 * Register the "sign in once per run" setup test.
 *
 * Call it from a `*.setup.ts` file in a project that other projects list in
 * their `dependencies`. A session left by an earlier run is reused while it is
 * younger than SESSION_TTL_MINUTES, so repeated local runs skip the UI login.
 */
export function createAuthSetup(
  factory: AuthenticatorFactory,
  options: AuthSetupOptions = {},
): void {
  const file = options.file ?? STORAGE_STATE;

  base(options.title ?? 'authenticate', async ({ page }) => {
    if (hasFreshSession(file)) {
      logger.info(`Reusing the session at ${file} (younger than ${sessionTtlMs() / 60_000} min).`);
      return;
    }

    const auth = factory(page);
    if (!auth) {
      logger.warn(`No account configured — writing an empty storage state to ${file}.`);
      writeEmptySession(file);
      return;
    }

    await auth.signIn();
    await auth.saveSession(file);
    logger.info(`Saved authenticated state to ${file}`);
  });
}

export interface AuthWorkerFixtures {
  /**
   * Path to this worker's cached session. The UI login behind it runs at most
   * once per worker — and not at all when a previous run left a session that is
   * still inside SESSION_TTL_MINUTES.
   */
  workerStorageState: string;
}

export interface AuthFixtureOptions {
  /** baseURL for the throwaway context the login runs in. */
  baseURL?: string;
  /** Override where each worker caches its session. */
  fileFor?: (workerIndex: number) => string;
}

/**
 * Build the "sign in once per worker" fixture.
 *
 * This is the fallback for suites that cannot use the shared session — a role
 * the setup project does not create, or an account the app invalidates on
 * reuse. Worker scope is the point: N spec files running in parallel cost at
 * most one login per worker, not one per file.
 */
export function createAuthFixture(
  factory: AuthenticatorFactory,
  options: AuthFixtureOptions = {},
) {
  const fileFor = options.fileFor ?? ((index: number) => storageStatePath(`worker-${index}`));

  return base.extend<{}, AuthWorkerFixtures>({
    workerStorageState: [
      async ({ browser }, use, workerInfo) => {
        const file = fileFor(workerInfo.workerIndex);

        if (hasFreshSession(file)) {
          logger.debug(`Worker ${workerInfo.workerIndex} reusing the session at ${file}`);
          await use(file);
          return;
        }

        await signInIntoFile(browser, factory, file, options.baseURL);
        logger.info(`Worker ${workerInfo.workerIndex} signed in; session cached at ${file}`);
        await use(file);
      },
      { scope: 'worker' },
    ],
  });
}

/** Sign in inside a throwaway context and cache the result at `file`. */
async function signInIntoFile(
  browser: Browser,
  factory: AuthenticatorFactory,
  file: string,
  baseURL?: string,
): Promise<void> {
  // A context of its own: the login must start signed out even when the project
  // this runs under carries a storageState.
  const context = await browser.newContext({ baseURL, storageState: undefined });
  try {
    const auth = factory(await context.newPage());
    if (!auth) {
      throw new Error(
        'No account configured for the per-worker login. Fill in the credentials ' +
          'the project authenticator reads (see .env.example), or use the shared ' +
          'session written by the auth setup project instead.',
      );
    }
    await auth.signIn();
    await saveSession(context, file);
  } finally {
    await context.close();
  }
}
