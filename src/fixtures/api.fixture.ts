import {
  test as base,
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';
import type { BaseApiClient } from '../api/clients/base.client';

export type ApiClientClass<T extends BaseApiClient> = new (
  request: APIRequestContext,
  token?: string,
) => T;

export interface ApiFixtures {
  /** Request context pointed at the API base URL, independent of the browser session. */
  apiContext: APIRequestContext;
  /** Bearer token shared by API clients. */
  apiToken: string | undefined;
  /** Build a typed client: `const users = createClient(UsersClient);` */
  createClient: <T extends BaseApiClient>(ClientClass: ApiClientClass<T>) => T;
}

export interface ApiFixtureOptions {
  /** Base URL for every call. Comes from the project's environment table. */
  apiURL: string;
  /**
   * How to obtain the bearer token. Runs per test, so a project that logs in for a
   * token can do it here. Defaults to `API_TOKEN` from the environment.
   */
  token?: () => Promise<string | undefined> | string | undefined;
  /** Headers added to every request, e.g. a tenant id. */
  extraHeaders?: Record<string, string>;
}

/**
 * Build the API fixtures for a project.
 *
 * A factory, not a ready-made fixture: the kit does not know any product's `apiURL`, and
 * importing one would make every consumer inherit somebody else's environment table.
 */
export function createApiFixture(options: ApiFixtureOptions) {
  const resolveToken = options.token ?? (() => process.env.API_TOKEN || undefined);

  return base.extend<ApiFixtures>({
    apiToken: async ({}, use) => {
      await use(await resolveToken());
    },

    apiContext: async ({ apiToken }, use) => {
      const context = await playwrightRequest.newContext({
        baseURL: options.apiURL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          ...(options.extraHeaders ?? {}),
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
}
