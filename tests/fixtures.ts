/**
 * Product wiring for this repo's own example suite.
 *
 * This file is what a project writes; everything it imports from `../src` is what the
 * kit ships. Keeping it here rather than in `src/fixtures` is the boundary: the kit
 * knows fixtures, this file knows VMSmart.
 *
 * A scaffolded project gets a copy of this file with its own imports filled in.
 */
import { mergeTests, expect, test as base } from '@playwright/test';
import { config } from '../src/config/environments';
import { createAuthFixture } from '../src/core/auth';
import {
  createApiFixture,
  createDataFixture,
  logFixture,
  pagesFixture,
} from '../src/fixtures';
import { standardUser } from '../src/data/authenticators';
import { accounts, companyCode } from '../src/data/credentials';
import { buildUser, buildUsers } from '../src/data/factories/user.factory';
import { LoginPage } from '../src/pages/LoginPage';

/** Screens used often enough to be worth a name of their own. */
const screensFixture = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export const test = mergeTests(
  pagesFixture,
  screensFixture,
  createApiFixture({ apiURL: config.apiURL }),
  createDataFixture({ accounts, companyCode, buildUser, buildUsers }),
  createAuthFixture(standardUser, { baseURL: config.baseURL }),
  logFixture,
);

/**
 * `test` with a session attached, for suites that must sign in themselves. Most specs do
 * not need it — the `chromium` project already starts signed in.
 */
export const authenticatedTest = test.extend({
  storageState: async ({ workerStorageState }, use) => {
    await use(workerStorageState);
  },
});

export { expect };
