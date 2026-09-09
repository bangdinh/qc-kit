import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { definePlaywrightConfig } from './define-config';
import type { ResolvedEnvironment } from './define-environments';

const env: ResolvedEnvironment = {
  name: 'test',
  baseURL: 'http://localhost',
  apiURL: 'http://localhost/api',
  timeouts: { action: 1, navigation: 1, expect: 1, test: 1 },
};

/** Cây spec tối thiểu, có file setup nên nhánh auth mặc định không kêu. */
function treeWithSetup(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-kit-cfg-'));
  fs.mkdirSync(path.join(root, 'setup'), { recursive: true });
  fs.writeFileSync(path.join(root, 'setup', 'auth.setup.ts'), '');
  return root;
}

function names(config: ReturnType<typeof definePlaywrightConfig>): string[] {
  return (config.projects ?? []).map((p) => p.name ?? '');
}

test('mặc định: setup + api + chromium + chromium-guest, không có unit', () => {
  const config = definePlaywrightConfig({ env, testDir: treeWithSetup() });
  expect(names(config)).toEqual(['setup', 'api', 'chromium', 'chromium-guest']);
});

test('web: false bỏ cả chromium lẫn chromium-guest', () => {
  const config = definePlaywrightConfig({
    env,
    testDir: treeWithSetup(),
    projects: { web: false },
  });
  expect(names(config)).not.toContain('chromium');
  expect(names(config)).not.toContain('chromium-guest');
});

test('kit tự chạy được ở chế độ chỉ unit', () => {
  const config = definePlaywrightConfig({
    env,
    projects: { unit: true, web: false, api: false, auth: false },
  });
  expect(names(config)).toEqual(['unit']);
});

test('auth: false thì chromium không gắn storageState và không phụ thuộc setup', () => {
  const config = definePlaywrightConfig({ env, projects: { auth: false } });
  const chromium = (config.projects ?? []).find((p) => p.name === 'chromium');
  expect(chromium?.dependencies).toBeUndefined();
  expect((chromium?.use as { storageState?: string } | undefined)?.storageState).toBeUndefined();
});

test('auth bật mà không có file setup thì báo ngay lúc đọc config', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-kit-cfg-'));
  expect(() => definePlaywrightConfig({ env, testDir: empty })).toThrow(/setup/i);
});
