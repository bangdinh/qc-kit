/**
 * Minimal step logger. Output lands in the Playwright report attachment and
 * the console, which is usually enough; swap the implementation here if the
 * team later adopts winston/pino.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const configured = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
  return levelOrder[configured] ?? levelOrder.info;
}

function write(level: LogLevel, message: string, ...meta: unknown[]): void {
  if (levelOrder[level] < threshold()) return;
  const stamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[${stamp}] [${level.toUpperCase()}] ${message}`, ...meta);
}

export const logger = {
  debug: (message: string, ...meta: unknown[]) => write('debug', message, ...meta),
  info: (message: string, ...meta: unknown[]) => write('info', message, ...meta),
  warn: (message: string, ...meta: unknown[]) => write('warn', message, ...meta),
  error: (message: string, ...meta: unknown[]) => write('error', message, ...meta),
};
