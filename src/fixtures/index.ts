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
 *     createAuthFixture(standardUser, { baseURL: config.baseURL }),
 *     logFixture,
 *   );
 *
 * `createAuthFixture` lives in `qc-kit/core` — it is the auth contract, not a fixture
 * detail.
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
