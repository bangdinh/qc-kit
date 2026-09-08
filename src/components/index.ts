/**
 * Shared UI components (header, sidebar, modal, table) extending
 * BaseComponent. One file per component, exported here.
 *
 * Template:
 *
 *   import { type Locator, type Page } from '@playwright/test';
 *   import { BaseComponent } from '../core/base.component';
 *
 *   export class Header extends BaseComponent {
 *     readonly logout = this.root.getByRole('button', { name: 'Log out' });
 *
 *     constructor(page: Page, root: Locator = page.getByRole('banner')) {
 *       super(page, root);
 *     }
 *
 *     async signOut(): Promise<void> {
 *       await this.step('sign out', () => this.clickWhenReady(this.logout));
 *     }
 *   }
 *
 * Wrap every action in `this.step(...)` exactly like a page object does — that
 * is what puts `Header: sign out` in the report instead of a bare click.
 */
export {};
