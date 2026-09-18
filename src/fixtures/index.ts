/**
 * Fixture building blocks. **The kit exports factories, not a ready-made `test`.**
 *
 * A composed `test` has to name a product's environment table, its accounts and its page
 * objects — so the moment the kit ships one, every consumer inherits somebody else's
 * product. Each project composes its own:
 *
 *   export const test = mergeTests(
 *     pagesFixture,
 *     createApiFixture({ apiURL: config.apiURL }),
 *     createDataFixture({ accounts, buildUser }),
 *     logFixture,
 *   );
 *
 * Signing in is NOT in this list, and not in the kit at all: which screen, which cookie,
 * how long a cached session is trusted are the product's answers. A project that needs it
 * owns its own auth fixture and merges it here — see the `--auth` scaffold output.
 */
export { pagesFixture, type PageFixtures, type PageObjectClass } from './pages.fixture';
export {
  createApiFixture,
  type ApiFixtures,
  type ApiFixtureOptions,
  type ApiClientClass,
} from './api.fixture';
export { createDataFixture, type DataFixtures } from './data.fixture';
export { logFixture } from './log.fixture';
