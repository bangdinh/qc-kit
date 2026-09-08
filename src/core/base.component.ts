import type { Locator, Page } from '@playwright/test';

/**
 * A component wraps a piece of UI that appears on several pages: a header, a
 * data grid, a modal. It is scoped to a root locator so its own locators can
 * never leak into the rest of the page.
 *
 *   class Header extends BaseComponent {
 *     readonly logout = this.root.getByRole('button', { name: 'Log out' });
 *   }
 *   const header = new Header(page, page.getByRole('banner'));
 */
export abstract class BaseComponent {
  constructor(
    protected readonly page: Page,
    protected readonly root: Locator,
  ) {}

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async waitForVisible(timeout?: number): Promise<void> {
    await this.root.waitFor({ state: 'visible', timeout });
  }
}
