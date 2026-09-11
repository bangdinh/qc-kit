# qc-kit

[![Latest Release](https://img.shields.io/badge/release-v0.2.0-blue)](https://github.com/bangdinh/qc-kit/tags)
[![Node](https://img.shields.io/badge/node-20+-339933)](package.json)
[![Playwright](https://img.shields.io/badge/playwright-peer%20optional-2EAD33)](package.json)

Bộ kit QC **dùng chung** cho automation web · mobile · backend — mỗi dự án kế thừa thay
vì copy khung. Xây trên [Playwright](https://playwright.dev) + TypeScript, mô hình Page
Object kết hợp custom fixtures.

Kit **không chứa test của sản phẩm nào**. Nó chứa cơ chế: cấu hình, session, step vào
report, base class, hợp đồng test case, và một generator dựng dự án mới.

> **Lần đầu vào repo?** Đọc [ONBOARDING.md](ONBOARDING.md) trước — 5 phút, đủ hiểu qc-kit
> đứng ở đâu giữa `platform-qc-agent`, `web-first-automation` và Dify.
> [STRUCTURE.md](STRUCTURE.md) nói **vì sao code có hình dạng đó**;
> [docs/adr/](docs/adr/) ghi các quyết định khó lùi.

---

## 1. Dựng một dự án automation mới

```bash
npx qc-kit new kho-hang --auth        # thêm --api nếu có suite API
cd kho-hang
npm install
npm run install:browsers
cp .env.example .env                  # điền URL và tài khoản
npx playwright test
```

Đứng trong repo kit thì dùng `make`:

```bash
make new NAME=kho-hang OUT=../kho-hang AUTH=1 API=1
```

Không có `--auth` thì dự án sinh ra **chạy được ngay**, không cần tài khoản nào.

Sinh ra: `package.json`, `tsconfig.json`, `playwright.config.ts` (một lời gọi preset),
`.env.example`, `src/env.ts` (bảng môi trường của bạn), `src/fixtures.ts` (đã compose
sẵn), một page object mẫu, một spec mẫu, `README.md`, `CLAUDE.md`, và **ba skill** trong
`.claude/skills/`. Thêm `--auth` thì có `LoginPage`, `credentials`, `authenticators` và
`tests/setup/auth.setup.ts`.

| Skill nạp vào dự án | Trả lời |
|---|---|
| `gen-script` | Sinh test script: JSON test case → draft → locator thật → chạy verify |
| `testcase-standard` | Một test case phải trông thế nào; `source` và cổng duyệt |
| `jira` | Ghi việc lên Jira; phân biệt bug sản phẩm với lỗi của bộ test |

Chúng **do kit phát hành**, không phải của dự án — sửa tại chỗ sẽ mất ở lần `sync` sau.

### Dựng tay

```bash
npm i qc-kit @playwright/test
```

```ts
// src/env.ts — bảng môi trường của DỰ ÁN BẠN. Kit không biết URL nào.
import { defineEnvironments } from 'qc-kit/config';
export const config = defineEnvironments({
  beta: {
    baseURL: 'https://beta.example.com',
    timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 },
  },
}).resolve();

// playwright.config.ts
import { definePlaywrightConfig } from 'qc-kit/config';
import { config } from './src/env';
export default definePlaywrightConfig({ env: config });

// src/fixtures.ts — dự án tự compose. Kit cố tình KHÔNG export sẵn một `test`.
import { mergeTests, expect } from '@playwright/test';
import { createApiFixture, createDataFixture, logFixture, pagesFixture } from 'qc-kit/fixtures';
import { config } from './env';

export const test = mergeTests(
  pagesFixture,
  createApiFixture({ apiURL: config.apiURL }),
  createDataFixture({ accounts }),
  logFixture,
);
export { expect };
```

Kit không export sẵn một `test` đã compose vì làm vậy nó phải nêu tên bảng môi trường,
tài khoản và page object của một sản phẩm — và mọi dự án cài về đều thừa kế sản phẩm của
người khác.

### Pin version, và nâng cấp

Dự án client **pin đúng một version** — mô hình của `b2b-gokit`. Sửa gì ở kit thì client
chỉ cần đổi số version, không phải copy lại gì.

```jsonc
// package.json của dự án client — kit CHƯA publish lên registry nên pin theo tag git
"devDependencies": {
  "qc-kit": "github:bangdinh/qc-kit#v0.2.0"
}
```

Nâng cấp:

```bash
npm i "github:bangdinh/qc-kit#<tag-mới>"  # xem tag: github.com/bangdinh/qc-kit/tags
npx qc-kit sync                            # refresh .claude/skills theo bản kit vừa cài
npm run typecheck && npx playwright test  # nghiệm thu ngay: kit đổi API thì typecheck bắt
```

`sync` ghi đè **đúng** tập asset dùng chung (hiện là `.claude/skills/`) và không đụng
`src/`, `tests/`, `package.json`, `README.md`, `CLAUDE.md` — thứ dự án sở hữu. Đó là điều
thay cho việc copy tay `jira.sh` giữa các repo: một nguồn, một lệnh.

`scaffold` tự điền dependency này theo **tag mới nhất** của kit lúc sinh dự án, nên dự án
mới không phải sửa tay.

Publish lên registry rồi thì đổi thành range bình thường (`"qc-kit": "^0.2.0"`) —
`exports`, `files` và `prepare` đã sẵn sàng cho cả hai đường.

> **Pre-1.0**: bump **minor** cho thay đổi phá vỡ, **patch** cho thay đổi tương thích
> ngược. Đọc [CHANGELOG.md](CHANGELOG.md) trước khi nâng minor.

## 2. Kit gồm gì

| Subpath | Dùng để |
|---|---|
| `qc-kit/config` | `defineEnvironments` · `definePlaywrightConfig` · `envVar`/`envFlag`/`envNumber` · `STORAGE_STATE` |
| `qc-kit/core` | `BasePage` · `BaseComponent` · `Authenticator` · `createAuthSetup` · `createAuthFixture` · session · `step()` · `logger` |
| `qc-kit/contract` | Hợp đồng test case: type, validate, dịch step sang Playwright, nhập từ Excel |
| `qc-kit/api` | `BaseApiClient` — retry, auth header, bọc step sẵn |
| `qc-kit/fixtures` | `pagesFixture` · `createApiFixture` · `createDataFixture` · `logFixture` |
| `qc-kit/utils` | random · date · file · polling |
| `qc-kit/types` | `Credentials` · `Overrides` |
| `qc-kit/scaffold` | Phần thuần của generator (`plan`, `render`) |

`@playwright/test` là **peer dependency tuỳ chọn** — suite API thuần cài kit mà không cần
browser.

## 3. Biến môi trường kit đọc

| Biến | Mặc định | Dùng để làm gì |
|---|---|---|
| `TEST_ENV` | entry đầu bảng | Chọn một khối trong bảng môi trường của dự án |
| `BASE_URL` / `API_URL` | lấy từ bảng | **Thắng mọi môi trường**, kể cả khi đổi `TEST_ENV`. `API_URL` trống thì theo `BASE_URL` |
| `SESSION_TTL_MINUTES` | `30` | Session đã cache dùng lại bao lâu trước khi đăng nhập lại |
| `API_TOKEN` | — | Bearer token mặc định cho `createApiFixture` |
| `HEADED` | tắt | `1` = hiện cửa sổ browser. **CI bỏ qua biến này** |
| `SLOW_MO` | `0` | Chậm N mili giây mỗi thao tác. Chỉ có tác dụng khi `HEADED=1` |
| `ACTION_TIMEOUT` · `NAVIGATION_TIMEOUT` · `EXPECT_TIMEOUT` · `TEST_TIMEOUT` | lấy từ bảng | Override tính bằng mili giây |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

> Giá trị **để trống** nghĩa là *"dùng mặc định"*, không phải *"dùng chuỗi rỗng"*. Nhờ
> vậy placeholder trống trong `.env.example` không bao giờ ghi đè một mặc định thật.

Thứ tự ưu tiên cố định: **biến môi trường thật của process → `.env` → bảng**.

Cái bẫy cần nhớ: `BASE_URL` đã có giá trị trong `.env` thì nó áp cho *mọi* môi trường.
Đổi `TEST_ENV=staging` mà quên xoá `BASE_URL` thì test vẫn chạy vào URL cũ, không có cảnh
báo nào — đây đúng là hành vi override được thiết kế như vậy.

Thiếu cả hai chỗ thì dừng ngay với thông báo chỉ đúng việc cần làm:

```
Error: No base URL for environment "beta". Either set BASE_URL in .env,
or give "beta" a baseURL in the environment table.
```

## 4. Các project mà preset dựng ra

| Project | Chạy gì | Trạng thái đăng nhập | Tắt bằng |
|---|---|---|---|
| `unit` | `src/**/*.test.ts` | không mở browser | **mặc định tắt** — bật bằng `unit: true` |
| `setup` | `tests/**/*.setup.ts` | thực hiện việc đăng nhập | `auth: false` |
| `api` | `tests/api/**` | bearer token, không mở browser | `api: false` |
| `chromium` | `tests/{ui,e2e}/**` trừ `@guest` | đã đăng nhập | `web: false` |
| `chromium-guest` | spec gắn tag `@guest` | chưa đăng nhập | `guest: false` hoặc `web: false` |

```ts
definePlaywrightConfig({
  env: config,
  projects: { api: false, auth: false },   // sản phẩm không có API, không có đăng nhập
  extraProjects: [ /* firefox, mobile… */ ],
  overrides: { workers: 2 },               // bất cứ thứ gì Playwright chấp nhận
});
```

**Không có màn đăng nhập?** `projects: { auth: false }`. Để mặc định (bật) mà thiếu file
`*.setup.ts` thì preset báo lỗi ngay lúc đọc config, kèm đúng việc cần làm — thay vì để
từng test chết vì thiếu file session.

`unit` mặc định tắt vì `testDir` của nó là `./src`, tức src của **người gọi**.

### Xem test chạy

```ini
HEADED=1        # hiện cửa sổ browser
SLOW_MO=300     # chậm 300ms mỗi thao tác cho mắt theo kịp
```

Khi `HEADED=1`, preset tự mở browser full màn hình (`--start-maximized` + `viewport:
null`) và **hạ xuống 1 worker** — nhiều cửa sổ tranh nhau màn hình thì không ai theo nổi.
Chạy headless thì quay lại 1280×720 để kết quả ổn định giữa các máy. Spec phụ thuộc kích
thước khung chính xác thì tắt maximize: `definePlaywrightConfig({ env, maximized: false })`.

Trong CI biến này bị bỏ qua hoàn toàn — agent không có màn hình.

## 5. Làm việc trên chính kit

```bash
make              # danh sách lệnh
make verify       # typecheck + build + unit test — cổng duy nhất trước khi commit
make smoke        # nghiệm thu thật: sinh dự án, cài từ tarball, CHẠY. Cần browser.
make new NAME=x   # sinh dự án automation mới
make pack         # tarball để thử cài nơi khác
make hooks        # bật .githooks (mỗi clone một lần)
make clean
```

**TDD là bắt buộc**: viết `*.test.ts` đỏ trước, rồi mới code. `make verify` không cần
browser, không cần credential, không cần mạng — chạy được trên máy sạch.

`make smoke` bắt lớp lỗi mà unit test không thấy: template không compile, `exports` map
sai, preset dựng nhầm đồ thị project. Nó đã bắt được hai lỗi thật.

### Cắt một release

```bash
make release VERSION=v0.2.0 DRY=1   # xem trước mục CHANGELOG, không đụng gì
make release VERSION=v0.2.0         # verify → CHANGELOG → bump package.json → commit → tag
git push origin master --tags
```

Script tự: chạy `make verify` (phát hành một bản không verify được là đẩy lỗi sang
client), sinh mục CHANGELOG từ conventional commit trong `prev-tag..HEAD`, bump
`package.json` cho **khớp tag** (đó là thứ npm phân giải), commit, rồi tạo annotated tag
**mang luôn release notes**. Nó **không push** — đó là việc của bạn.

Guard: phải ở `master`, cây làm việc sạch, tag chưa tồn tại.

Vì client cài từ **git URL**, hook build phải là `prepare` chứ không phải `prepack` — npm
chỉ chạy `prepare` khi cài từ git. Đổi nhầm thì client nhận một package không có `dist/`.

## 6. Cấu trúc

```
qc-kit/
├── CLAUDE.md · ONBOARDING.md · STRUCTURE.md
├── Makefile · scripts/smoke.sh · .githooks/commit-msg
├── docs/
│   ├── adr/                       quyết định khó lùi
│   ├── testcase-standard.md       hợp đồng test case
│   ├── TECH_DEBT.md
│   └── vong-khep-kin-qc.html      bức tranh tổng quan hệ sinh thái
│
├── src/                        ── KIT: không dòng nào biết một sản phẩm ──
│   ├── config/     env · defineEnvironments · definePlaywrightConfig · paths
│   ├── core/       BasePage · BaseComponent · auth · session · step · logger
│   ├── contract/   hợp đồng test case: type · validate · translate · testid
│   ├── api/        BaseApiClient
│   ├── fixtures/   factory fixture (KHÔNG export sẵn một `test`)
│   ├── scaffold/   phần thuần của generator
│   ├── utils/  types/
│   └── **/*.test.ts               unit test nằm cạnh code nó test
│
└── cmd/scaffold/               ── generator + template dự án mới ──
    └── templates/                 gồm cả LoginPage, credentials, auth.setup mẫu
```

**Một luật phụ thuộc giữ toàn bộ đứng vững:** không file nào trong `src/` được biết một
sản phẩm cụ thể. Kiểm bất cứ lúc nào:

```bash
grep -rniE "fcam\.vn|vmsmart|beta-" src/ cmd/
```

In ra dòng nào là vi phạm dòng đó. Ví dụ về sản phẩm nằm ở `cmd/scaffold/templates/`,
không nằm trong `src/`.

## 7. Quy ước

- **Locator**: `data-testid` là đích. Chưa có thì `id`/`name` > class team tự đặt >
  `getByRole` + tên hiển thị > CSS. Tuyệt đối không XPath, và mọi mức tạm phải có comment
  `TẠM THỜI` nêu lý do.
- **Chờ đợi**: dựa vào auto-waiting và web-first assertion. `page.waitForTimeout` không
  được xuất hiện trong code đã commit.
- **Step**: mọi method public của page object và component bọc thân hàm trong
  `this.step(...)` — đó là thứ giữ cho một lần fail còn đọc được khi suite đã lớn. Lời gọi
  API đã được `BaseApiClient` bọc sẵn.
- **Screenshot**: dùng `screenshot(name)` của page hoặc component. Đừng hardcode đường
  dẫn; các worker song song sẽ ghi đè lên nhau.
- **Log**: `logger.info(...)`. Các dòng log được attach vào test dưới tên `run.log`.
- **Tag**: `@smoke`, `@regression`, `@guest`, `@api` đặt trong tiêu đề test.
- **Đặt tên**: `PascalCase` cho page object và component; còn lại `*.client.ts`,
  `*.factory.ts`, `*.fixture.ts`, `*.setup.ts`, `*.spec.ts`, `*.test.ts`.
- **Độc lập**: mỗi test tự tạo dữ liệu nó cần, không giả định thứ tự chạy.
- **Secret**: chỉ trong `.env` / `.jira.env` / secret CI. Không bao giờ commit.

## 8. Xử lý sự cố

| Hiện tượng | Nguyên nhân và cách sửa |
|---|---|
| `Unknown TEST_ENV "x". Expected one of: …` | Gõ sai trong `.env`, hoặc môi trường đó chưa có trong bảng |
| `No base URL for environment "x"` | Bảng thiếu `baseURL` và `.env` cũng không có `BASE_URL` |
| `No setup file matching …setup.ts` | Dự án bật `auth` (mặc định) nhưng chưa có file setup. Thêm nó, hoặc `projects: { auth: false }` |
| `Executable doesn't exist at …chrome-headless-shell` | Chưa tải browser — `npx playwright install chromium` |
| Mọi test fail ngay sau khi đăng nhập | Session cache hỏng — `rm -rf playwright/.auth/*.json` rồi chạy lại |
| Report hiện một cú click trần, không có step | Có method của page object quên bọc `this.step(...)` |
| Một spec đăng nhập lại mỗi lần chạy | Nó đang tự gọi `signIn()` trong `beforeEach` — xem STRUCTURE.md §5 |

Khi fail, hệ thống tự thu trace, screenshot và video:

```bash
npx playwright show-report
npx playwright show-trace test-results/**/trace.zip
```

## 9. Tài liệu

| Cần biết | Đọc |
|---|---|
| qc-kit đứng ở đâu, ai sở hữu cái gì | [ONBOARDING.md](ONBOARDING.md) |
| Vì sao code có hình dạng đó, các điểm nối | [STRUCTURE.md](STRUCTURE.md) |
| Hợp đồng test case | [docs/testcase-standard.md](docs/testcase-standard.md) |
| Quyết định kiến trúc | [docs/adr/](docs/adr/) |
| Nợ kỹ thuật đã biết | [docs/TECH_DEBT.md](docs/TECH_DEBT.md) |
| Bức tranh tổng quan hệ sinh thái | [docs/vong-khep-kin-qc.html](docs/vong-khep-kin-qc.html) |
