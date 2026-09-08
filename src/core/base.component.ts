import { expect, type Locator, type Page } from '@playwright/test';
import { BaseUiObject } from './base.ui-object';

/**
 * A component wraps a piece of UI that appears on several pages: a header, a
 * data grid, a modal. It is scoped to a root locator, so its own locators can
 * never leak into the rest of the page.
 *
 *   class Header extends BaseComponent {
 *     readonly logout = this.root.getByRole('button', { name: 'Log out' });
 *
 *     async signOut(): Promise<void> {
 *       await this.step('sign out', () => this.clickWhenReady(this.logout));
 *     }
 *   }
 *
 *   const header = new Header(page, page.getByRole('banner'));
 *
 * It shares `step()`, `capture()` and the locator helpers with `BasePage`, so
 * an action inside a component shows up in the report exactly like an action on
 * a page — as `Header: sign out`.
 */
export abstract class BaseComponent extends BaseUiObject {
  constructor(
    page: Page,
    protected readonly root: Locator,
  ) {
    super(page);
  }

  /** Build a nested component scoped inside this one. */
  protected child<T extends BaseComponent>(
    ComponentClass: new (page: Page, root: Locator) => T,
    root: Locator,
  ): T {
    return new ComponentClass(this.page, root);
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async waitForVisible(timeout?: number): Promise<void> {
    await this.step('wait until visible', async () => {
      await this.root.waitFor({ state: 'visible', timeout });
    });
  }

  async waitForHidden(timeout?: number): Promise<void> {
    await this.step('wait until hidden', async () => {
      await this.root.waitFor({ state: 'hidden', timeout });
    });
  }

  async scrollIntoView(): Promise<void> {
    await this.step('scroll into view', async () => {
      await this.root.scrollIntoViewIfNeeded();
    });
  }

  /** Screenshot of this component only — not the whole page. */
  async screenshot(name: string): Promise<Buffer> {
    return this.capture(name, (file) => this.root.screenshot({ path: file }));
  }

  // ---------------------------------------------------------------------
  // Assertions that belong to the component itself.
  // ---------------------------------------------------------------------

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.root).toBeHidden();
  }
}
