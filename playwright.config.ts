import { definePlaywrightConfig } from './src/config/define-config';
import { config } from './src/config/environments';

/**
 * The preset in `src/config/define-config.ts` owns the project layout, the
 * reporters and the timeouts. This file only says which environment to run
 * against — everything product-specific lives in `src/config/environments.ts`.
 *
 * Adding a browser is an `extraProjects` entry, not a fork of the preset:
 *
 *   extraProjects: [
 *     { name: 'firefox', testDir: './tests', testMatch: '**​/{ui,e2e}/**​/*.spec.ts',
 *       use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
 *       dependencies: ['setup'] },
 *   ]
 */
export default definePlaywrightConfig({
  env: config,
  // The kit's own unit tests. Off by default in the preset — see the option's docs.
  projects: { unit: true },
});
