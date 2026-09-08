import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { logger } from './logger';
import { currentTestInfo, step } from './step';

/**
 * Every page object extends this class.
 *
 * Rules of thumb for subclasses:
 *  - declare locators as readonly fields built with getByRole/getByLabel/getByTestId
 *  - expose intent-revealing methods (`submitLoginForm()`), never raw clicks
 *  - wrap each of those methods in `this.step(...)` so the report reads as a story
 *  - assertions that belong to the page live here as `expectX()` methods;
 *    test-specific assertions stay in the spec
 */
export abstract class BasePage {
  /** Path appended to baseURL by `open()`. Override in the subclass. */
  protected readonly path: string = '/';

  constructor(protected readonly page: Page) {}

  /**
   * Wrap an action in a reporter step, prefixed with the page's name:
   *
   *   async login(user: string, pass: string): Promise<void> {
   *     await this.step(`log in as "${user}"`, async () => {
   *       await this.username.fill(user);
   *       await this.password.fill(pass);
   *       await this.submit.click();
   *     });
   *   }
   *
   * Renders in the HTML report as `LoginPage: log in as "qa-user"`.
   */
  protected step<T>(title: string, body: () => Promise<T>): Promise<T> {
    return step(`${this.constructor.name}: ${title}`, body);
  }

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

  /**
   * Full-page screenshot written to this test's own output folder and attached
   * to the report. Using testInfo.outputPath() keeps parallel workers from
   * overwriting each other's files when two tests screenshot the same name.
   */
  async screenshot(name: string): Promise<Buffer> {
    return this.step(`screenshot "${name}"`, async () => {
      const info = currentTestInfo();
      const file = info
        ? info.outputPath(`${name}.png`)
        : `test-results/screenshots/${name}.png`;

      const buffer = await this.page.screenshot({ path: file, fullPage: true });
      await info?.attach(name, { path: file, contentType: 'image/png' });
      return buffer;
    });
  }

  // ---------------------------------------------------------------------
  // Small shared helpers. Keep this list short: prefer Playwright's built-in
  // auto-waiting over custom wrappers.
  // ---------------------------------------------------------------------

  protected async clickWhenReady(locator: Locator): Promise<void> {
    await expect(locator).toBeEnabled();
    await locator.click();
  }

  protected async fillIfPresent(locator: Locator, value?: string): Promise<void> {
    if (value === undefined) return;
    await locator.fill(value);
  }

  protected async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }
}
