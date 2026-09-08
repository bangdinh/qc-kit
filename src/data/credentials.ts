import { envVar } from '../config/env';
import type { Credentials } from '../types';

/**
 * Accounts that must already exist in the environment. Values come from .env
 * (or CI secrets) so no password is ever committed.
 */
export const accounts = {
  get standard(): Credentials {
    return { username: envVar('USER_USERNAME', ''), password: envVar('USER_PASSWORD', '') };
  },
  get admin(): Credentials {
    return { username: envVar('ADMIN_USERNAME', ''), password: envVar('ADMIN_PASSWORD', '') };
  },
} as const;

/**
 * Tenant the login screen asks for before it ever sees a username
 * ("Mã doanh nghiệp"). The app lower-cases and trims whatever is typed.
 */
export function companyCode(): string {
  return envVar('COMPANY_CODE', '').trim().toLowerCase();
}
