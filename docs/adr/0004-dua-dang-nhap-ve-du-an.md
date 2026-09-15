# ADR-0004: Đưa luồng đăng nhập ra khỏi kit, về dự án tiêu thụ

- **Status:** Accepted
- **Date:** 2026-09-15
- **Deciders:** team QC Web-First
- **Related:** [ADR-0001](0001-kien-truc-qc-kit.md) (ranh giới framework ↔ sản phẩm);
  [Playwright — Authentication](https://playwright.dev/docs/auth) (mô hình storage state
  + setup project mà preset vẫn dựng)

## Context

Kit từng sở hữu cả ba tầng của việc đăng nhập:

| Tầng | File | Nó quyết định |
|---|---|---|
| Cơ chế | `src/core/auth.ts` | KHI NÀO đăng nhập: một lần mỗi run, hay một lần mỗi worker |
| Lưu trữ | `src/core/session.ts` | Cookie được tin bao lâu, ghi file ra sao |
| Đường dẫn | `src/config/paths.ts` | Session nằm ở `playwright/.auth/<role>.json` |

Xét theo luật cũ, ba file này *hợp lệ*: không file nào biết một locator, một URL hay một
tài khoản. Chúng vượt qua mọi check ranh giới của repo.

Nhưng chúng vẫn ép mọi consumer nhận **chính sách phiên đăng nhập** của người viết kit:

1. **TTL 30 phút và "còn cookie là còn dùng được"** là một phỏng đoán, không phải sự
   thật. Một sản phẩm vô hiệu hoá session khi đăng nhập ở nơi khác thì phỏng đoán đó sai
   và hỏng theo kiểu khó chẩn đoán: test bắt đầu ở trạng thái *tưởng là* đã đăng nhập.
2. **`playwright/.auth` là quy ước, không phải yêu cầu.** Kit đứng trên web · mobile ·
   backend; một suite mobile hay một suite chạy trong container có quyền cache chỗ khác.
3. **Đường dẫn cứng trong kit làm consumer không thể tách role** ngoài `role.json` +
   `worker-N.json` mà kit đặt tên sẵn.
4. Thực tế ở `web-first-automation`: đăng nhập là **hai bước, hai origin** (app → SSO
   Keycloak), và cookie chỉ được set ở bước callback. Chính sách "lưu session khi nào"
   ở đó là tri thức sản phẩm, dù code lưu nó thì trung tính.

Nói gọn: kit trả lời được *"test bằng cách nào"*, nhưng *"phiên đăng nhập của sản phẩm
này đáng tin trong bao lâu"* không phải câu hỏi mà một kit dùng chung trả lời hộ được.

## Decision

**Kit không còn export gì về đăng nhập.** Xoá khỏi `src/`:

- `src/core/auth.ts` — `Authenticator`, `AuthenticatorFactory`, `createAuthSetup`,
  `createAuthFixture`
- `src/core/session.ts` — `hasFreshSession`, `saveSession`, `writeSession`,
  `writeEmptySession`, `clearSession`, `sessionTtlMs`
- `src/config/paths.ts` — `AUTH_DIR`, `storageStatePath`, `STORAGE_STATE`
- `Credentials` trong `src/types` — tài khoản có field gì là câu hỏi của sản phẩm

**Preset thì giữ, nhưng mù.** `definePlaywrightConfig` vẫn dựng `setup → chromium` +
`chromium-guest`, vì bố cục project là thứ đáng chia sẻ nhất của preset — mất nó là mỗi
dự án tự viết lại đúng cái graph mà preset sinh ra để chống. Điều thay đổi: **`storageState`
không còn mặc định**. Bật `projects.auth` mà không truyền đường dẫn thì preset ném lỗi
lúc đọc config, không đoán hộ.

**Dự án nhận bản của chính nó.** `qc-kit new --auth` sinh `src/core/{auth,session,paths}.ts`
vào dự án — dự án sở hữu, sửa được, và `qc-kit sync` **không** đụng tới (nó không nằm
trong `MANAGED`).

## Consequences

**Được**

- Mỗi bộ test tự chọn TTL, đường dẫn, số role, điều kiện "session còn dùng được".
- Luật ranh giới của repo kiểm được bằng grep, như bốn luật kia:
  `grep -rE "createAuthSetup|createAuthFixture|hasFreshSession" src/`.
- Preset hết một mặc định ngầm. Trước đây một dự án quên `*.setup.ts` vẫn nhận
  `playwright/.auth/user.json` và fail ở tầng ENOENT; giờ nó fail lúc đọc config.
- Kit nhẹ đi 233 dòng và mất hẳn phụ thuộc vào `node:fs` ở tầng core.

**Mất**

- **Breaking change.** Mọi consumer phải tự mang `auth.ts` + `session.ts` + `paths.ts` và
  truyền `storageState`. Pre-1.0 nên phát hành ở **minor** (v0.3.0).
- **Code trùng nhau giữa các dự án.** Hai bộ test có cùng luồng đăng nhập sẽ có hai bản
  `session.ts` gần giống nhau. Đây là cái giá đã chọn: trùng lặp rẻ hơn một trừu tượng
  sai ép lên mọi người.
- Sửa một bug trong `session.ts` không còn lan bằng `npm i <tag mới>` — mỗi dự án tự sửa,
  hoặc sinh lại từ template.
- `SESSION_TTL_MINUTES` không còn là biến của kit; README của kit không tài liệu hoá nó nữa.

## Đổi ý nếu

- **Ba dự án trở lên** chép gần như nguyên văn `session.ts` và cùng cần một bản vá. Lúc đó
  cân nhắc đưa lại phần *lưu trữ thuần* (`writeSession`/`hasFreshSession` — không có
  đường dẫn, không có TTL mặc định) vào `qc-kit/utils`, và vẫn để tầng cơ chế lẫn đường
  dẫn ở dự án.
- Playwright ra API session chính thức khiến phần này chỉ còn vài dòng bọc mỏng: khi đó
  bọc nó trong kit không còn là ép chính sách lên ai.
