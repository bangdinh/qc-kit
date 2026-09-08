/**
 * The single `test` every spec imports:
 *
 *   import { test, expect } from '../../src/fixtures';
 *
 * It merges the page, API and data fixtures, so a spec can ask for exactly
 * what it needs and nothing gets constructed that it doesn't.
 */
import { mergeTests, expect } from '@playwright/test';
import { pagesFixture } from './pages.fixture';
import { apiFixture } from './api.fixture';
import { dataFixture } from './data.fixture';
import { authFixture } from './auth.fixture';
import { logFixture } from './log.fixture';

export const test = mergeTests(pagesFixture, apiFixture, dataFixture, authFixture, logFixture);

/**
 * `test` with a session attached, for suites that must sign in themselves.
 *
 * Most specs do not need this: the `chromium` project already starts signed in
 * from the session the `setup` project wrote (playwright.config.ts). Reach for
 * `authenticatedTest` only when the shared session will not do — and then the
 * login runs once per worker, not once per spec file:
 *
 *   import { authenticatedTest as test, expect } from '../../src/fixtures';
 *
 *   test('sees the dashboard', async ({ page }) => { ... });  // already signed in
 */
export const authenticatedTest = test.extend({
  storageState: async ({ workerStorageState }, use) => {
    await use(workerStorageState);
  },
});

export { expect };
export type { PageFixtures } from './pages.fixture';
export type { ApiFixtures } from './api.fixture';
export type { DataFixtures } from './data.fixture';
export type { AuthWorkerFixtures } from './auth.fixture';
