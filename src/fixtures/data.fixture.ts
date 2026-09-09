import { test as base } from '@playwright/test';

export interface DataFixtures<T> {
  /** Whatever the project hands in: accounts, factories, tenant codes… */
  testData: T;
}

/**
 * Expose a project's test data to every spec as `testData`.
 *
 * Generic on purpose: what counts as test data is entirely product knowledge, so the kit
 * carries the wiring and none of the content.
 *
 *   createDataFixture({ accounts, buildUser })
 */
export function createDataFixture<T>(data: T) {
  return base.extend<DataFixtures<T>>({
    testData: async ({}, use) => {
      await use(data);
    },
  });
}
