import type { APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from '../../core/logger';
import { step } from '../../core/step';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  /** Set false to inspect a non-2xx response instead of throwing. */
  expectOk?: boolean;
}

/**
 * Thin wrapper over Playwright's APIRequestContext.
 *
 * Every endpoint-specific client (UsersClient, OrdersClient, ...) extends this
 * class, so retries, logging, auth headers and error formatting are written
 * once. Clients return parsed bodies; assertions stay in the tests.
 */
export abstract class BaseApiClient {
  /** Prefix for every call, e.g. "/users". Override in the subclass. */
  protected readonly basePath: string = '';

  constructor(
    protected readonly request: APIRequestContext,
    protected readonly token?: string,
  ) {}

  protected url(endpoint = ''): string {
    return `${this.basePath}${endpoint}`;
  }

  protected authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Accept: 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    };
  }

  protected async send(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    const { headers, params, data, expectOk = true } = options;
    const target = this.url(endpoint);

    return step(`API ${method.toUpperCase()} ${target}`, async () => {
      logger.debug(`API ${method.toUpperCase()} ${target}`, params ?? '');
      const response = await this.request[method](target, {
        headers: this.authHeaders(headers),
        params,
        data: data as never,
      });

      if (expectOk && !response.ok()) {
        throw new Error(
          `API ${method.toUpperCase()} ${target} failed: ${response.status()} ${response.statusText()}\n` +
            (await response.text()),
        );
      }
      return response;
    });
  }

  /** Send and parse the JSON body in one step. */
  protected async json<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    options?: RequestOptions,
  ): Promise<T> {
    const response = await this.send(method, endpoint, options);
    return (await response.json()) as T;
  }
}
