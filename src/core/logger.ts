/**
 * Level-aware logging that ends up where you can actually read it.
 *
 * Two destinations, on purpose:
 *  - the console, for watching a local run;
 *  - an attachment on the running test, because in CI the console is a single
 *    stream shared by every parallel worker. A line that says "session expired"
 *    is useless when you cannot tell which of eight tests wrote it.
 *
 * Lines are buffered per test and attached once at teardown by `logFixture`
 * (src/fixtures/log.fixture.ts). Everything degrades gracefully outside a test
 * — global setup, one-off scripts — where only the console gets written to.
 */
import type { TestInfo } from '@playwright/test';
import { currentTestInfo } from './step';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Buffered lines, keyed by test + retry so a retried test starts clean. */
const buffers = new Map<string, string[]>();

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
  return levelOrder[configured] ?? levelOrder.info;
}

function bufferKey(info: TestInfo): string {
  return `${info.testId}#${info.retry}`;
}

function format(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    // Circular structures — a page object, a config with a back-reference.
    return String(value);
  }
}

function write(level: LogLevel, message: string, ...meta: unknown[]): void {
  if (levelOrder[level] < threshold()) return;

  const stamp = new Date().toISOString();
  const worker = process.env.TEST_WORKER_INDEX;
  const tail = meta.length ? ` ${meta.map(format).join(' ')}` : '';
  const line =
    `[${stamp}] [${level.toUpperCase()}]` +
    (worker === undefined ? '' : ` [w${worker}]`) +
    ` ${message}${tail}`;

  const info = currentTestInfo();
  if (info) {
    const key = bufferKey(info);
    const lines = buffers.get(key);
    if (lines) lines.push(line);
    else buffers.set(key, [line]);
  }

  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](line);
}

export const logger = {
  debug: (message: string, ...meta: unknown[]) => write('debug', message, ...meta),
  info: (message: string, ...meta: unknown[]) => write('info', message, ...meta),
  warn: (message: string, ...meta: unknown[]) => write('warn', message, ...meta),
  error: (message: string, ...meta: unknown[]) => write('error', message, ...meta),
};

/**
 * Attach everything this test logged and drop the buffer.
 *
 * Called once per test by `logFixture`; calling it twice is harmless, and a
 * test that logged nothing gets no empty attachment.
 */
export async function attachLog(info: TestInfo): Promise<void> {
  const key = bufferKey(info);
  const lines = buffers.get(key);
  buffers.delete(key);
  if (!lines?.length) return;

  await info.attach('run.log', {
    body: Buffer.from(`${lines.join('\n')}\n`, 'utf-8'),
    contentType: 'text/plain',
  });
}
