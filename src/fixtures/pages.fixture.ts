import { test as base, type Page } from '@playwright/test';
import type { BasePage } from '../core/base.page';

/** Constructor signature every page object satisfies. */
export type PageObjectClass<T extends BasePage> = new (page: Page) => T;

export interface PageFixtures {
  /**
   * Build any page object on demand:
   *
   *   const settings = createPage(SettingsPage);
   *
   * The kit deliberately ships no named page fixtures — it knows no screens. A project
   * adds `loginPage`, `cartPage`… in its own fixture file, next to the page objects.
   */
  createPage: <T extends BasePage>(PageClass: PageObjectClass<T>) => T;
}

export const pagesFixture = base.extend<PageFixtures>({
  createPage: async ({ page }, use) => {
    await use(<T extends BasePage>(PageClass: PageObjectClass<T>) => new PageClass(page));
  },
});
