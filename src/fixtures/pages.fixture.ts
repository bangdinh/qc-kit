import { test as base, type Page } from '@playwright/test';
import type { BasePage } from '../core/base.page';
import { LoginPage } from '../pages/LoginPage';

/** Constructor signature every page object satisfies. */
export type PageObjectClass<T extends BasePage> = new (page: Page) => T;

export interface PageFixtures {
  /**
   * Build any page object on demand — useful for pages not worth a dedicated
   * fixture, and for flows that open a second tab.
   *
   *   const settings = createPage(SettingsPage);
   */
  createPage: <T extends BasePage>(PageClass: PageObjectClass<T>) => T;

  loginPage: LoginPage;
}

export const pagesFixture = base.extend<PageFixtures>({
  createPage: async ({ page }, use) => {
    await use(<T extends BasePage>(PageClass: PageObjectClass<T>) => new PageClass(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
