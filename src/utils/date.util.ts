export function today(): Date {
  return new Date();
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** YYYY-MM-DD */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Timestamp safe for file names: 2026-09-08T10-30-00 */
export function fileStamp(date: Date = new Date()): string {
  return date.toISOString().replace(/:/g, '-').split('.')[0];
}
