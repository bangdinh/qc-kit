import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hasSetupFile } from './find-setup';

function tmpTree(files: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-kit-setup-'));
  for (const file of files) {
    const full = path.join(root, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, '');
  }
  return root;
}

const SETUP = /.*\.setup\.ts/;

test('tìm thấy file setup nằm sâu trong cây thư mục', () => {
  const root = tmpTree(['setup/auth.setup.ts', 'ui/Login.spec.ts']);
  expect(hasSetupFile(root, SETUP)).toBe(true);
});

test('không có file setup thì trả false', () => {
  const root = tmpTree(['ui/Login.spec.ts', 'api/users.spec.ts']);
  expect(hasSetupFile(root, SETUP)).toBe(false);
});

test('thư mục không tồn tại thì trả false, không ném lỗi', () => {
  expect(hasSetupFile(path.join(os.tmpdir(), 'khong-ton-tai-qc-kit'), SETUP)).toBe(false);
});

test('bỏ qua node_modules — file setup của thư viện khác không tính', () => {
  const root = tmpTree(['node_modules/ai-do/x.setup.ts', 'ui/Login.spec.ts']);
  expect(hasSetupFile(root, SETUP)).toBe(false);
});

test('khớp theo đường dẫn tương đối, không phải đường dẫn tuyệt đối', () => {
  // Thư mục tạm của macOS nằm dưới /var/folders/... — nếu khớp trên đường dẫn tuyệt
  // đối thì một pattern như /setup/ có thể trúng nhầm phần thư mục hệ thống.
  const root = tmpTree(['ui/Login.spec.ts']);
  expect(hasSetupFile(root, /folders/)).toBe(false);
});
