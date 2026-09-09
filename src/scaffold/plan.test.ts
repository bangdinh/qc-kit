import { expect, test } from '@playwright/test';
import { assertProjectName, plan } from './plan';

const base = { name: 'kho-hang', auth: false, api: false };

test('dự án tối thiểu có đủ file để chạy được ngay', () => {
  const dests = plan(base).map((f) => f.dest);
  for (const need of [
    'package.json',
    'tsconfig.json',
    'playwright.config.ts',
    '.env.example',
    '.gitignore',
    'README.md',
    'src/env.ts',
    'src/fixtures.ts',
    'src/pages/ExamplePage.ts',
    'tests/ui/example.spec.ts',
  ]) {
    expect(dests, `thiếu ${need}`).toContain(need);
  }
});

test('không --auth thì không sinh file setup lẫn credentials', () => {
  const dests = plan(base).map((f) => f.dest);
  expect(dests).not.toContain('tests/setup/auth.setup.ts');
  expect(dests.some((d) => d.startsWith('src/data/'))).toBe(false);
});

test('--auth thêm setup, credentials và authenticator', () => {
  const dests = plan({ ...base, auth: true }).map((f) => f.dest);
  expect(dests).toContain('tests/setup/auth.setup.ts');
  expect(dests).toContain('src/data/credentials.ts');
  expect(dests).toContain('src/data/authenticators.ts');
});

test('--api thêm client và spec API', () => {
  const dests = plan({ ...base, api: true }).map((f) => f.dest);
  expect(dests).toContain('src/api/ExampleClient.ts');
  expect(dests).toContain('tests/api/example.spec.ts');
});

test('không có đích trùng nhau', () => {
  const dests = plan({ name: 'x', auth: true, api: true }).map((f) => f.dest);
  expect(new Set(dests).size).toBe(dests.length);
});

test.describe('assertProjectName', () => {
  test('nhận kebab-case', () => {
    expect(() => assertProjectName('kho-hang-v2')).not.toThrow();
  });

  test('từ chối chữ hoa, khoảng trắng, rỗng — tên này thành tên package npm', () => {
    for (const bad of ['Kho Hang', 'KhoHang', '', '  ', 'kho_hang', '-kho']) {
      expect(() => assertProjectName(bad), `đáng lẽ phải chặn "${bad}"`).toThrow();
    }
  });
});
