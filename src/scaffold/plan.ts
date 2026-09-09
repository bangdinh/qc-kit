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
  { template: 'claude/skills/qc-flow/SKILL.md', dest: '.claude/skills/qc-flow/SKILL.md' },
  {
    template: 'claude/skills/testcase-standard/SKILL.md',
    dest: '.claude/skills/testcase-standard/SKILL.md',
  },
  { template: 'claude/skills/jira/SKILL.md', dest: '.claude/skills/jira/SKILL.md' },
  { template: 'claude/skills/jira/jira.sh', dest: '.claude/skills/jira/jira.sh', raw: true },
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

const WITH_AUTH: PlannedFile[] = [
  { template: 'auth/credentials.ts', dest: 'src/data/credentials.ts' },
  { template: 'auth/authenticators.ts', dest: 'src/data/authenticators.ts' },
  { template: 'auth/LoginPage.ts', dest: 'src/pages/LoginPage.ts' },
  { template: 'auth/auth.setup.ts', dest: 'tests/setup/auth.setup.ts' },
];

const WITH_API: PlannedFile[] = [
  { template: 'api/ExampleClient.ts', dest: 'src/api/ExampleClient.ts' },
  { template: 'api/example.spec.ts', dest: 'tests/api/example.spec.ts' },
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
