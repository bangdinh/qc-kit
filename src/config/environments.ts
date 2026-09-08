/**
 * Per-environment settings. Anything that differs between local / dev /
 * staging / prod belongs here; secrets belong in .env, never in this file.
 */
import { currentEnv, envNumber, envVar, type EnvName } from './env';

export interface EnvironmentConfig {
  /** Base URL for UI navigation (page.goto('/path')). */
  baseURL: string;
  /** Base URL for API calls (request.get('/endpoint')). */
  apiURL: string;
  /** Default timeouts in milliseconds. */
  timeouts: {
    action: number;
    navigation: number;
    expect: number;
    test: number;
  };
}

const environments: Record<EnvName, EnvironmentConfig> = {
  local: {
    baseURL: 'http://localhost:3000',
    apiURL: 'http://localhost:3000/api',
    timeouts: { action: 15_000, navigation: 30_000, expect: 10_000, test: 60_000 },
  },
  dev: {
    baseURL: 'https://dev.example.com',
    apiURL: 'https://dev.example.com/api',
    timeouts: { action: 15_000, navigation: 30_000, expect: 10_000, test: 60_000 },
  },
  staging: {
    baseURL: 'https://staging.example.com',
    apiURL: 'https://staging.example.com/api',
    timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 },
  },
  prod: {
    baseURL: 'https://www.example.com',
    apiURL: 'https://www.example.com/api',
    timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 },
  },
};

/**
 * Resolved config for this run. .env overrides win over the table above so a
 * one-off run against a feature branch never needs a code change.
 */
export function getConfig(): EnvironmentConfig {
  const env = currentEnv();
  const base = environments[env];

  return {
    baseURL: envVar('BASE_URL', base.baseURL),
    apiURL: envVar('API_URL', base.apiURL),
    timeouts: {
      action: envNumber('ACTION_TIMEOUT', base.timeouts.action),
      navigation: envNumber('NAVIGATION_TIMEOUT', base.timeouts.navigation),
      expect: envNumber('EXPECT_TIMEOUT', base.timeouts.expect),
      test: envNumber('TEST_TIMEOUT', base.timeouts.test),
    },
  };
}

export const config = getConfig();
