/**
 * Environment resolution, without knowing any environment.
 *
 * A project declares its own table — which names exist and what URLs they point
 * at is product knowledge, not framework knowledge. This module only decides
 * *how* a table is read: which variable selects an entry, how `.env` overrides
 * win, and what happens when the name is unknown.
 *
 *   export const environments = defineEnvironments({
 *     local: { baseURL: 'http://localhost:3000', … },
 *     beta:  { baseURL: 'https://beta.example.com', … },
 *   });
 *   export const config = environments.resolve();
 */
import { envNumber, envVar, loadDotEnv } from './env';

export interface EnvironmentConfig {
  /**
   * Base URL for UI navigation (page.goto('/path')).
   *
   * Optional: a project can leave the table without URLs and declare
   * `BASE_URL` in `.env` instead. One of the two must exist — `resolve()`
   * refuses to run against an unknown host.
   */
  baseURL?: string;
  /** Base URL for API calls (request.get('/endpoint')). Falls back to `baseURL`. */
  apiURL?: string;
  /** Default timeouts in milliseconds. */
  timeouts: {
    action: number;
    navigation: number;
    expect: number;
    test: number;
  };
}

export interface ResolvedEnvironment<Name extends string = string> extends EnvironmentConfig {
  /** Which entry of the table this run targets. */
  name: Name;
  /** Resolved and guaranteed — `resolve()` throws rather than return an empty URL. */
  baseURL: string;
  apiURL: string;
}

export interface EnvironmentsOptions<Name extends string> {
  /** Variable naming the target environment. Default: `TEST_ENV`. */
  variable?: string;
  /** Used when that variable is unset. Default: the first entry in the table. */
  fallback?: Name;
}

export interface EnvironmentResolver<Name extends string> {
  /** Every name the table declares — the allow-list `resolve()` validates against. */
  readonly names: readonly Name[];
  /** Read the environment for this run. Throws on an unknown name. */
  resolve(): ResolvedEnvironment<Name>;
}

/**
 * Turn a table of environments into a resolver.
 *
 * `.env` overrides beat the table, so a one-off run against a feature branch
 * (`BASE_URL=https://pr-42.example.com`) never needs a code change.
 */
export function defineEnvironments<Name extends string>(
  table: Record<Name, EnvironmentConfig>,
  // NoInfer: the names come from the table alone. Without it, `fallback: 'local'`
  // would narrow Name to 'local' and every other entry becomes a type error.
  options: EnvironmentsOptions<NoInfer<Name>> = {},
): EnvironmentResolver<Name> {
  const names = Object.keys(table) as Name[];
  if (names.length === 0) {
    throw new Error('defineEnvironments() needs at least one environment in the table.');
  }

  const variable = options.variable ?? 'TEST_ENV';
  const fallback = options.fallback ?? names[0];

  return {
    names,

    resolve(): ResolvedEnvironment<Name> {
      loadDotEnv();
      const name = envVar(variable, fallback) as Name;

      if (!names.includes(name)) {
        throw new Error(
          `Unknown ${variable} "${name}". Expected one of: ${names.join(', ')}.`,
        );
      }

      const base = table[name];
      const baseURL = envVar('BASE_URL', base.baseURL ?? '');
      if (!baseURL) {
        throw new Error(
          `No base URL for environment "${name}". Either set BASE_URL in .env, ` +
            `or give "${name}" a baseURL in the environment table.`,
        );
      }

      return {
        name,
        baseURL,
        // Most products serve their API from the same origin; say so once here
        // instead of repeating the host in every table entry.
        apiURL: envVar('API_URL', base.apiURL ?? baseURL),
        timeouts: {
          action: envNumber('ACTION_TIMEOUT', base.timeouts.action),
          navigation: envNumber('NAVIGATION_TIMEOUT', base.timeouts.navigation),
          expect: envNumber('EXPECT_TIMEOUT', base.timeouts.expect),
          test: envNumber('TEST_TIMEOUT', base.timeouts.test),
        },
      };
    },
  };
}
