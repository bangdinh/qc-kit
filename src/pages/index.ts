/**
 * Page objects live in this folder, one file per page:
 *   src/pages/LoginPage.ts -> export class LoginPage extends BasePage { ... }
 *
 * Export each of them here, then add it to src/fixtures/pages.fixture.ts so
 * specs receive it as a fixture instead of constructing it by hand.
 */
export { LoginPage, loginMessages, COMPANY_STORAGE_KEY } from './LoginPage';
export type { LoginCredentials } from './LoginPage';
