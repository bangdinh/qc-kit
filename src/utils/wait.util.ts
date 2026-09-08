/**
 * Use Playwright's built-in waiting (locators, expect.toPass, waitForResponse)
 * first. These helpers are for the rare non-UI wait, e.g. polling a backend
 * job until it reports "done".
 */
export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PollOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}

export async function pollUntil<T>(
  action: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeout = 30_000, interval = 1_000, message = 'Condition not met' }: PollOptions = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  let last: T | undefined;

  while (Date.now() < deadline) {
    last = await action();
    if (predicate(last)) return last;
    await sleep(interval);
  }
  throw new Error(`${message} within ${timeout}ms. Last value: ${JSON.stringify(last)}`);
}
