/**
 * Project wiring: who signs in, and through which screen.
 *
 * This is the file `src/core/auth.ts` deliberately does not have. The core
 * knows the `Authenticator` contract; only this file knows that logging in
 * means driving `LoginPage` with a company code first.
 *
 * Adding a role? Export another factory here and point a setup test at it.
 */
import type { AuthenticatorFactory } from '../core/auth';
import { LoginPage } from '../pages/LoginPage';
import { accounts, companyCode } from './credentials';

/** The standard account, or `null` when .env has not been filled in. */
export const standardUser: AuthenticatorFactory = (page) => {
  const { username, password } = accounts.standard;
  const company = companyCode();
  if (!company || !username || !password) return null;

  return new LoginPage(page).withCredentials({ company, username, password });
};

/** The admin account. Same shape, different .env variables. */
export const adminUser: AuthenticatorFactory = (page) => {
  const { username, password } = accounts.admin;
  const company = companyCode();
  if (!company || !username || !password) return null;

  return new LoginPage(page).withCredentials({ company, username, password });
};
