import { expect, type Locator, type Page } from '@playwright/test';
import { currentTestInfo, step } from './step';

/**
 * What every page object and every component share.
 *
 * The reason this class exists: a report is only readable when *all* UI actions
 * are wrapped in reporter steps. When `step()` lived on `BasePage` alone, every
 * click that went through a header, a modal or a grid vanished from the report
 * and from the trace — the slowest failures to debug were exactly the ones that
 * left no trace.
 *
 * Subclasses expose intent-revealing methods (`submitLoginForm()`), never raw
 * clicks, and wrap each one in `this.step(...)`.
 */
export abstract class BaseUiObject {
  constructor(protected readonly page: Page) {}

  /**
   * Wrap an action in a reporter step, prefixed with the object's own name:
   *
   *   await this.step('apply coupon', async () => { ... });
   *
   * Renders in the HTML report as `CartSummary: apply coupon`.
   */
  protected step<T>(title: string, body: () => Promise<T>): Promise<T> {
    return step(`${this.constructor.name}: ${title}`, body);
  }

  /**
   * Take a screenshot into this test's own output folder and attach it to the
   * report. `testInfo.outputPath()` is what keeps parallel workers from
   * overwriting each other when two tests shoot the same name.
   *
   * Subclasses decide *what* gets shot — the whole page, or one component.
   */
  protected async capture(name: string, take: (file: string) => Promise<Buffer>): Promise<Buffer> {
    return this.step(`screenshot "${name}"`, async () => {
      const info = currentTestInfo();
      const file = info ? info.outputPath(`${name}.png`) : `test-results/screenshots/${name}.png`;

      const buffer = await take(file);
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

  protected async isDisplayed(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }
}
