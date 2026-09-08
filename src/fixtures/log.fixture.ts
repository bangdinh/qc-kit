import { test as base } from '@playwright/test';
import { attachLog } from '../core/logger';

/**
 * Attaches this test's log to the report.
 *
 * `auto: true` is the point: no spec has to ask for it, and a test that never
 * touches the logger pays nothing — the buffer is empty and nothing is
 * attached. The teardown half runs after the test body, which is the only
 * moment where the full log exists and the report is still open.
 */
export const logFixture = base.extend<{ capturedLog: void }>({
  capturedLog: [
    async ({}, use, testInfo) => {
      await use();
      await attachLog(testInfo);
    },
    { auto: true },
  ],
});
