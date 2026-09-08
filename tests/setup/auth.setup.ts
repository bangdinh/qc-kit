/**
 * The one place the suite signs in through the UI.
 *
 * Runs once per run, before the authenticated projects (see `dependencies` in
 * playwright.config.ts), and writes the session every one of them reuses — so
 * no spec ever logs in, however many run in parallel. A session left by an
 * earlier run is reused until it is older than SESSION_TTL_MINUTES.
 *
 * The flow itself lives in `src/core/auth.ts`; the only project-specific thing
 * here is which account to sign in as.
 */
import { STORAGE_STATE } from '../../src/config/paths';
import { createAuthSetup } from '../../src/core/auth';
import { standardUser } from '../../src/data/authenticators';

export { STORAGE_STATE };

createAuthSetup(standardUser, { title: 'authenticate as standard user' });

/**
 * Need a second role? Add one line — the framework does the rest:
 *
 *   createAuthSetup(adminUser, {
 *     title: 'authenticate as admin',
 *     file: storageStatePath('admin'),
 *   });
 *
 * then point a project's `use.storageState` at that file.
 */
