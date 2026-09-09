# qc-kit

Bộ kit QC **dùng chung** cho automation web · mobile · backend — mỗi dự án kế thừa thay vì copy
khung. Hôm nay repo đã có tầng runtime web: framework kiểm thử end-to-end xây trên
[Playwright](https://playwright.dev) + TypeScript, theo mô hình **Page Object Model kết hợp custom
fixtures**.

> **Lần đầu vào repo?** Đọc [ONBOARDING.md](ONBOARDING.md) trước — 5 phút, đủ hiểu qc-kit đứng ở
> đâu giữa `platform-qc-agent`, `web-first-automation` và Dify, cùng luật quyết định code nào
> thuộc repo nào. README này nói **cách chạy**; [STRUCTURE.md](STRUCTURE.md) nói **vì sao code có
> hình dạng đó**.

---

## 1. Yêu cầu môi trường

| | |
|---|---|
| Node.js | **20 trở lên** (`@playwright/test` 1.63 yêu cầu) |
| npm | đi kèm Node |
| Hệ điều hành | Windows / macOS / Linux |

```bash
node -v      # phải in ra v20.x hoặc cao hơn
```

## 2. Cài đặt — bốn bước, làm một lần cho mỗi máy

```bash
npm install                   # cài thư viện
npm run install:browsers      # tải browser (~400 MB, chỉ một lần)
cp .env.example .env          # cấu hình máy bạn — đã git-ignore
```

Sau đó mở `.env` và điền vào. **Đây là file duy nhất bạn cần sửa để chạy được suite** —
không có URL, tài khoản hay timeout nào bị hardcode ở chỗ khác.

```ini
TEST_ENV=beta                 # chọn khối nào trong src/config/environments.ts
COMPANY_CODE=ma-doanh-nghiep  # mã doanh nghiệp màn hình login hỏi ở bước đầu
USER_USERNAME=qa.account
USER_PASSWORD=•••••••
```

Kiểm tra cài đặt mà không cần đụng tới app:

```bash
npm run typecheck             # tsc --noEmit — không in ra gì là đạt
npx playwright test --list    # liệt kê test mà mỗi project sẽ chạy
```

### Toàn bộ biến `.env` chấp nhận

| Biến | Bắt buộc | Mặc định | Dùng để làm gì |
|---|---|---|---|
| `TEST_ENV` | không | `local` | Chọn một khối trong `src/config/environments.ts`: `local`, `dev`, `beta`, `staging`, `prod` |
| `COMPANY_CODE` | **có**¹ | — | Mã doanh nghiệp — bước 1 của luồng đăng nhập app này |
| `USER_USERNAME` / `USER_PASSWORD` | **có**¹ | — | Tài khoản test chuẩn |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | không | — | Role thứ hai, cho spec nào cần |
| `BASE_URL` / `API_URL` | xem dưới | lấy từ bảng | URL đích. Điền vào đây thì **thắng mọi môi trường**, kể cả khi đổi `TEST_ENV`. `API_URL` bỏ trống thì lấy theo `BASE_URL` |
| `SESSION_TTL_MINUTES` | không | `30` | Session đã cache được dùng lại bao lâu trước khi đăng nhập lại |
| `HEADED` | không | tắt | `1` = hiện cửa sổ browser khi chạy. CI luôn headless, biến này bị bỏ qua |
| `SLOW_MO` | không | `0` | Làm chậm mỗi thao tác N mili giây để mắt người theo kịp. Chỉ có tác dụng khi `HEADED=1` |
| `API_TOKEN` | không | — | Bearer token cấp sẵn cho spec API |
| `ACTION_TIMEOUT` / `NAVIGATION_TIMEOUT` / `EXPECT_TIMEOUT` / `TEST_TIMEOUT` | không | lấy từ bảng | Override tính bằng mili giây |
| `LOG_LEVEL` | không | `info` | `debug` \| `info` \| `warn` \| `error` |

¹ Chỉ bắt buộc với test cần đăng nhập. Thiếu chúng thì suite vẫn chạy được: setup project
ghi ra một session rỗng, còn test cần tài khoản sẽ tự skip kèm thông báo nói rõ đang
thiếu biến nào.

> Giá trị để trống nghĩa là *"dùng mặc định"*, không phải *"dùng chuỗi rỗng"*. Chỉ điền
> một biến khi bạn thật sự muốn override nó.

### URL đích: hai cách khai báo

Có hai chỗ đặt được URL, và chúng phục vụ hai kiểu dự án khác nhau:

| Cách | Đặt ở | Hợp với |
|---|---|---|
| **`.env`** | `BASE_URL` / `API_URL` | Dự án chỉ chạy vào một môi trường, hoặc mỗi người một URL (PR preview, máy dev riêng) |
| **Bảng môi trường** | `src/config/environments.ts` | Dự án đổi qua lại nhiều môi trường bằng `TEST_ENV` |

Thứ tự ưu tiên: **biến môi trường thật của process → `.env` → bảng**.

Cái bẫy cần nhớ: khi `BASE_URL` đã có giá trị trong `.env`, nó áp cho *mọi* môi trường.
Đổi `TEST_ENV=staging` mà quên xoá `BASE_URL` thì test vẫn chạy vào URL cũ và không có
cảnh báo nào — vì đây đúng là hành vi override được thiết kế như vậy. Nếu bạn hay chuyển
môi trường, để `BASE_URL` trống và khai báo URL trong bảng.

Bảng cũng không bắt buộc phải có URL. Một dự án mới có thể để bảng chỉ còn timeout và
khai báo URL hoàn toàn trong `.env`:

```ts
export const environments = defineEnvironments({
  beta: { timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 } },
});
```

Thiếu cả hai chỗ thì lần chạy dừng ngay với thông báo chỉ đúng việc cần làm:

```
Error: No base URL for environment "beta". Either set BASE_URL in .env,
or give "beta" a baseURL in the environment table.
```

## 3. Chạy test

```bash
npm test                 # chạy tất cả
npm run test:ui          # UI + E2E, đã đăng nhập
npm run test:api         # chỉ API, không mở browser
npm run test:guest       # spec chạy ở trạng thái chưa đăng nhập (login, đăng ký, lỗi)
npm run test:smoke       # mọi test gắn tag @smoke
npm run test:headed      # xem browser chạy thật
npm run test:debug       # Playwright inspector, chạy từng bước
npm run test:watch       # chế độ UI mode
npm run report           # mở HTML report của lần chạy gần nhất
npm run codegen          # ghi lại selector từ app thật
```

Chạy một spec, một test, hoặc một project:

```bash
npx playwright test tests/ui/Login.spec.ts
npx playwright test -g "Login success"
npx playwright test --project=chromium-guest
TEST_ENV=staging npx playwright test          # đổi môi trường cho riêng lần chạy này
```

### Xem test chạy — hai chế độ khác nhau

**Headed** — browser thật hiện lên, test chạy như người dùng thật. Bật bằng `.env`, nên
không cần nhớ flag và cũng không phải sửa code:

```ini
HEADED=1        # hiện cửa sổ browser
SLOW_MO=300     # chậm lại 300ms mỗi thao tác cho dễ nhìn
```

Khi `HEADED=1`, config tự làm thêm hai việc:

- **Mở browser full màn hình** (`--start-maximized` + `viewport: null`) thay vì khung cố
  định 1280×720 của device preset. Chạy headless thì quay lại 1280×720 để kết quả ổn
  định giữa các máy.
- **Hạ xuống 1 worker** — nhiều cửa sổ browser tranh nhau màn hình thì mắt người không
  theo nổi.

Trong CI biến này bị bỏ qua hoàn toàn: agent không có màn hình, chạy headed sẽ fail ngay
từ lúc khởi động browser.

Nếu spec phụ thuộc vào kích thước khung chính xác (responsive breakpoint, so sánh ảnh),
tắt maximize đi vì cửa sổ full màn hình mỗi máy một kích thước:

```ts
export default definePlaywrightConfig({ env: config, maximized: false });
```

Chạy một lần mà không muốn sửa `.env`:

```bash
HEADED=1 npx playwright test          # qua biến môi trường
npm run test:headed                   # hoặc dùng flag --headed của Playwright
```

**UI mode** — giao diện riêng của Playwright: cây test, time-travel qua từng step, tự
chạy lại khi sửa file. Đây là chế độ để *soạn* và *gỡ* test, không phải để chạy cả suite:

```bash
npm run test:watch      # playwright test --ui
npm run test:debug      # inspector, dừng ở từng bước
```

### Chạy test trong VS Code

Cài extension [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
— workspace đã có sẵn file gợi ý cài trong `.vscode/extensions.json`.

**Nếu Test Explorer hiện `playwright.config.ts [chromium-guest] — disabled` và không thấy
test nào:** đó là hành vi mặc định của extension, không phải lỗi config. Extension chỉ tự
bật **project đầu tiên** trong file config, mà project đầu tiên ở đây là `setup` —
project này không chứa spec nào của người dùng.

Cách sửa, làm một lần cho mỗi workspace:

1. Mở panel **Playwright** (cùng hàng với Terminal / Output / Ports ở dưới cùng).
2. Ở mục **PROJECTS**, tick ít nhất `chromium` và `chromium-guest`.
3. Bấm nút refresh của Test Explorer.

Trạng thái này VS Code lưu trong workspace state của máy bạn, không nằm trong repo, nên
mỗi người phải tự tick một lần.

Thêm một điểm dễ nhầm: **một test chỉ xuất hiện dưới đúng một project.** `Login.spec.ts`
gắn tag `@guest` nên nó chỉ thuộc `chromium-guest`; bật mỗi `chromium` thì vẫn không thấy
gì. Kiểm tra nhanh từ terminal:

```bash
npx playwright test --list --project=chromium-guest
```

### Hiện tại đang có gì

Suite mới có một spec là `tests/ui/Login.spec.ts`, và nó đã chạy pass với tài khoản
thật. Điều kiện duy nhất là `.env` đã điền `COMPANY_CODE` cùng tài khoản — thiếu thì
test tự skip chứ không fail.

Luồng đăng nhập đi qua **hai origin**:

| Bước | Ở đâu | Locator dựa vào |
|---|---|---|
| 1. Mã doanh nghiệp | `beta-vmsmart-next.fcam.vn/vi/login` | label, `#company`, class `cap-auth-*` — trang này không có `data-testid` |
| 2. Tài khoản / mật khẩu | Keycloak: `staging-sso.fcam.vn/realms/<company>/…` | `data-testid` thật: `sso-login-username-input`, `sso-login-password-input`, `sso-login-submit-btn` |

Chuyển tiếp giữa hai bước do `/api/auth/login?company=<code>` thực hiện.

## 4. Ai là người đăng nhập

Không spec nào trong `tests/ui` hay `tests/e2e` được gọi `LoginPage.signIn()`. Khi bật
`fullyParallel`, một lệnh đăng nhập trong `beforeEach` sẽ chạy lại ở từng spec file, và
tất cả cùng tranh nhau ghi vào một file session.

| Tình huống | Cơ chế |
|---|---|
| **Mặc định** | `tests/setup/auth.setup.ts` đăng nhập **một lần cho cả lần chạy** và ghi ra `playwright/.auth/user.json`. Project `chromium` phụ thuộc vào nó nên khởi động là đã đăng nhập sẵn. |
| Session còn hạn | Dùng lại nguyên trạng khi còn trẻ hơn `SESSION_TTL_MINUTES` — chạy lại ở máy local sẽ bỏ qua hẳn bước đăng nhập qua UI. |
| Suite không dùng được session chung | Import `authenticatedTest` thay cho `test` — mỗi **worker** đăng nhập nhiều nhất một lần, vào file riêng của nó. |
| Chính test đăng nhập | Gắn tag `@guest`; nó chạy dưới project `chromium-guest`, hoàn toàn không có session. |

File session được ghi theo kiểu atomic, nên một worker đọc file trong lúc worker khác
đang làm mới nó sẽ không bao giờ đọc phải file ghi dở.

```bash
rm -rf playwright/.auth/*.json    # ép đăng nhập lại từ đầu ở lần chạy sau
```

## 5. Các project của Playwright

| Project | Chạy gì | Trạng thái đăng nhập |
|---|---|---|
| `setup` | `tests/setup/*.setup.ts` | thực hiện việc đăng nhập |
| `api` | `tests/api/**` | bearer token, không mở browser |
| `chromium` | `tests/ui/**`, `tests/e2e/**` trừ `@guest` | đã đăng nhập (storage state) |
| `chromium-guest` | spec gắn tag `@guest` | chưa đăng nhập |

Bố cục này do `definePlaywrightConfig()` dựng ra; `playwright.config.ts` chỉ còn một
dòng. Muốn điều chỉnh thì dùng option, đừng fork lại preset:

```ts
export default definePlaywrightConfig({
  env: config,
  projects: { api: false },        // sản phẩm không có suite API
  extraProjects: [ /* firefox, mobile… */ ],
  overrides: { workers: 2 },       // bất cứ thứ gì Playwright chấp nhận
});
```

## 6. Cấu trúc thư mục

```
qc-kit/
├── playwright.config.ts            # một dòng — gọi preset
├── .env                            # cấu hình máy bạn (git-ignored)
│
├── src/
│   ├── config/                     # ── framework ──────────────────────────
│   │   ├── env.ts                  #   đọc .env + envVar/envFlag/envNumber
│   │   ├── define-environments.ts  #   defineEnvironments(): cách đọc một bảng
│   │   ├── define-config.ts        #   definePlaywrightConfig(): bố cục project
│   │   ├── paths.ts                #   nơi cache session
│   │   └── environments.ts         # ── dự án: bảng URL ─────────────────────
│   │
│   ├── core/                       # ── framework: lớp cơ sở ───────────────
│   │   ├── base.ui-object.ts       #   step(), capture(), helper locator
│   │   ├── base.page.ts            #   BasePage: open(), reload(), screenshot()
│   │   ├── base.component.ts       #   BaseComponent: mảnh UI theo root locator
│   │   ├── auth.ts                 #   hợp đồng Authenticator + login setup/worker
│   │   ├── session.ts              #   storage state: TTL, ghi atomic
│   │   ├── step.ts                 #   step cho report, an toàn cả ngoài test
│   │   └── logger.ts               #   log ra console + attach vào report
│   │
│   ├── pages/                      # ── dự án: mỗi màn hình một class ──────
│   ├── components/                 # ── dự án: header, modal, grid… ────────
│   │
│   ├── api/
│   │   ├── clients/base.client.ts  #   framework: retry, auth header, step
│   │   └── models/                 #   dự án: type request/response
│   │
│   ├── fixtures/                   # thứ mà spec import vào
│   │   ├── index.ts                #   `test`, `expect`, `authenticatedTest`
│   │   ├── pages.fixture.ts        #   createPage() + fixture cho từng page
│   │   ├── api.fixture.ts          #   apiContext, apiToken, createClient()
│   │   ├── data.fixture.ts         #   testData: tài khoản + factory
│   │   ├── auth.fixture.ts         #   dây nối cho login theo worker
│   │   └── log.fixture.ts          #   attach log vào report (tự động)
│   │
│   ├── data/
│   │   ├── credentials.ts          #   tài khoản đọc từ .env — không secret trong git
│   │   ├── authenticators.ts       #   page object nào đăng nhập, với tài khoản nào
│   │   └── factories/              #   buildUser()… hợp lệ sẵn, override được
│   │
│   ├── utils/                      # random, date, file, polling
│   └── types/                      # type TS dùng chung
│
├── tests/
│   ├── setup/auth.setup.ts         # đăng nhập một lần cho cả lần chạy
│   ├── ui/  e2e/  api/             # các spec
│   └── README.md                   # test nào thuộc thư mục nào
│
└── playwright/.auth/               # session đã cache (git-ignored)
```

**Một luật phụ thuộc duy nhất giữ toàn bộ cấu trúc này đứng vững:** `src/config`,
`src/core`, `src/utils` và `src/types` không bao giờ import từ `src/pages`,
`src/components` hay `src/data`. Phụ thuộc chỉ chảy một chiều — đó là điều sau này cho
phép tách tầng framework thành package dùng chung. Kiểm tra bất cứ lúc nào:

```bash
grep -rE "from '\.\./(pages|components|data)" src/core src/config src/utils src/types
```

In ra dòng nào là vi phạm dòng đó. [STRUCTURE.md](STRUCTURE.md) giải thích vì sao có luật
này, các tầng gồm những gì, và một lần chạy thực thi ra sao.

## 7. Thêm một page object

**1. `src/pages/CartPage.ts`**

```ts
import { expect } from '@playwright/test';
import { BasePage } from '../core/base.page';

export class CartPage extends BasePage {
  protected override readonly path = '/vi/cart';

  readonly items = this.page.getByRole('listitem');
  readonly checkout = this.page.getByRole('button', { name: 'Thanh toán' });

  override async waitUntilLoaded(): Promise<void> {
    await expect(this.checkout).toBeVisible();
  }

  async placeOrder(): Promise<void> {
    await this.step('đặt hàng', async () => {
      await this.clickWhenReady(this.checkout);
    });
  }
}
```

`this.step(...)` bọc hành động vào một step của report, nhờ đó HTML report và trace hiện
`CartPage: đặt hàng` thay vì một cú click vô danh. Bọc như vậy cho mọi method mô tả ý
định — tốn một dòng, và đó là thứ giữ cho một lần fail còn đọc được khi suite đã lớn.

**2.** Export nó ở `src/pages/index.ts`, và nếu dùng thường xuyên thì thêm một fixture
trong `src/fixtures/pages.fixture.ts`.

**3. `tests/ui/Cart.spec.ts`**

```ts
import { test, expect } from '../../src/fixtures';
import { CartPage } from '../../src/pages/CartPage';

test('đặt hàng thành công @smoke', async ({ createPage }) => {
  const cart = createPage(CartPage);
  await cart.open();
  await cart.placeOrder();
  await expect(cart.items).toHaveCount(0);
});
```

## 8. Thêm một component

Component được giới hạn trong một root locator, nên locator của nó không bao giờ lọt ra
phần còn lại của trang. Nó có `step()` và `screenshot()` giống hệt một page.

```ts
import { type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core/base.component';

export class Header extends BaseComponent {
  readonly logout = this.root.getByRole('button', { name: 'Đăng xuất' });

  constructor(page: Page, root: Locator = page.getByRole('banner')) {
    super(page, root);
  }

  async signOut(): Promise<void> {
    await this.step('đăng xuất', () => this.clickWhenReady(this.logout));
  }
}
```

## 9. Thêm một API client

```ts
// src/api/clients/users.client.ts
import { BaseApiClient } from './base.client';
import type { User } from '../models';

export class UsersClient extends BaseApiClient {
  protected override readonly basePath = '/users';
  getById = (id: string) => this.json<User>('get', `/${id}`);
  create = (payload: Partial<User>) => this.json<User>('post', '', { data: payload });
}
```

```ts
// tests/api/users.spec.ts
import { test, expect } from '../../src/fixtures';
import { UsersClient } from '../../src/api/clients/users.client';

test('tạo được user @api', async ({ createClient, testData }) => {
  const users = createClient(UsersClient);
  const created = await users.create(testData.buildUser());
  expect(created.id).toBeTruthy();
});
```

## 10. Thêm một môi trường

Thêm một entry vào bảng trong `src/config/environments.ts` — chỉ vậy thôi. Tên đó tự
động trở thành một giá trị `TEST_ENV` hợp lệ, và một tên lạ sẽ làm lần chạy fail ngay
kèm danh sách các tên được chấp nhận.

```ts
export const environments = defineEnvironments({
  // …
  uat: {
    baseURL: 'https://uat.example.com',
    apiURL: 'https://uat.example.com/api',
    timeouts: { action: 20_000, navigation: 45_000, expect: 15_000, test: 90_000 },
  },
}, { fallback: 'local' });
```

## 11. Quy ước

- **Locator**: `getByRole` > `getByLabel` > `getByTestId` > CSS. Tuyệt đối không XPath.
  Selector phải lấy từ DOM thật — bằng `npm run codegen` hoặc inspector của browser.
  Không bao giờ tự bịa ra một `data-testid` rồi hy vọng nó tồn tại.
- **Chờ đợi**: dựa vào auto-waiting và web-first assertion của Playwright.
  `page.waitForTimeout` không được phép xuất hiện trong code đã commit.
- **Step**: mọi method public của page object và component đều bọc thân hàm trong
  `this.step(...)`; lời gọi API đã được `BaseApiClient` tự bọc step sẵn.
- **Screenshot**: dùng `screenshot(name)` của page hoặc component — nó ghi vào thư mục
  output riêng của test và tự attach file. Đừng hardcode đường dẫn; các worker chạy song
  song sẽ ghi đè lên nhau.
- **Log**: dùng `logger.info(...)` từ `src/core/logger`. Các dòng log được attach vào
  test dưới tên `run.log`, nhờ đó output của các worker song song vẫn tách bạch.
- **Tag**: `@smoke`, `@regression`, `@guest`, `@api` đặt trong tiêu đề test, lọc bằng
  `--grep`.
- **Đặt tên**: `PascalCase` cho page object và component (`LoginPage.ts`, `Header.ts`),
  còn lại `*.client.ts`, `*.factory.ts`, `*.fixture.ts`, `*.setup.ts`, `*.spec.ts`.
- **Độc lập**: mỗi test tự tạo dữ liệu nó cần và không giả định gì về thứ tự chạy.
- **Secret**: chỉ nằm trong `.env` / secret của CI. `.env` đã git-ignore; không bao giờ
  commit file này.

## 12. Xử lý sự cố

| Hiện tượng | Nguyên nhân và cách sửa |
|---|---|
| `Unknown TEST_ENV "x". Expected one of: …` | Gõ sai trong `.env`, hoặc môi trường đó chưa có trong `src/config/environments.ts` |
| `Executable doesn't exist at …chrome-headless-shell` | Chưa tải browser — chạy `npm run install:browsers` |
| Test bị skip: *"Set COMPANY_CODE, USER_USERNAME…"* | `.env` thiếu thông tin đăng nhập — xem §2 |
| Mọi test fail ngay sau khi đăng nhập | Session cache đã hỏng — `rm -rf playwright/.auth/*.json` rồi chạy lại |
| Không tìm thấy locator ở màn hình nhập tài khoản | Chính là mấy locator placeholder trong `LoginPage` — xem §3 |
| Report hiện một cú click trần, không có step | Có method của page object quên bọc `this.step(...)` |
| Một spec đăng nhập lại mỗi lần chạy | Nó đang tự gọi `signIn()` — xem §4 |

Khi fail, hệ thống tự thu trace, screenshot và video:

```bash
npm run report                                   # HTML report
npx playwright show-trace test-results/**/trace.zip
```

## 13. CI

```yaml
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test
  env:
    TEST_ENV: beta
    COMPANY_CODE: ${{ secrets.COMPANY_CODE }}
    USER_USERNAME: ${{ secrets.USER_USERNAME }}
    USER_PASSWORD: ${{ secrets.USER_PASSWORD }}
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: playwright-report, path: playwright-report/ }
```

Biến `CI=true` (mọi hệ CI đều tự đặt) sẽ bật retry, 4 worker, reporter JUnit ghi ra
`test-results/junit.xml`, và `forbidOnly`.

## 14. Việc tiếp theo

- [ ] Điền `.env` với `COMPANY_CODE` và tài khoản test thật
- [ ] Thay locator placeholder của bước nhập tài khoản trong `src/pages/LoginPage.ts`
- [ ] Viết những component và API client đầu tiên
- [ ] Dựng pipeline CI theo mẫu ở trên
