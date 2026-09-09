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
const { execSync } = require('node:child_process');

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

  const opts = { name: '', out: '', auth: false, api: false, local: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--auth') opts.auth = true;
    else if (arg === '--api') opts.api = true;
    else if (arg === '--local') opts.local = true;
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

  npx qc-kit new <ten-du-an> [--out <thu-muc>] [--auth] [--api] [--local]

  <ten-du-an>   kebab-case; trở thành tên package npm
  --out         thư mục đích (mặc định: chính tên dự án)
  --auth        sinh luồng đăng nhập: setup project, credentials, LoginPage
  --api         sinh client API và spec API mẫu
  --local       đóng gói kit này thành tarball và khai "file:" trỏ vào đó.
                Bắt buộc khi kit CHƯA publish, nếu không npm install trả 404.

Ví dụ:
  npx qc-kit new kho-hang --auth --local
  npx qc-kit new bo-test-api --out ../bo-test-api --api --local
`);
}

/**
 * Đóng gói kit thành tarball và trả về đường dẫn.
 *
 * Phải là tarball chứ KHÔNG phải `file:` trỏ vào thư mục kit: npm symlink cả thư mục,
 * kéo theo `node_modules` của kit, và dự án nạp `@playwright/test` hai lần —
 * "Requiring @playwright/test second time", không test nào chạy được.
 */
function packKit(root) {
  // execSync với một chuỗi lệnh: `npm` trên Windows là npm.cmd nên cần shell, mà
  // execFileSync + shell:true thì Node cảnh báo DEP0190. Không có tham số nào từ người
  // dùng ghép vào chuỗi này.
  const out = execSync('npm pack --silent', { cwd: root, encoding: 'utf-8' });
  const file = out.trim().split(/\r?\n/).filter(Boolean).pop();
  if (!file) throw new Error('npm pack không in ra tên tarball.');
  return path.join(root, file);
}

function variables(opts, dependency, pwRange) {
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
    QC_KIT_VERSION: dependency,
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

  // Chưa publish thì `^0.1.0` không phân giải được và npm trả 404 — `--local` đóng gói
  // kit tại chỗ. Bỏ nhánh này đi khi kit đã lên registry.
  let dependency = `^${kitPkg.version}`;
  if (opts.local) {
    try {
      dependency = `file:${packKit(ROOT).replace(/\\/g, '/')}`;
    } catch (e) {
      console.error(`Không đóng gói được kit: ${e.message}`);
      process.exit(1);
    }
  }

  const vars = variables(opts, dependency, pwRange);

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
${
  opts.local
    ? `\nqc-kit lấy từ tarball đã đóng gói. Sửa kit rồi thì đóng lại và cài lại:\n` +
      `  cd ${ROOT} && npm pack && cd - && npm install\n`
    : '\nqc-kit CHƯA publish lên registry: npm install sẽ trả 404.\n' +
      'Sinh lại kèm --local (make new … LOCAL=1) để lấy kit từ tarball tại chỗ.\n'
}${opts.auth ? '\nThay locator trong src/pages/LoginPage.ts bằng locator THẬT lấy từ DOM (npm run codegen).\n' : ''}`);
}

main();
