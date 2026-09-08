import type { Overrides, TestUser } from '../../types';
import { randomEmail, randomString, unique } from '../../utils/random.util';

/**
 * Factories build valid-by-default objects and let a test override only the
 * field it cares about:
 *
 *   const admin = buildUser({ role: 'admin' });
 */
export function buildUser(overrides: Overrides<TestUser> = {}): TestUser {
  const name = unique('qa-user');
  return {
    username: name,
    password: `Pw!${randomString(10)}`,
    email: randomEmail(),
    fullName: `QA ${name}`,
    role: 'user',
    ...overrides,
  };
}

export function buildUsers(count: number, overrides: Overrides<TestUser> = {}): TestUser[] {
  return Array.from({ length: count }, () => buildUser(overrides));
}
