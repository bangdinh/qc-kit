import { type Response } from '@playwright/test';
import { BaseUiObject } from './base.ui-object';
import { logger } from './logger';

/**
 * Every page object extends this class.
 *
 * Rules of thumb for subclasses:
 *  - declare locators as readonly fields built with getByRole/getByLabel/getByTestId
 *  - expose intent-revealing methods (`submitLoginForm()`), never raw clicks
 *  - wrap each of those methods in `this.step(...)` so the report reads as a story
 *  - assertions that belong to the page live here as `expectX()` methods;
 *    test-specific assertions stay in the spec
 *
 * Steps, screenshots and the shared locator helpers come from `BaseUiObject`,
 * which components share — so a click inside a modal reads in the report the
 * same way a click on the page does.
 */
export abstract class BasePage extends BaseUiObject {
  /** Path appended to baseURL by `open()`. Override in the subclass. */
  protected readonly path: string = '/';

  /** Navigate to this page's path (relative to baseURL). */
  async open(pathOverride?: string): Promise<Response | null> {
    const target = pathOverride ?? this.path;
    return this.step(`open "${target}"`, async () => {
      logger.debug(`Opening ${this.constructor.name} at "${target}"`);
      return this.page.goto(target, { waitUntil: 'domcontentloaded' });
    });
  }

  /** Override when a page has a reliable "I am loaded" signal. */
  async waitUntilLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  get title(): Promise<string> {
    return this.page.title();
  }

  get url(): string {
    return this.page.url();
  }

  async reload(): Promise<void> {
    await this.step('reload', async () => {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    });
  }

  /** Full-page screenshot, written to this test's output folder and attached. */
  async screenshot(name: string): Promise<Buffer> {
    return this.capture(name, (file) => this.page.screenshot({ path: file, fullPage: true }));
  }
}
