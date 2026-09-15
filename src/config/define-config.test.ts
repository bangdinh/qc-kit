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

/**
 * Session của dự án. Cố tình không phải đường dẫn mặc định cũ của kit: kit không còn mặc
 * định nào, nên test cũng không được ngầm dựa vào đường dẫn cũ.
 */
const STORAGE_STATE = '.sessions/user.json';

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

function useOf(
  config: ReturnType<typeof definePlaywrightConfig>,
  name: string,
): { storageState?: string } | undefined {
  return (config.projects ?? []).find((p) => p.name === name)?.use as
    | { storageState?: string }
    | undefined;
}

test('mặc định: setup + api + chromium + chromium-guest, không có unit', () => {
  const config = definePlaywrightConfig({
    env,
    testDir: treeWithSetup(),
    storageState: STORAGE_STATE,
  });
  expect(names(config)).toEqual(['setup', 'api', 'chromium', 'chromium-guest']);
});

test('web: false bỏ cả chromium lẫn chromium-guest', () => {
  const config = definePlaywrightConfig({
    env,
    testDir: treeWithSetup(),
    storageState: STORAGE_STATE,
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
  expect(useOf(config, 'chromium')?.storageState).toBeUndefined();
});

test('auth bật mà không có file setup thì báo ngay lúc đọc config', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-kit-cfg-'));
  expect(() =>
    definePlaywrightConfig({ env, testDir: empty, storageState: STORAGE_STATE }),
  ).toThrow(/setup/i);
});

/*
 * Từ v0.3.0 kit không còn sở hữu phần đăng nhập: không `STORAGE_STATE` mặc định, không
 * đường dẫn session mặc định nào. Preset vẫn dựng bố cục project — nhưng đường dẫn là tri
 * thức của dự án và phải được truyền vào.
 */
test('auth bật mà không truyền storageState thì báo ngay, nêu đúng option còn thiếu', () => {
  expect(() => definePlaywrightConfig({ env, testDir: treeWithSetup() })).toThrow(
    /storageState/,
  );
});

test('storageState truyền vào chỉ gắn cho chromium, không gắn cho chromium-guest', () => {
  const config = definePlaywrightConfig({
    env,
    testDir: treeWithSetup(),
    storageState: STORAGE_STATE,
  });
  expect(useOf(config, 'chromium')?.storageState).toBe(STORAGE_STATE);
  expect(useOf(config, 'chromium-guest')?.storageState).toBeUndefined();
  expect((config.projects ?? []).find((p) => p.name === 'chromium')?.dependencies).toEqual([
    'setup',
  ]);
});
