import { test as base } from '@playwright/test';
import { accounts, companyCode } from '../data/credentials';
import { buildUser, buildUsers } from '../data/factories/user.factory';

export interface DataFixtures {
  testData: {
    accounts: typeof accounts;
    companyCode: typeof companyCode;
    buildUser: typeof buildUser;
    buildUsers: typeof buildUsers;
  };
}

export const dataFixture = base.extend<DataFixtures>({
  testData: async ({}, use) => {
    await use({ accounts, companyCode, buildUser, buildUsers });
  },
});
