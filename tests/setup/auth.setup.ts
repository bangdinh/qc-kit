import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { accounts } from '../../src/data/credentials';
import { logger } from '../../src/core/logger';

/**
 * Runs once before the authenticated projects (see `dependencies` in
 * playwright.config.ts) and saves the signed-in browser state to disk, so no
 * spec ever has to log in through the UI again.
 */
export const STORAGE_STATE = path.resolve('playwright/.auth/user.json');

setup('authenticate as standard user', async ({ page }) => {
  const { username, password } = accounts.standard;

  // Until real credentials + a LoginPage exist, write an empty state so the
  // dependent projects can still start. Delete this block once step 2 is real.
  if (!username || !password) {
    logger.warn('USER_USERNAME / USER_PASSWORD not set — writing an empty storage state.');
    fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
    fs.writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    return;
  }

  // 1. go to the login screen
  await page.goto('/login');

  // 2. sign in — replace with `new LoginPage(page).login(username, password)`
  //    once src/pages/login.page.ts exists
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 3. assert the session is really established before saving it
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
  logger.info(`Saved authenticated state to ${STORAGE_STATE}`);
});

/**
 * Need a second role? Add another setup test writing to its own file, e.g.
 * playwright/.auth/admin.json, and a project that uses it.
 */
