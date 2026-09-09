import { test, expect } from '../fixtures';

/**
 * Login — https://beta-vmsmart-next.fcam.vn/vi/login
 *
 * Signing in takes two steps:
 *   1. the company code ("Mã doanh nghiệp"), validated by a server action and
 *      then handed to `/api/auth/login?company=<code>`;
 *   2. the identity provider that endpoint redirects to, which asks for the
 *      username and password.
 *
 * Step 2 lives on a Keycloak realm at a different origin, so this spec crosses
 * two domains in one flow — see the note on LoginPage.
 *
 * Tagged @guest so it runs under the `chromium-guest` project, which starts
 * with no stored session (see playwright.config.ts).
 */
test.describe('Login @guest', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.waitUntilLoaded();
  });

  test('Login success', async ({ page, loginPage, testData }) => {
    const company = testData.companyCode();
    const { username, password } = testData.accounts.standard;

    test.skip(
      !company || !username || !password,
      'Set COMPANY_CODE, USER_USERNAME and USER_PASSWORD in .env to run this.',
    );

    // Login
    await loginPage.signIn(company, username, password);

  });
});
