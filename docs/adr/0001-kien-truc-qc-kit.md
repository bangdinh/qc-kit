# ADR-0001: Kiến trúc qc-kit — spec-based TDD, một package, hợp đồng ở giữa

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** QC / qc-kit maintainers
- **Related:** `b2b-gokit/CLAUDE.md` (mô hình base framework + scaffold);
  `platform-qc-agent/platform_qc_agent/schemas.py` nhánh `development` (bên sinh test case);
  `web-first-automation/docs/testcase-two-layer-convention.md` (consumer đầu tiên)

## Context

`qc-kit` là kit dùng chung cho nhiều bộ test, không phải bộ test của một sản phẩm. Ba
sức ép cùng lúc:

**1. Consumer đầu tiên đã chọn BDD, nhưng nó chỉ là một consumer.**
`web-first-automation` viết 100% Gherkin, có luật cứng cấm `.spec.ts` thuần, và
`scripts/export-testcases.js` (778 dòng) **parse thẳng `.feature`** để sinh Excel cho
tester thủ công. Nghĩa là hôm nay muốn có báo cáo thì buộc phải viết Gherkin.

**2. Gherkin không phổ quát cho tập consumer mà kit phải phục vụ.**

| Consumer | Cần Gherkin |
|---|---|
| Web app có tester thủ công + BA + báo cáo Excel | Có |
| Suite contract test cho `brm-v2` / `iam-v2` | Không — không ai tick pass/fail API contract trên Excel |
| Mobile app | Có |
| Smoke sau deploy, kiểm hạ tầng | Không |

Theo phép thử của chính kit (`STRUCTURE.md` §8): *một helper "generic, trừ mỗi cái field
này" thì không phải generic.* Gherkin không đạt.

**3. Bên sinh test case đã trả ra dữ liệu có cấu trúc, và không ai validate nó.**
`platform-qc-agent` sinh `TestStep` dạng `{no, screen, action, target, description,
expected}` với `action` là enum 8 verb. Nhưng endpoint Dify thật sự gọi —
`POST /v1/test-suite/generate` — streaming, trả envelope OpenAI, **không validate
schema**; endpoint có validate (`/testcases/generate`) thì bị tắt 503 khi provider là
omni vì gateway ngắt ở ~50s.

Nếu Gherkin nằm giữa, luồng thành: JSON có cấu trúc → văn xuôi Gherkin → step
definition parse ngược. Hai lần dịch, lần sau là parse tiếng Việt.

## Decision

### 1. Mô hình viết mặc định là spec + page object (TDD), Gherkin là adapter tuỳ chọn

Kit không ép Gherkin. `bdd/` là subpath opt-in, nối spec do `bddgen` sinh vào **cùng bộ
fixture** mà `.spec.ts` dùng — một đường thực thi, hai cửa vào.

Lý do chọn spec làm mặc định: một tầng gián tiếp thay vì ba (feature → step → page
object), lỗi trỏ thẳng vào dòng code, IDE hiểu được.

### 2. Metadata test case khai trong code, reporter thu về

Đây là **điều kiện cần**, không phải tính năng thêm. Bỏ Gherkin mà không thay gì vào là
giết cầu nối manual–automation.

```ts
test('Đăng nhập bằng mã doanh nghiệp hợp lệ', qc.case({
  id: 'LOGIN-01a', priority: 'High', tags: ['smoke'],
  precondition: 'Chưa đăng nhập',
  expected: 'Vào được trang chủ',
}), async ({ createPage }) => { /* … */ });
```

### 3. Hợp đồng ở giữa; report tiêu thụ hợp đồng, không parse `.feature`

```
.feature ─┐
.spec.ts ─┼──► TestCase[] ──► Excel · OVERVIEW · RUN_HISTORY · failures-latest
agent    ─┘
```

Đảo chiều so với hôm nay (`.feature → Excel`). Gherkin trở thành một trong ba nguồn, và
JSON của agent đi thẳng vào pipeline không qua văn xuôi.

### 4. Một package, không phải nhiều `@qc/*`

`qc-kit` là **một** package với subpath export (`qc-kit/contract`, `qc-kit/web`,
`qc-kit/api`), một version, consumer pin đúng một tag — giống `b2b-gokit` là một Go
module. Dependency nặng khai bằng `peerDependenciesMeta.optional`, nên suite API cài
được mà không cần `@playwright/test`.

### 5. TDD bắt buộc cho code của kit

Viết `*.test.ts` đỏ trước. Đỏ → xanh → refactor → commit. Port thẳng từ `b2b-gokit`.

### 6. Một test runner, không hai

Test đơn vị chạy bằng chính Playwright runner qua project `unit` (`testDir: './src'`,
`testMatch: /.*\.test\.ts/`). Không thêm vitest/jest. `npm run verify` = typecheck +
project `unit`: không browser, không credential, không mạng.

### 7. Validate ở cửa vào

`contract/` validate lại mọi thứ đi vào pipeline. **Dung thứ đóng gói, nghiêm với
schema**: bóc markdown fence và cứu JSON bị bọc trong lời dẫn (đó là lỗi đóng gói), còn
thiếu field hay verb lạ thì từ chối kèm đường dẫn JSON chính xác.

## Consequences

**Được**

- Kit phục vụ được suite API và mobile mà không bắt ai viết Gherkin.
- Output của agent vào thẳng pipeline, không mất mát qua văn xuôi.
- `web-first-automation` không phải viết lại gì: `.feature` vẫn chạy, chỉ đổi chỗ đổ ra.
- Một version để pin, một lệnh để verify.

**Mất**

- Thêm một tầng gián tiếp. `contract/` phải tồn tại và được test kỹ trước khi bất cứ thứ
  gì khác dùng được — chậm hơn việc bê thẳng `export-testcases.js` sang.
- Spec + metadata dài dòng hơn một dòng Gherkin, và BA không đọc trực tiếp file test được.
- Hai mô hình viết cùng tồn tại ⇒ người mới phải học cả hai. Trả một lần trong
  `ONBOARDING.md`.

## Đổi ý nếu

- **Sau sáu tháng vẫn chỉ có đúng một consumer**, và consumer đó là web có tester thủ
  công. Khi ấy tầng hợp đồng là chi phí không ai trả, bê thẳng Gherkin vào core là đúng.
- **BA/PO thật sự đọc và góp ý trên `.feature`.** Đo được: sáu tháng qua có ai ngoài QA
  từng comment vào một file `.feature` chưa. Có thì lý do giữ Gherkin làm mặc định quay lại.
- **`peerDependenciesMeta.optional` gây rắc rối thật** cho consumer không dùng browser.
  Khi đó tách `qc-kit-core` ra khỏi `qc-kit`.
