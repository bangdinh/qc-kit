/**
 * Reporter steps.
 *
 * A step turns the HTML report and the trace from a flat list of actions into
 * a readable narrative — at a few hundred specs this is the difference between
 * "assertion failed" and "assertion failed inside 'Checkout: apply coupon'".
 *
 * Everything here degrades gracefully outside a running test (global setup,
 * one-off scripts), so base classes can use it unconditionally.
 */
import { test, type TestInfo } from '@playwright/test';

/** The running test's info, or undefined when no test is running. */
export function currentTestInfo(): TestInfo | undefined {
  try {
    return test.info();
  } catch {
    return undefined;
  }
}

/** Wrap `body` in a reporter step when a test is running; otherwise just run it. */
export async function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  return currentTestInfo() ? test.step(title, body) : body();
}
