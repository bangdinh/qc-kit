export interface ScaffoldOptions {
  /** Project name; becomes the npm package name, so it must be valid as one. */
  name: string;
  /** Generate the sign-in setup project, credentials and authenticator. */
  auth: boolean;
  /** Generate an example API client and an API spec. */
  api: boolean;
}

export interface PlannedFile {
  /** File under `cmd/scaffold/templates`, without the `.tmpl` suffix. */
  template: string;
  /** Path inside the generated project. */
  dest: string;
  /**
   * Copy byte-for-byte instead of rendering. For files that are not templates —
   * a shell script whose `${VAR}` and `__X__` are its own, not the generator's.
   */
  raw?: boolean;
}

/** npm package names: lowercase, digits, dashes; must start with a letter. */
const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function assertProjectName(name: string): void {
  if (!NAME.test(name)) {
    throw new Error(
      `Tên dự án "${name}" không hợp lệ. Dùng kebab-case chữ thường ` +
        '(vd "kho-hang", "bo-test-web") — tên này trở thành tên package npm.',
    );
  }
}

/**
 * Asset dùng chung — nguồn chân lý ở kit, dự án nhận bản sao và **không sửa tại chỗ**.
 *
 * `qc-kit sync` ghi đè đúng tập này khi nâng version kit. Đó là cách thay cho việc copy
 * tay N bản `jira.sh` giữa các repo: sửa ở kit, cắt tag, mỗi dự án `sync` một phát.
 *
 * Cố tình KHÔNG gồm thứ dự án sở hữu (`package.json`, `src/`, `tests/`, `README.md`,
 * `CLAUDE.md`) — ghi đè chúng là xoá công của người dùng.
 */
const MANAGED: PlannedFile[] = [
  { template: 'claude/skills/gen-script/SKILL.md', dest: '.claude/skills/gen-script/SKILL.md' },
  {
    template: 'claude/skills/testcase-standard/SKILL.md',
    dest: '.claude/skills/testcase-standard/SKILL.md',
  },
  { template: 'claude/skills/jira/SKILL.md', dest: '.claude/skills/jira/SKILL.md' },
  { template: 'claude/skills/jira/jira.sh', dest: '.claude/skills/jira/jira.sh', raw: true },
  { template: 'jira.env.example', dest: '.jira.env.example', raw: true },
  /**
   * Bản mẫu cho `docs/test-structure.md` — file mà `gen-script` đọc để biết dự án chia
   * thư mục page object và spec kiểu gì.
   *
   * Cùng khuôn với `.jira.env.example`: kit phát hành bản `.example`, dự án copy sang tên
   * thật rồi tự điền. `sync` refresh bản mẫu mà không đụng nội dung dự án đã viết.
   */
  { template: 'docs/test-structure.example.md', dest: 'docs/test-structure.example.md' },
  /**
   * Bản mẫu cho `docs/test-data.md` — file thứ hai mà `gen-script` đọc trước khi sinh.
   *
   * `test-structure` trả lời "thư mục chia thế nào", `test-data` trả lời "có sẵn trạng
   * thái dữ liệu nào". Cả hai đều là tri thức của dự án, và cả hai đều là thứ generator
   * sẽ ĐOÁN nếu không ai khai — đoán tên biến `.env` cho một tài khoản chưa ai cấp là
   * cách nhanh nhất để có một bộ test trông chạy được mà không chạy được.
   */
  { template: 'docs/test-data.example.md', dest: 'docs/test-data.example.md' },
];

/** Tập file mà `qc-kit sync` được phép ghi đè trong một dự án đã tồn tại. */
export function managedAssets(): PlannedFile[] {
  return MANAGED.map((f) => ({ ...f }));
}

const ALWAYS: PlannedFile[] = [
  { template: 'package.json', dest: 'package.json' },
  { template: 'CLAUDE.md', dest: 'CLAUDE.md' },
  { template: 'tsconfig.json', dest: 'tsconfig.json' },
  { template: 'playwright.config.ts', dest: 'playwright.config.ts' },
  { template: 'env.example', dest: '.env.example' },
  { template: 'gitignore', dest: '.gitignore' },
  { template: 'README.md', dest: 'README.md' },
  { template: 'src/env.ts', dest: 'src/env.ts' },
  { template: 'src/fixtures.ts', dest: 'src/fixtures.ts' },
  { template: 'src/pages/ExamplePage.ts', dest: 'src/pages/ExamplePage.ts' },
  { template: 'tests/ui/example.spec.ts', dest: 'tests/ui/example.spec.ts' },
];

/**
 * Luồng đăng nhập của dự án tiêu thụ — TOÀN BỘ, kể cả phần lõi.
 *
 * qc-kit không export gì về đăng nhập (xem ADR 0004): màn đăng nhập trông ra sao, session
 * cache ở đâu, cookie dùng lại bao lâu đều là chính sách của một bộ test, và một kit dùng
 * chung cho web · mobile · backend không có câu trả lời đúng cho cả ba. Nên `--auth` sinh
 * ra bản của chính dự án ở `src/core/` — dự án sở hữu nó, sửa được, và `sync` không đụng.
 */
const WITH_AUTH: PlannedFile[] = [
  { template: 'auth/core/auth.ts', dest: 'src/core/auth.ts' },
  { template: 'auth/core/session.ts', dest: 'src/core/session.ts' },
  { template: 'auth/core/paths.ts', dest: 'src/core/paths.ts' },
  { template: 'auth/core/index.ts', dest: 'src/core/index.ts' },
  { template: 'auth/credentials.ts', dest: 'src/data/credentials.ts' },
  { template: 'auth/authenticators.ts', dest: 'src/data/authenticators.ts' },
  { template: 'auth/LoginPage.ts', dest: 'src/pages/LoginPage.ts' },
  { template: 'auth/auth.setup.ts', dest: 'tests/setup/auth.setup.ts' },
];

/**
 * Tầng API của dự án tiêu thụ — phân tầng Model · Helper · Verification.
 *
 * Mỗi thư mục trả lời một câu hỏi khác nhau, và đó là lý do chúng tách rời:
 *
 *   models/         dữ liệu có HÌNH DẠNG gì
 *   helpers/        dựng request ra sao, đọc response ra sao
 *   verifications/  thế nào là ĐÚNG — assert của tài nguyên, tách khỏi spec
 *   clients/        gọi endpoint nào (tầng thực thi HTTP)
 *   tests/api/      kịch bản nghiệp vụ
 *
 * Đường hạnh phúc và đường lỗi nằm ở hai spec khác nhau: chúng hỏng vì những lý do khác
 * nhau và người ta chạy chúng ở những thời điểm khác nhau.
 */
const WITH_API: PlannedFile[] = [
  { template: 'api/clients/ExampleClient.ts', dest: 'src/api/clients/ExampleClient.ts' },
  { template: 'api/clients/index.ts', dest: 'src/api/clients/index.ts' },
  { template: 'api/models/example.model.ts', dest: 'src/api/models/example.model.ts' },
  { template: 'api/models/index.ts', dest: 'src/api/models/index.ts' },
  {
    template: 'api/helpers/ExampleRequestHelper.ts',
    dest: 'src/api/helpers/ExampleRequestHelper.ts',
  },
  {
    template: 'api/helpers/ExampleResponseHelper.ts',
    dest: 'src/api/helpers/ExampleResponseHelper.ts',
  },
  { template: 'api/helpers/index.ts', dest: 'src/api/helpers/index.ts' },
  {
    template: 'api/verifications/ExampleVerification.ts',
    dest: 'src/api/verifications/ExampleVerification.ts',
  },
  { template: 'api/verifications/index.ts', dest: 'src/api/verifications/index.ts' },
  { template: 'api/tests/example.spec.ts', dest: 'tests/api/example.spec.ts' },
  { template: 'api/tests/example.negative.spec.ts', dest: 'tests/api/example.negative.spec.ts' },
];

/** Which template files a given set of options produces. */
export function plan(options: ScaffoldOptions): PlannedFile[] {
  assertProjectName(options.name);
  return [
    ...ALWAYS,
    ...MANAGED,
    ...(options.auth ? WITH_AUTH : []),
    ...(options.api ? WITH_API : []),
  ];
}
