---
name: qc-concept
description: Concept va phan vai cua qc-kit trong he sinh thai QC Web-First (Dify, platform-qc-agent, agent-memory, web-first-automation) - qc-kit so huu cai gi, tuyet doi khong lam gi, va hop dong test case bat no phai co gi. Kich hoat khi bat dau lam viec trong repo qc-kit, khi hoi "qc-kit la gi", khi khong chac mot doan code thuoc repo nao, khi them package/module moi, hoac khi nhac platform-qc-agent, Dify, agent-memory, web-first-automation.
---

# qc-kit — concept và phân vai

Bản đầy đủ cho người đọc: [`ONBOARDING.md`](../../../ONBOARDING.md). Skill này là phần agent
phải tuân theo khi viết code trong repo.

## Một câu

`qc-kit` là **bộ kit QC dùng chung** (web · mobile · backend) để mỗi dự án kế thừa thay vì copy
khung — mô hình theo `b2b-gokit`. Nó trả lời **"test bằng cách nào"**, không trả lời "test cái gì"
và không trả lời "cần test những case nào".

## Năm hệ thống, năm câu hỏi

| Hệ thống | Câu hỏi nó trả lời |
|---|---|
| Dify (`b2b-agents.fcam.vn`) | Người dùng hỏi ở đâu? |
| `platform-qc-agent` (`fli-backend/core`) | Cần test những case nào? |
| `agent-memory` (Zep, MCP/SSE) | Dự án này đã biết những gì? |
| **`qc-kit`** ← repo này | **Test bằng cách nào?** |
| `web-first-automation` (gitlab `tamdt35`) | Sản phẩm này cụ thể ra sao? |

## qc-kit TUYỆT ĐỐI không làm

Bốn luật này là ranh giới, không phải gợi ý. Vi phạm một trong bốn nghĩa là code đang nằm sai repo.

1. **Không gọi LLM.** Không `anthropic`, không `claude`, không `openai`. Sinh test case là việc của
   `platform-qc-agent`.
2. **Không chứa tri thức sản phẩm.** Không locator thật, không URL, không tài khoản, không tên
   module của VMSmart. Những thứ đó thuộc `web-first-automation`.
3. **Không chứa tri thức sinh case.** Checklist các nhóm case, cách suy ra case từ requirement —
   thuộc prompt của agent.
4. **Không copy tri thức đã có chủ.** Cần thì tiêu thụ qua package hoặc qua API.

Kiểm được, chạy trước khi merge:

```bash
grep -rniE "anthropic|openai|\bclaude\b" src/ && echo "VI PHẠM luật 1"
grep -rniE "fcam\.vn|vmsmart|beta-" src/ && echo "VI PHẠM luật 2"
grep -rE "from '\.\./(pages|components|data)" src/core src/config src/utils src/types && echo "VI PHẠM luật phụ thuộc"
```

## Hợp đồng với platform-qc-agent

Agent trả `TestCaseGenerationResult`. Một step **đã là bước thực thi được**:
`{no, screen, action, target, description, expected}`.

| Schema có gì | qc-kit phải có gì |
|---|---|
| `action` enum 8 verb: `tap · input · swipe · scroll · wait · verify · navigate · select` | Bảng dịch sang Playwright — `tap→click`, `input→fill`, `verify→expect`, `navigate→goto`, `select→selectOption`, `wait→waitFor` |
| `source: requirement \| context \| inferred` + `assumptions[]` | Cổng duyệt: case `inferred` **không được** vào `.feature`, chỉ vào Excel làm hàng đợi review |
| Endpoint Dify dùng (`/v1/test-suite/generate`) không validate schema | qc-kit **tự validate lại ở cửa vào**, từ chối thẳng thay vì để case hỏng trôi tới lúc chạy |

**Chưa chốt:** `target` của agent là snake_case (`start_live_button`), còn quy ước `data-testid`
của kit là kebab-case có prefix module (`livestream-start-live-btn`). Hàm chuẩn hoá giữa hai
format **chưa được viết**. Gặp chỗ cần nó thì hỏi, đừng tự đặt ra một quy tắc mới.

## Package đang hướng tới

| Package | Vai |
|---|---|
| `@qc/contract` | JSON Schema test case · dịch step → Playwright · chuẩn hoá `target` → `data-testid` · validate cửa vào |
| `@qc/testcase` | `.feature` ↔ Excel ↔ OVERVIEW ↔ RUN_HISTORY ↔ failures-latest · cổng duyệt `inferred` |
| `@qc/bdd` | Preset `playwright-bdd` · enforce tag `@<MODULE>-NN` và `@priority-*` |
| `@qc/core` | `.env` loader · bảng môi trường · i18n VI/EN · session TTL + ghi atomic · step · logger |
| `@qc/web` · `@qc/api` | BasePage · BaseComponent · BaseApiClient · fixtures · Authenticator |
| `@qc/conventions` | Format `data-testid` · thứ tự ưu tiên locator · `npx qc init` |

Hôm nay repo mới có tầng runtime Playwright cho web; phần còn lại đang gom vào. Đừng giả định một
package đã tồn tại — kiểm tra trước.

## Thêm code thì đi đâu

| Đang thêm… | Đi đâu |
|---|---|
| Cách sinh ra một loại case mới | `platform-qc-agent` — **không phải đây** |
| Locator / URL / tài khoản của một sản phẩm | `web-first-automation` — **không phải đây** |
| Cách trình bày, xuất báo cáo test case | `@qc/testcase` trong repo này |
| Một màn hình / mảnh UI / API client làm ví dụ | `src/pages` · `src/components` · `src/api/clients` |
| Năng lực cắt ngang (dọn dữ liệu, matcher riêng) | `src/core` — phải dùng được cho **mọi** sản phẩm, nếu không thì nó không phải core |
| Một môi trường mới | một entry trong `src/config/environments.ts` |

## Rủi ro đang mở — biết để không lặp lại

- **Hai đường tới trí nhớ.** `platform-qc-agent` cắt preamble hội thoại của Zep trước khi nhét vào
  prompt (`_strip_preamble`, sinh ra từ sự cố thật: model trả về danh sách business rule thay vì
  JSON). Dify gọi `get_context` thẳng nên không có bảo vệ đó.
- **Xung đột luật ngôn ngữ.** Prompt agent ép trả lời tiếng Việt; `web-first-automation` cấm tuyệt
  đối hardcode text UI trong `.feature` vì text đổi theo `LOCALE`.
- **Ba repo, ba team.** Hợp đồng phải là artifact publish được, không phải import.

## Đọc tiếp

| Cần biết | Đọc |
|---|---|
| Concept đầy đủ, vòng chạy, 10 phút đầu | [`ONBOARDING.md`](../../../ONBOARDING.md) |
| Cách chạy suite, `.env`, project Playwright | [`README.md`](../../../README.md) |
| Vì sao code có hình dạng đó, 4 điểm nối | [`STRUCTURE.md`](../../../STRUCTURE.md) |
| Ghi việc lên Jira, bug sản phẩm vs việc của kit | `.claude/skills/jira/SKILL.md` |
| Xử lý chỗ không chắc chắn | `.claude/skills/research-and-recommend/SKILL.md` |
