---
name: qc-concept
description: Concept va phan vai cua qc-kit trong he sinh thai QC Web-First (Dify, platform-qc-agent, agent-memory, du an tieu thu) - qc-kit so huu cai gi, tuyet doi khong lam gi, hop dong test case bat no phai co gi, va them code thi di dau. Kich hoat khi bat dau lam viec trong repo qc-kit, khi hoi "qc-kit la gi", khi khong chac mot doan code thuoc repo nao, khi them module/template moi, hoac khi nhac platform-qc-agent, Dify, agent-memory, web-first-automation, scaffold.
---

# qc-kit — concept và phân vai

Bản đầy đủ cho người đọc: [`ONBOARDING.md`](../../../ONBOARDING.md). Skill này là phần
agent phải tuân theo khi viết code trong repo.

## Một câu

`qc-kit` là **bộ kit QC dùng chung** (web · mobile · backend) để mỗi dự án kế thừa thay vì
copy khung — mô hình theo `b2b-gokit`. Nó trả lời **"test bằng cách nào"**, không trả lời
"test cái gì" và không trả lời "cần test những case nào".

## Năm hệ thống, năm câu hỏi

| Hệ thống | Câu hỏi nó trả lời |
|---|---|
| Dify (`b2b-agents.fcam.vn`) | Người dùng hỏi ở đâu? |
| `platform-qc-agent` (`fli-backend/core`) | Cần test những case nào? |
| `agent-memory` (Zep, MCP/SSE) | Dự án này đã biết những gì? |
| **`qc-kit`** ← repo này | **Test bằng cách nào?** |
| Dự án tiêu thụ (`web-first-automation` là **một** trong số đó) | Sản phẩm này cụ thể ra sao? |

## Bốn luật — vi phạm nghĩa là code đang nằm sai chỗ

1. **Không gọi LLM.** Sinh test case là việc của `platform-qc-agent`.
2. **`src/` không biết một sản phẩm nào.** Không locator thật, URL, tài khoản, tên module.
   Ví dụ về sản phẩm sống ở `cmd/scaffold/templates/` dưới dạng bản mẫu trung tính.
3. **Không chứa tri thức sinh case.** Checklist các nhóm case, cách suy case từ
   requirement — thuộc prompt của agent.
4. **Không export sẵn một `test` đã compose.** Kit export *factory*; dự án tự `mergeTests`.

```bash
grep -rE "from ['\"](@anthropic-ai/|openai|langchain)" src/ && echo "VI PHẠM 1"
grep -rniE "fcam\.vn|vmsmart|beta-" src/ cmd/               && echo "VI PHẠM 2/3"
grep -rE "^import .*mergeTests" src/                        && echo "VI PHẠM 4"
```

Cả ba check đều cố tình dò **import/định danh**, không dò chữ trong comment — repo có ví
dụ hợp lệ nhắc `mergeTests` và `OpenAI envelope` trong doc comment.

## Layout

```
src/config/    env · defineEnvironments · definePlaywrightConfig · paths · find-setup
src/core/      BasePage · BaseComponent · auth · session · step · logger
src/contract/  hợp đồng test case: types · validate · translate · testid
src/api/       BaseApiClient        src/fixtures/  factory fixture
src/scaffold/  plan · render        src/utils/  src/types/
cmd/scaffold/  CLI + templates dự án mới
```

**Một package** `qc-kit`, subpath export, một version — không tách `@qc/*`.
Subpath: `config` · `core` · `contract` · `api` · `fixtures` · `utils` · `types` ·
`scaffold`. `@playwright/test` là peer **optional**.

Chưa có: `report/` (Excel), adapter Gherkin, `mobile/`. Đừng giả định một module đã tồn
tại — kiểm tra trước.

## Hợp đồng với platform-qc-agent

Một step **đã là bước thực thi được**: `{no, screen, action, target, description, expected}`.

| Schema có gì | qc-kit làm gì |
|---|---|
| `action` enum 8 verb | `translateAction()` — 6 verb ánh xạ thẳng; `swipe`/`scroll` trả `custom: true` vì Playwright không có lời gọi tương đương |
| `source` + `assumptions[]` | `assertGrounded()` — case `inferred` là giả định chưa xác nhận |
| Endpoint Dify dùng không validate | `parseTestCaseResult()` — dung thứ đóng gói, nghiêm với schema |

**Chưa chốt:** `target` của agent là snake_case (`start_live_button`), `data-testid` của
kit là kebab-case có prefix module (`livestream-start-live-btn`). `toTestId()` chuẩn hoá,
nhưng module prefix là **heuristic** lấy đoạn đầu của `screen` — override được. Gặp chỗ
nó đoán sai thì truyền `module` tay, đừng đặt ra quy tắc mới.

## Thêm code thì đi đâu

| Đang thêm… | Đi đâu |
|---|---|
| Cách sinh ra một loại case mới | `platform-qc-agent` — **không phải đây** |
| Locator / URL / tài khoản của một sản phẩm | Dự án tiêu thụ — **không phải đây** |
| Một page object / component / API client **mẫu** | `cmd/scaffold/templates/` + entry trong `src/scaffold/plan.ts` |
| Cách trình bày, xuất báo cáo test case | `src/report/` (chưa có) |
| Năng lực cắt ngang (dọn dữ liệu, matcher riêng) | `src/core/` — phải dùng được cho **mọi** sản phẩm |
| Một option mới cho preset | `src/config/define-config.ts` + test trong `define-config.test.ts` |

## Verify

```bash
make verify   # typecheck + build + unit test. Không browser, credential, mạng.
make smoke    # sinh dự án, cài từ tarball, CHẠY. Cần browser.
```

**TDD bắt buộc**: viết `*.test.ts` đỏ trước. `make verify` không thấy lỗi trong template
của scaffold — sửa template thì phải chạy `make smoke`.

## Rủi ro đang mở — biết để không lặp lại

- **Hai đường tới trí nhớ.** `platform-qc-agent` cắt preamble hội thoại của Zep trước khi
  nhét vào prompt (`_strip_preamble`, sinh ra từ sự cố thật: model trả về danh sách
  business rule thay vì JSON). Dify gọi `get_context` thẳng nên không có bảo vệ đó.
- **Xung đột luật ngôn ngữ.** Prompt agent ép trả lời tiếng Việt; convention của
  `web-first-automation` cấm hardcode text UI vì text đổi theo `LOCALE`.
- **Ba repo, ba team.** Hợp đồng phải là artifact publish được, không phải import.
- **Kit chưa publish.** Dự án sinh ra hiện phải trỏ vào tarball local.

## Đọc tiếp

| Cần biết | Đọc |
|---|---|
| Concept đầy đủ, vòng chạy, 10 phút đầu | [`ONBOARDING.md`](../../../ONBOARDING.md) |
| Dựng dự án mới, biến `.env`, project của preset | [`README.md`](../../../README.md) |
| Vì sao code có hình dạng đó | [`STRUCTURE.md`](../../../STRUCTURE.md) |
| Hợp đồng test case | [`docs/testcase-standard.md`](../../../docs/testcase-standard.md) |
| Quyết định kiến trúc + điều kiện đổi ý | [`docs/adr/`](../../../docs/adr/) |
| Nợ kỹ thuật | [`docs/TECH_DEBT.md`](../../../docs/TECH_DEBT.md) |
