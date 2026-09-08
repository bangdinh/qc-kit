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

export const test = mergeTests(pagesFixture, apiFixture, dataFixture);
export { expect };
export type { PageFixtures } from './pages.fixture';
export type { ApiFixtures } from './api.fixture';
export type { DataFixtures } from './data.fixture';
