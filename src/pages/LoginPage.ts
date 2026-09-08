import { expect } from '@playwright/test';
import { STORAGE_STATE } from '../config/paths';
import type { Authenticator } from '../core/auth';
import { BasePage } from '../core/base.page';
import { saveSession } from '../core/session';

/** Everything this app needs before it lets someone in. */
export interface LoginCredentials {
  /** Tenant code — "Mã doanh nghiệp", step 1 of the flow. */
  company: string;
  username: string;
  password: string;
}

/** Vietnamese copy the login screens render (locale prefix `/vi`). */
export const loginMessages = {
  heading: 'Tài khoản doanh nghiệp',
  companyLabel: 'Mã doanh nghiệp',
  submit: 'Tiếp tục',
  demo: 'Dùng thử bản demo',
  /** Continue pressed with the field left empty. */
  errorEmpty: 'Vui lòng nhập mã doanh nghiệp',
  /** The company code did not resolve to a tenant. */
  errorWrong: 'Mã doanh nghiệp không đúng',
  /** Banner shown after /api/auth/login bounces back with ?error=invalid_company. */
  errorInvalidCompany: 'Công ty không hợp lệ. Vui lòng thử lại.',
  /** Credentials step. */
  usernameLabel: 'Tài khoản',
  passwordLabel: 'Mật khẩu',
  signIn: 'Đăng nhập',
} as const;

/** localStorage key the app uses to remember the last accepted company code. */
export const COMPANY_STORAGE_KEY = 'cap.auth.company';

/**
 * Sign-in screen at `/vi/login`.
 *
 * The flow has two steps:
 *  1. company code ("Mã doanh nghiệp") — validated by a server action, then
 *     handed to `/api/auth/login?company=<code>`;
 *  2. username + password, on the identity provider that endpoint redirects to.
 *
 * Both steps are mapped against the live app. Step 2 is a Keycloak realm on a
 * different origin (`staging-sso.fcam.vn/realms/<company>/…`), reached through
 * `/api/auth/login`, and it does ship `data-testid` attributes — hence the
 * `sso-login-*` ids below. Step 1 has none, so those locators lean on the
 * label, the input id and the app's own `cap-auth-*` class names.
 *
 * `signIn()` drives the UI and nothing else. It deliberately does not cache the
 * session: with `fullyParallel` on, a self-caching login means every spec file
 * signs in again and all of them race over the same file. Who caches, and
 * where, is the caller's call — see `saveSession()` below.
 */
export class LoginPage extends BasePage {
  protected override readonly path = '/vi/login';

  // --- step 1: company code (verified against the live app) ---------------

  readonly heading = this.page.getByRole('heading', { name: loginMessages.heading });
  readonly companyCode = this.page.locator('#company');
  readonly submitButton = this.page.getByText('Tiếp tục');
  readonly demoButton = this.page.getByRole('button', { name: loginMessages.demo });

  /** Inline error rendered under the company field. */
  readonly fieldError = this.page.locator('.cap-auth-form [role="alert"]');
  /** Page-level banner rendered above the form (redirect failures). */
  readonly banner = this.page.locator('.cap-auth-glass > [role="alert"]');

  // --- step 2: credentials, on the SSO realm (verified against the live app) --

  readonly username = this.page.getByTestId('sso-login-username-input');
  readonly password = this.page.getByTestId('sso-login-password-input');
  readonly signInButton = this.page.getByTestId('sso-login-submit-btn');

  /** "Sai tài khoản hoặc mật khẩu" and friends. */
  readonly credentialError = this.page.getByTestId('sso-login-credential-error');
  /** Field-level error under the username input. */
  readonly usernameError = this.page.getByTestId('sso-login-username-error');

  override async waitUntilLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.companyCode).toBeEditable();
  }

  // ---------------------------------------------------------------------
  // Step 1 — company code
  // ---------------------------------------------------------------------

  async enterCompanyCode(code: string): Promise<void> {
    await this.step(`enter company code "${code}"`, async () => {
      await this.companyCode.fill(code);
    });
  }

  /** Press Continue. On its own it also drives the empty-value branch. */
  async continue(): Promise<void> {
    await this.step('press Continue', async () => {
      await this.submitButton.click();
    });
  }

  async submitCompanyCode(code: string): Promise<void> {
    await this.enterCompanyCode(code);
    await this.continue();
  }

  // ---------------------------------------------------------------------
  // Step 2 — credentials
  // ---------------------------------------------------------------------

  /** Wait for the identity provider to take over from the company step. */
  async waitForCredentialsStep(): Promise<void> {
    await this.step('wait for the credentials step', async () => {
      await this.page.waitForURL((url) => !url.pathname.endsWith('/login'));
      await expect(this.username).toBeVisible();
    });
  }

  async enterUsername(value: string): Promise<void> {
    await this.step(`enter username "${value}"`, async () => {
      await this.username.fill(value);
    });
  }

  async enterPassword(value: string): Promise<void> {
    await this.step('enter password', async () => {
      await this.password.fill(value);
    });
  }

  async submitCredentials(): Promise<void> {
    await this.step('press Sign in', async () => {
      await this.signInButton.click();
    });
  }

  /**
   * The whole flow, from a cold browser to a signed-in one, for callers that
   * only care about the end state. Opens the page itself so a worker fixture
   * can call it without a spec having navigated first.
   */
  async signIn(company: string, user: string, pass: string): Promise<void> {
    await this.step(`sign in as "${user}" at "${company}"`, async () => {
      // Navigate only when the caller has not already — a spec that opened the
      // page in `beforeEach` should not pay for a second round trip.
      if (!this.page.url().includes('/login')) {
        await this.open();
      }
      await this.waitUntilLoaded();
      await this.submitCompanyCode(company);
      await this.waitForCredentialsStep();
      await this.enterUsername(user);
      await this.enterPassword(pass);
      await this.submitCredentials();
      await this.expectSignedIn();
    });
  }

  /**
   * Bind an account to this page and hand back the framework's `Authenticator`.
   *
   * This is the adapter between "a page with a two-step form" and the contract
   * `createAuthSetup()` / `createAuthFixture()` understand — which is why they
   * never need to import this class.
   */
  withCredentials({ company, username, password }: LoginCredentials): Authenticator {
    return {
      signIn: () => this.signIn(company, username, password),
      saveSession: (file?: string) => this.saveSession(file),
    };
  }

  // ---------------------------------------------------------------------
  // Session reuse
  // ---------------------------------------------------------------------

  /**
   * Cache cookies + origin storage so later runs skip the UI login.
   *
   * Only two callers should write the shared `STORAGE_STATE`: the auth setup
   * project, once per run before the authenticated projects start, and the
   * login spec itself, where saving the cookies is the point. Everything else
   * passes its own path (`storageStatePath('worker-2')`, `'admin'`, …) —
   * parallel workers sharing one file is how sessions get clobbered.
   *
   * The write is atomic, so a worker reading the file while another refreshes
   * it still sees a complete session.
   */
  async saveSession(file: string = STORAGE_STATE): Promise<void> {
    await this.step(`save the signed-in session to "${file}"`, async () => {
      await saveSession(this.page.context(), file);
    });
  }


  /** Left the login flow behind and the browser is holding a session. */
  async expectSignedIn(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/);
    await expect(this.signInButton).toBeHidden();
  }
}
