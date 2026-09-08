import { test as base, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { config } from '../config/environments';
import type { BaseApiClient } from '../api/clients/base.client';

export type ApiClientClass<T extends BaseApiClient> = new (
  request: APIRequestContext,
  token?: string,
) => T;

export interface ApiFixtures {
  /** Request context pointed at apiURL, independent of the browser session. */
  apiContext: APIRequestContext;
  /** Bearer token shared by API clients; resolved once per worker. */
  apiToken: string | undefined;
  /** Build a typed client: `const users = createClient(UsersClient);` */
  createClient: <T extends BaseApiClient>(ClientClass: ApiClientClass<T>) => T;
}

export const apiFixture = base.extend<ApiFixtures>({
  apiToken: [
    async ({}, use) => {
      // Replace with a real token call when the API needs auth, e.g.
      // const ctx = await playwrightRequest.newContext({ baseURL: config.apiURL });
      // const res = await ctx.post('/auth/login', { data: accounts.standard });
      // await use((await res.json()).token);
      await use(process.env.API_TOKEN);
    },
    { scope: 'test' },
  ],

  apiContext: async ({ apiToken }, use) => {
    const context = await playwrightRequest.newContext({
      baseURL: config.apiURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
    });
    await use(context);
    await context.dispose();
  },

  createClient: async ({ apiContext, apiToken }, use) => {
    await use(
      <T extends BaseApiClient>(ClientClass: ApiClientClass<T>) =>
        new ClientClass(apiContext, apiToken),
    );
  },
});
