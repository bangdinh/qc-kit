/**
 * Register API clients here so the `api` fixture can hand them to tests.
 *
 * Example:
 *   export class UsersClient extends BaseApiClient {
 *     protected readonly basePath = '/users';
 *     getById = (id: string) => this.json<User>('get', `/${id}`);
 *     create = (payload: NewUser) => this.json<User>('post', '', { data: payload });
 *   }
 */
export * from './base.client';
