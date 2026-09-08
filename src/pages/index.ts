/**
 * Page objects live in this folder, one file per page:
 *   src/pages/login.page.ts   -> export class LoginPage extends BasePage { ... }
 *   src/pages/dashboard.page.ts
 *
 * Export each of them here, then add it to src/fixtures/pages.fixture.ts so
 * specs receive it as a fixture instead of constructing it by hand.
 *
 * Template:
 *
 *   import { BasePage } from '../core/base.page';
 *
 *   export class LoginPage extends BasePage {
 *     protected readonly path = '/login';
 *
 *     readonly username = this.page.getByLabel('Username');
 *     readonly password = this.page.getByLabel('Password');
 *     readonly submit = this.page.getByRole('button', { name: 'Sign in' });
 *
 *     async login(user: string, pass: string): Promise<void> {
 *       await this.username.fill(user);
 *       await this.password.fill(pass);
 *       await this.submit.click();
 *     }
 *   }
 */
export {};
