/** Deterministic-enough random data helpers (no external faker dependency). */

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomString(length = 8, charset = ALPHANUM): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += charset[Math.floor(Math.random() * charset.length)];
  }
  return out;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomEmail(domain = 'example.com'): string {
  return `qa.${Date.now()}.${randomString(5)}@${domain}`;
}

export function randomPick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

/** Suffix that makes a name unique inside a parallel run. */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomString(4)}`;
}
