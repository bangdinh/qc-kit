/**
 * The Playwright config every project starts from.
 *
 * What is worth sharing here is not the timeouts — those come from the
 * environment table — but the *project layout*: sign in once in `setup`, run
 * authenticated specs in `chromium`, run anything tagged `@guest` in a project
 * with no session, keep API specs out of the browser entirely. Getting that
 * wrong is how a suite ends up logging in on every spec file.
 *
 *   export default definePlaywrightConfig({ env: config });
 */
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import type { ResolvedEnvironment } from './define-environments';
import { envFlag, envNumber, isCI, loadDotEnv } from './env';
import { STORAGE_STATE } from './paths';

type Projects = NonNullable<PlaywrightTestConfig['projects']>;

export interface PlaywrightPresetOptions {
  /** Resolved environment — URLs and timeouts for this run. */
  env: ResolvedEnvironment;
  /** Root of the spec tree. Default: `./tests`. */
  testDir?: string;
  /** Where traces, screenshots and videos land. Default: `./test-results`. */
  outputDir?: string;
  /** Session the authenticated projects reuse. Default: the shared one. */
  storageState?: string;
  /** Which files count as setup projects. Default: `*.setup.ts`. */
  setupMatch?: RegExp;
  /** Which files count as UI specs. Default: `**​/{ui,e2e}/**​/*.spec.ts`. */
  specMatch?: string;
  /**
   * Show the browser window instead of running headless.
   *
   * Default comes from `HEADED` in `.env`, so watching a run is a one-line
   * change and never a code change. **Ignored in CI**, which is always
   * headless — a headed run on an agent without a display fails to launch.
   */
  headed?: boolean;
  /**
   * Slow every action down by N milliseconds so a human can follow along.
   * Only applied when headed; defaults to `SLOW_MO` in `.env`.
   */
  slowMo?: number;
  /**
   * Open the browser window maximized and let the page fill it, instead of the
   * fixed 1280×720 viewport the device preset carries.
   *
   * Defaults to `true` whenever the run is headed — a window you are watching
   * should use the whole screen. Set it to `false` when a spec depends on an
   * exact viewport (responsive breakpoints, visual comparison), because a
   * maximized window is a different size on every machine.
   *
   * Chromium-only flag; other browsers ignore it and keep their own sizing.
   */
  maximized?: boolean;
  /** Turn the optional projects off for a product that has no API or no guest flows. */
  projects?: {
    /**
     * Unit tests for the kit's own pure code (any `*.test.ts` under `src`). No browser, no
     * credentials, no network — this is the project `npm run verify` runs, and the
     * one a contributor can run on a laptop with nothing configured. Default: true.
     */
    unit?: boolean;
    /** API specs, no browser. Default: true. */
    api?: boolean;
    /** Signed-out specs tagged `@guest` — login, registration, errors. Default: true. */
    guest?: boolean;
  };
  /** Extra projects appended after the preset's own (firefox, mobile, …). */
  extraProjects?: Projects;
  /** Anything else Playwright accepts. Shallow-merged last; `use` is merged one level deep. */
  overrides?: PlaywrightTestConfig;
}

export function definePlaywrightConfig(options: PlaywrightPresetOptions): PlaywrightTestConfig {
  loadDotEnv();

  const {
    env,
    testDir = './tests',
    outputDir = './test-results',
    storageState = STORAGE_STATE,
    setupMatch = /.*\.setup\.ts/,
    specMatch = '**/{ui,e2e}/**/*.spec.ts',
    overrides,
  } = options;

  const withUnit = options.projects?.unit ?? true;
  const withApi = options.projects?.api ?? true;
  const withGuest = options.projects?.guest ?? true;

  // CI has no display: a headed launch there fails before the first test runs.
  const headed = !isCI && (options.headed ?? envFlag('HEADED', false));
  const slowMo = options.slowMo ?? envNumber('SLOW_MO', 0);
  const maximized = headed && (options.maximized ?? true);

  const launchOptions = {
    ...(maximized ? { args: ['--start-maximized'] } : {}),
    ...(headed && slowMo > 0 ? { slowMo } : {}),
  };

  /**
   * Browser settings shared by every UI project.
   *
   * `viewport: null` is what actually makes the page fill the window —
   * `--start-maximized` only sizes the *window*, and the device preset would
   * otherwise pin the page to 1280×720 inside it.
   *
   * `deviceScaleFactor` and `isMobile` have to come off with it: Playwright
   * rejects both when the viewport is null ("deviceScaleFactor option is not
   * supported with null viewport") and the context fails to open at all.
   */
  const { deviceScaleFactor: _scale, isMobile: _mobile, ...desktopChrome } =
    devices['Desktop Chrome'];

  const browserUse = maximized
    ? { ...desktopChrome, viewport: null }
    : devices['Desktop Chrome'];

  const projects: Projects = [
    /* 0. The kit's own unit tests. First on purpose: it is the only project that
       runs with nothing configured, and the VS Code extension enables the first
       project by default (see README §5). */
    ...(withUnit
      ? [{ name: 'unit', testDir: './src', testMatch: /.*\.test\.ts/ }]
      : []),

    /* 1. Logs in once and stores the session on disk. */
    { name: 'setup', testMatch: setupMatch },

    /* 2. API specs — no browser is launched. */
    ...(withApi
      ? [{ name: 'api', testDir: `${testDir}/api`, use: { baseURL: env.apiURL } }]
      : []),

    /* 3. UI + E2E specs, already signed in. */
    {
      name: 'chromium',
      testDir,
      testMatch: specMatch,
      grepInvert: /@guest/,
      use: { ...browserUse, storageState },
      dependencies: ['setup'],
    },

    /* 4. Anything that must start signed out (login, registration, errors). */
    ...(withGuest
      ? [
          {
            name: 'chromium-guest',
            testDir,
            testMatch: specMatch,
            grep: /@guest/,
            use: { ...browserUse },
          },
        ]
      : []),

    ...(options.extraProjects ?? []),
  ];

  const preset = defineConfig({
    testDir,
    outputDir,

    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    // Headed runs are for watching: several browser windows fighting over the
    // screen is not something a human can follow, so drop to one worker.
    workers: isCI ? 4 : headed ? 1 : undefined,

    timeout: env.timeouts.test,
    expect: { timeout: env.timeouts.expect },

    reporter: isCI
      ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
      : [['list'], ['html', { open: 'never' }]],

    use: {
      baseURL: env.baseURL,
      actionTimeout: env.timeouts.action,
      navigationTimeout: env.timeouts.navigation,
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      testIdAttribute: 'data-testid',
      headless: !headed,
      ...(Object.keys(launchOptions).length > 0 ? { launchOptions } : {}),
    },

    projects,

    metadata: { environment: env.name, baseURL: env.baseURL },
  });

  if (!overrides) return preset;

  return {
    ...preset,
    ...overrides,
    use: { ...preset.use, ...overrides.use },
  };
}
