import path from 'node:path';

/** Folder holding the cached browser sessions (git-ignored). */
export const AUTH_DIR = path.resolve('playwright/.auth');

/**
 * Session file for a role or a worker. One file per writer keeps parallel
 * workers from fighting over the same path:
 *   storageStatePath()            -> playwright/.auth/user.json
 *   storageStatePath('admin')     -> playwright/.auth/admin.json
 *   storageStatePath('worker-3')  -> playwright/.auth/worker-3.json
 */
export function storageStatePath(role = 'user'): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

/**
 * The shared session. `playwright.config.ts` hands it to every authenticated
 * project and `tests/setup/auth.setup.ts` is the only thing that writes it.
 */
export const STORAGE_STATE = storageStatePath('user');
