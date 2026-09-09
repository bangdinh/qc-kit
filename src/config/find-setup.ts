import fs from 'node:fs';
import path from 'node:path';

/** Directories never worth walking when looking for a project's own files. */
const SKIP = new Set(['node_modules', '.git', 'test-results', 'playwright-report', 'dist']);

/**
 * Does the spec tree contain a setup file?
 *
 * Used by the preset to fail fast: the authenticated projects read a session file that
 * only a setup project writes, so a project graph with authentication but no setup file
 * fails once per test with an ENOENT that names a path, not a cause.
 *
 * Matching is done on the path **relative to `dir`** — an absolute path drags in the
 * temp/user directories above the project, where a loose pattern can match by accident.
 */
export function hasSetupFile(dir: string, pattern: RegExp): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false; // missing or unreadable dir: nothing to find, and not our error to raise
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name)) continue;
      if (hasSetupFile(path.join(dir, entry.name), pattern)) return true;
      continue;
    }
    if (pattern.test(entry.name)) return true;
  }
  return false;
}
