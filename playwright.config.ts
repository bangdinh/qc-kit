import { defineConfig, devices } from '@playwright/test';
import { config } from './src/config/environments';
import { currentEnv, isCI, loadDotEnv } from './src/config/env';

loadDotEnv();

const STORAGE_STATE = 'playwright/.auth/user.json';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : undefined,

  timeout: config.timeouts.test,
  expect: { timeout: config.timeouts.expect },

  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: config.baseURL,
    actionTimeout: config.timeouts.action,
    navigationTimeout: config.timeouts.navigation,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },

  projects: [
    /* 1. Logs in once and stores the session on disk. */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    /* 2. API specs — no browser is launched. */
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: config.apiURL },
    },

    /* 3. UI + E2E specs, already signed in. */
    {
      name: 'chromium',
      testDir: './tests',
      testMatch: '**/{ui,e2e}/**/*.spec.ts',
      grepInvert: /@guest/,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },

    /* 4. Anything that must start signed out (login, registration, errors). */
    {
      name: 'chromium-guest',
      testDir: './tests',
      testMatch: '**/{ui,e2e}/**/*.spec.ts',
      grep: /@guest/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Enable once the suite is stable on Chromium:
    // {
    //   name: 'firefox',
    //   testDir: './tests',
    //   testMatch: '**/{ui,e2e}/**/*.spec.ts',
    //   use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 7'], storageState: STORAGE_STATE },
    //   dependencies: ['setup'],
    // },
  ],

  metadata: { environment: currentEnv(), baseURL: config.baseURL },
});
