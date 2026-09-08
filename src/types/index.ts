/** Shared types used across layers. App-specific API shapes go in src/api/models. */

export interface Credentials {
  username: string;
  password: string;
}

export type UserRole = 'admin' | 'user' | 'guest';

export interface TestUser extends Credentials {
  id?: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/** Anything a factory can build with partial overrides. */
export type Overrides<T> = Partial<T>;
