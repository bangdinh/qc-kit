import { expect, test } from '@playwright/test';
import { assertProjectName, managedAssets, plan } from './plan';

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

test('--api dựng đủ tầng cho một bộ test API', () => {
  const dests = plan({ ...base, api: true }).map((f) => f.dest);
  for (const need of [
    // client theo tài nguyên, không phải một file phẳng
    'src/api/clients/ExampleClient.ts',
    'src/api/clients/index.ts',
    // Model: kiểu request/response của tài nguyên
    'src/api/models/example.model.ts',
    'src/api/models/index.ts',
    // Helper: dựng request, đọc response
    'src/api/helpers/ExampleRequestHelper.ts',
    'src/api/helpers/ExampleResponseHelper.ts',
    'src/api/helpers/index.ts',
    // Verification: assert của tài nguyên, tách khỏi spec
    'src/api/verifications/ExampleVerification.ts',
    'src/api/verifications/index.ts',
    // đường hạnh phúc và đường lỗi là hai spec khác nhau
    'tests/api/example.spec.ts',
    'tests/api/example.negative.spec.ts',
  ]) {
    expect(dests, `thiếu ${need}`).toContain(need);
  }
});

test('không --api thì không sinh tầng API nào', () => {
  const dests = plan(base).map((f) => f.dest);
  expect(dests.some((d) => d.startsWith('src/api/'))).toBe(false);
  expect(dests.some((d) => d.startsWith('tests/api/'))).toBe(false);
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

test.describe('skill nạp vào dự án', () => {
  test('dự án nào cũng có CLAUDE.md và bộ skill', () => {
    const dests = plan(base).map((f) => f.dest);
    for (const need of [
      'CLAUDE.md',
      '.claude/skills/qc-flow/SKILL.md',
      '.claude/skills/testcase-standard/SKILL.md',
      '.claude/skills/testcase-to-spec/SKILL.md',
      '.claude/skills/jira/SKILL.md',
      '.claude/skills/jira/jira.sh',
    ]) {
      expect(dests, `thiếu ${need}`).toContain(need);
    }
  });

  test('jira.sh copy nguyên văn, không qua render', () => {
    const sh = plan(base).find((f) => f.dest === '.claude/skills/jira/jira.sh');
    expect(sh?.raw).toBe(true);
  });
});

test.describe('managedAssets — thứ `sync` được phép ghi đè', () => {
  test('là tập con của plan', () => {
    const dests = new Set(plan({ name: 'x', auth: true, api: true }).map((f) => f.dest));
    for (const asset of managedAssets()) {
      expect(dests, `${asset.dest} không có trong plan`).toContain(asset.dest);
    }
  });

  test('KHÔNG đụng file do dự án sở hữu', () => {
    const dests = managedAssets().map((f) => f.dest);
    for (const owned of [
      'package.json',
      'README.md',
      'CLAUDE.md',
      '.env.example',
      'src/env.ts',
      'src/fixtures.ts',
      'src/pages/ExamplePage.ts',
      'tests/ui/example.spec.ts',
    ]) {
      expect(dests, `sync đang ghi đè ${owned} — đó là file của dự án`).not.toContain(owned);
    }
  });

  test('gồm đúng bộ skill', () => {
    const dests = managedAssets().map((f) => f.dest);
    expect(dests).toEqual([
      '.claude/skills/qc-flow/SKILL.md',
      '.claude/skills/testcase-standard/SKILL.md',
      '.claude/skills/testcase-to-spec/SKILL.md',
      '.claude/skills/jira/SKILL.md',
      '.claude/skills/jira/jira.sh',
      '.jira.env.example',
    ]);
  });
});

test('.jira.env.example copy nguyên văn — nó là file cấu hình, không phải template', () => {
  const f = plan(base).find((x) => x.dest === '.jira.env.example');
  expect(f?.raw).toBe(true);
});
