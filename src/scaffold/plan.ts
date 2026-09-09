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

const ALWAYS: PlannedFile[] = [
  { template: 'package.json', dest: 'package.json' },
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

const WITH_AUTH: PlannedFile[] = [
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
    ...(options.auth ? WITH_AUTH : []),
    ...(options.api ? WITH_API : []),
  ];
}
