# AutomationPlaywright

End-to-end test automation framework built on [Playwright](https://playwright.dev) +
TypeScript, using the **Page Object Model with custom fixtures**.

## Quick start

```bash
npm install
npm run install:browsers      # one time: downloads browser binaries
cp .env.example .env          # then fill in URLs and test accounts
npm test                      # run everything
npm run report                # open the HTML report
```

## Project structure

```
AutomationPlaywright/
├── playwright.config.ts        # projects, timeouts, reporters, baseURL
├── tsconfig.json               # strict TS + @-path aliases
├── .env.example                # every variable the framework reads
├── STRUCTURE.md                # deep structure map + execution flow of a run
│
├── src/
│   ├── config/                 # environment resolution
│   │   ├── env.ts              #   .env loader + typed getters (envVar/envFlag/envNumber)
│   │   └── environments.ts     #   per-env URLs & timeouts; .env overrides win
│   │
│   ├── core/                   # framework base classes — rarely changes
│   │   ├── base.page.ts        #   BasePage: open(), step(), screenshot(), shared helpers
│   │   ├── base.component.ts   #   BaseComponent: root-scoped UI pieces (header, modal, grid)
│   │   ├── step.ts             #   step()/currentTestInfo(): reporter steps, safe outside a test
│   │   └── logger.ts           #   level-aware logging
│   │
│   ├── pages/                  # one page object per page, extends BasePage
│   ├── components/             # reusable UI components, extends BaseComponent
│   │
│   ├── api/
│   │   ├── clients/            #   BaseApiClient + one client per resource
│   │   └── models/             #   request/response types
│   │
│   ├── fixtures/               # what tests actually import
│   │   ├── pages.fixture.ts    #   createPage() + per-page fixtures
│   │   ├── api.fixture.ts      #   apiContext, apiToken, createClient()
│   │   ├── data.fixture.ts     #   testData: accounts + factories
│   │   └── index.ts            #   merged `test` and `expect`
│   │
│   ├── data/
│   │   ├── credentials.ts      #   accounts read from .env — no secrets in git
│   │   ├── factories/          #   buildUser() etc., valid by default, overridable
│   │   └── static/             #   shared JSON/CSV fixture data
│   │
│   ├── utils/                  # random, date, file, polling helpers
│   └── types/                  # shared TS types
│
├── tests/
│   ├── setup/auth.setup.ts     # logs in once, saves storage state
│   ├── ui/                     # single-feature UI specs
│   ├── e2e/                    # cross-feature journeys
│   └── api/                    # API-only specs (no browser)
│
└── playwright/.auth/           # saved storage state (git-ignored)
```

[STRUCTURE.md](STRUCTURE.md) documents the same tree file by file, plus the layer
dependency rules and the exact execution flow of a run (config load → setup project →
fixture resolution → teardown).

## How the layers fit together

When a test script runs, control passes through the folders in this order:

```
src/config -> playwright.config.ts -> tests/setup -> tests/ui | tests/e2e | tests/api
    -> src/fixtures -> src/pages | src/components | src/api -> src/core -> playwright-report
```

1. **`src/config`** — reads `.env` and picks the environment (URLs and timeouts for
   local / dev / staging / prod). Nothing else starts until this resolves, so one
   variable switches the whole suite between environments.

2. **`playwright.config.ts`** — turns that configuration into *projects*: which specs
   run, in which browser, signed in or signed out, with which timeouts and reports.

3. **`tests/setup`** — signs in once, at the very start of the run, and saves the
   session to `playwright/.auth/`. Every later test reuses it, so no test spends time
   logging in through the screen.

4. **`tests/ui` | `tests/e2e` | `tests/api`** — the test script itself. It holds only
   the scenario and the checks, in business language: open the page, do the action,
   expect the result.

5. **`src/fixtures`** — the delivery layer. It hands each test exactly what that test
   asked for — a signed-in browser page, an API connection, test data — and builds
   nothing else. This is the only folder a test script imports.

6. **`src/pages` | `src/components` | `src/api`** — the application knowledge. Page
   objects know the screens (buttons, fields, actions); API clients know the endpoints.
   Their data comes from `src/data`: real accounts from `.env`, generated records from
   factories. When the application changes, this is the layer that changes.

7. **`src/core`** — the shared foundation used by everything above: navigation,
   reporting steps, screenshots, HTTP calls and error handling, written once and
   inherited. It has no knowledge of any particular application screen, so it rarely
   changes.

8. **`playwright-report` / `test-results`** — the output. An HTML report of every test,
   with a trace, screenshot and video captured **only** for the ones that failed.

In one line: **configuration -> sign-in -> test script -> fixtures -> page objects and
API clients -> shared base classes -> report.**

Two rules keep this flow one-directional: a test script never builds a page object or a
connection itself (it asks `src/fixtures`), and a page object never contains a business
assertion (that stays in the test script). That is what lets the same page object serve
many tests, and what keeps a failing test readable.

For the engineering detail — which class runs at each step, the full module graph and a
sequence diagram — see [STRUCTURE.md §8](STRUCTURE.md#8-execution-flow--what-runs-and-in-what-order).

## Playwright projects

| Project           | What it runs                              | Auth                     |
|-------------------|-------------------------------------------|--------------------------|
| `setup`           | `tests/setup/*.setup.ts`                  | performs the login       |
| `api`             | `tests/api/**`                            | bearer token, no browser |
| `chromium`        | `tests/ui/**`, `tests/e2e/**`             | signed in (storage state)|
| `chromium-guest`  | specs tagged `@guest`                     | signed out               |

```bash
npm run test:ui          # UI + E2E, authenticated
npm run test:api         # API only
npm run test:guest       # signed-out specs
npm run test:smoke       # anything tagged @smoke
npm run test:watch       # Playwright UI mode
npm run typecheck        # tsc --noEmit
```

## Adding a page object

1. `src/pages/login.page.ts`

```ts
import { BasePage } from '../core/base.page';

export class LoginPage extends BasePage {
  protected readonly path = '/login';

  readonly username = this.page.getByLabel('Username');
  readonly password = this.page.getByLabel('Password');
  readonly submit = this.page.getByRole('button', { name: 'Sign in' });

  async login(user: string, pass: string): Promise<void> {
    await this.step(`log in as "${user}"`, async () => {
      await this.username.fill(user);
      await this.password.fill(pass);
      await this.submit.click();
    });
  }
}
```

`this.step(...)` (from `BasePage`) wraps the action in a reporter step, so the HTML
report and the trace show `LoginPage: log in as "qa-user"` instead of three anonymous
actions. Wrap every intent-revealing method this way — it costs one line and is what
keeps a failure readable once the suite is large.

2. Export it from `src/pages/index.ts`, and (if it is used often) add a fixture
   in `src/fixtures/pages.fixture.ts`.

3. `tests/ui/login.spec.ts`

```ts
import { test, expect } from '../../src/fixtures';
import { LoginPage } from '../../src/pages/login.page';

test('rejects a wrong password @guest @smoke', async ({ createPage, testData }) => {
  const login = createPage(LoginPage);
  await login.open();
  await login.login(testData.accounts.standard.username, 'wrong-password');
  await expect(login.errorMessage).toBeVisible();
});
```

## Adding an API client

```ts
// src/api/clients/users.client.ts
import { BaseApiClient } from './base.client';
import type { User } from '../models';

export class UsersClient extends BaseApiClient {
  protected readonly basePath = '/users';
  getById = (id: string) => this.json<User>('get', `/${id}`);
  create = (payload: Partial<User>) => this.json<User>('post', '', { data: payload });
}
```

```ts
// tests/api/users.spec.ts
import { test, expect } from '../../src/fixtures';
import { UsersClient } from '../../src/api/clients/users.client';

test('creates a user @api', async ({ createClient, testData }) => {
  const users = createClient(UsersClient);
  const created = await users.create(testData.buildUser());
  expect(created.id).toBeTruthy();
});
```

## Conventions

- **Locators**: `getByRole` > `getByLabel` > `getByTestId` > CSS. Never XPath.
- **Waiting**: rely on Playwright auto-waiting and web-first assertions;
  `page.waitForTimeout` is not allowed in committed code.
- **Steps**: every public page-object and component method wraps its body in
  `this.step(...)`; API calls are stepped automatically by `BaseApiClient`.
- **Screenshots**: use `BasePage.screenshot(name)`, which writes into the test's own
  output folder and attaches the file to the report. Never hardcode a screenshot path —
  parallel workers would overwrite each other.
- **Config**: a blank value in `.env` means "use the default from
  `src/config/environments.ts`". Only set a variable when you mean to override it.
- **Tags**: `@smoke`, `@regression`, `@guest`, `@api` in the test title, selected
  with `--grep`.
- **Naming**: `*.page.ts`, `*.component.ts`, `*.client.ts`, `*.factory.ts`, `*.spec.ts`.
- **Independence**: each test creates the data it needs (factories or API) and
  makes no assumption about run order.
- **Secrets**: only in `.env` / CI secrets — `.env` is git-ignored.

## Next steps

- [ ] Fill `.env` with the real base URL and test accounts
- [ ] Replace the placeholder login in `tests/setup/auth.setup.ts` with a real `LoginPage`
- [ ] Add the first page objects and specs
- [ ] Add a CI pipeline (`npx playwright test` + upload `playwright-report/`)
