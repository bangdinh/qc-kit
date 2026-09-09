#!/usr/bin/env node
/**
 * Sinh một dự án automation mới từ qc-kit.
 *
 *   npx qc-kit new kho-hang --out ../kho-hang --auth --api
 *
 * Phần thuần (chọn file, điền template) nằm ở `src/scaffold` và có test; file này chỉ là
 * lớp vỏ: đọc tham số, đọc template, ghi đĩa.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATES = path.join(__dirname, 'templates');

function loadCore() {
  try {
    return {
      plan: require(path.join(ROOT, 'dist', 'scaffold', 'plan.js')),
      render: require(path.join(ROOT, 'dist', 'scaffold', 'render.js')),
    };
  } catch {
    console.error(
      'Không nạp được dist/scaffold. Trong repo qc-kit thì chạy `npm run build` trước.',
    );
    process.exit(1);
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== 'new') return null;

  const opts = { name: '', out: '', auth: false, api: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--auth') opts.auth = true;
    else if (arg === '--api') opts.api = true;
    else if (arg === '--out') opts.out = rest[++i] ?? '';
    else if (arg.startsWith('--')) {
      console.error(`Tham số lạ: ${arg}`);
      process.exit(1);
    } else if (!opts.name) opts.name = arg;
  }
  if (!opts.name) return null;
  if (!opts.out) opts.out = opts.name;
  return opts;
}

function usage() {
  console.log(`
qc-kit — sinh dự án automation mới

  npx qc-kit new <ten-du-an> [--out <thu-muc>] [--auth] [--api]

  <ten-du-an>   kebab-case; trở thành tên package npm
  --out         thư mục đích (mặc định: chính tên dự án)
  --auth        sinh luồng đăng nhập: setup project, credentials, LoginPage
  --api         sinh client API và spec API mẫu

Ví dụ:
  npx qc-kit new kho-hang --auth
  npx qc-kit new bo-test-api --out ../bo-test-api --api
`);
}

function variables(opts, kitVersion, pwRange) {
  const authImports = opts.auth
    ? "import { createAuthFixture } from 'qc-kit/core';\n" +
      "import { standardUser } from './data/authenticators';\n"
    : '';
  const authFixture = opts.auth
    ? '  createAuthFixture(standardUser, { baseURL: config.baseURL }),\n'
    : '';
  const authEnv = opts.auth
    ? '# Tài khoản test (phải có sẵn trong môi trường đích)\n' +
      'USER_USERNAME=\nUSER_PASSWORD=\nADMIN_USERNAME=\nADMIN_PASSWORD=\n\n' +
      '# Session đã cache được dùng lại bao lâu trước khi đăng nhập lại\n' +
      'SESSION_TTL_MINUTES=30\n'
    : '';

  return {
    NAME: opts.name,
    QC_KIT_VERSION: `^${kitVersion}`,
    PW_RANGE: pwRange,
    AUTH: String(opts.auth),
    API: String(opts.api),
    AUTH_IMPORTS: authImports,
    AUTH_FIXTURE: authFixture,
    AUTH_ENV: authEnv,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) {
    usage();
    process.exit(process.argv.length > 2 ? 1 : 0);
  }

  const core = loadCore();
  const kitPkg = require(path.join(ROOT, 'package.json'));
  const pwRange = (kitPkg.peerDependencies || {})['@playwright/test'] || '^1.55.0';

  let files;
  try {
    files = core.plan.plan(opts);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const dest = path.resolve(opts.out);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
    console.error(`Thư mục "${dest}" đã có nội dung. Chọn --out khác, hoặc dọn nó trước.`);
    process.exit(1);
  }

  const vars = variables(opts, kitPkg.version, pwRange);

  for (const file of files) {
    const source = path.join(TEMPLATES, `${file.template}.tmpl`);
    if (!fs.existsSync(source)) {
      console.error(`Thiếu template: ${source}`);
      process.exit(1);
    }
    const out = path.join(dest, file.dest);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, core.render.render(fs.readFileSync(source, 'utf-8'), vars));
  }

  console.log(`
✓ Đã sinh ${files.length} file vào ${dest}

  cd ${opts.out}
  npm install
  npm run install:browsers
  cp .env.example .env        # điền URL${opts.auth ? ' và tài khoản' : ''}
  npm run typecheck
  npx playwright test
${opts.auth ? '\nThay locator trong src/pages/LoginPage.ts bằng locator THẬT lấy từ DOM (npm run codegen).\n' : ''}`);
}

main();
