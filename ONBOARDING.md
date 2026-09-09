# qc-kit — hiểu concept trong 5 phút

Đọc file này trước khi đọc bất cứ file nào khác. Nó trả lời *vì sao repo này tồn tại* và
*nó đứng ở đâu*. [README.md](README.md) nói **cách dùng**, [STRUCTURE.md](STRUCTURE.md)
nói **vì sao code có hình dạng đó**.

---

## 1. qc-kit là gì

**Một bộ kit QC dùng chung** — phủ automation web, mobile và backend — để mỗi dự án **kế
thừa** thay vì copy khung. Mô hình lấy theo
[`b2b-gokit`](https://git.fpt.net/b2b-manager/b2b-gokit), là kit Go dùng chung của team
backend B2B.

Nó **không phải**:

- không phải bộ test của một sản phẩm — `src/` không có một dòng nào biết locator, URL hay
  tài khoản của ai; ví dụ nằm ở `cmd/scaffold/templates/`;
- không phải công cụ sinh test case — nó không gọi LLM, một dòng `anthropic` ở đây là sai vai;
- không phải framework nguyên khối — là các mảnh lắp ghép, mỗi dự án lấy đúng phần cần.

Hôm nay đã có: tầng runtime Playwright cho web, hợp đồng test case, và generator dựng dự
án mới. Chưa có: pipeline báo cáo Excel, adapter Gherkin, mobile.

## 2. Câu hỏi mà qc-kit trả lời

Năm hệ thống trong bức tranh QC của Web-First, mỗi cái trả lời đúng một câu hỏi:

| Hệ thống | Câu hỏi | Ở đâu |
|---|---|---|
| **Dify** | *Người dùng hỏi ở đâu?* | `b2b-agents.fcam.vn` |
| **platform-qc-agent** | *Cần test những case nào?* | `git.fpt.net/fli-backend/core` |
| **agent-memory** | *Dự án này đã biết những gì?* | Zep, gọi qua MCP/SSE |
| **qc-kit** | *Test bằng cách nào?* | ← **repo này** |
| **web-first-automation** | *Sản phẩm này cụ thể ra sao?* | gitlab `tamdt35` — chỉ là **một** consumer |

Vòng chạy:

```
SRS (SharePoint) · Figma · app thật
        │
        ▼
      Dify  ──────────────► agent-memory
        │                        ▲
        ▼                        │
  platform-qc-agent ─────────────┘   (sinh test case, có grounding)
        │
        │  hợp đồng: TestCaseGenerationResult
        ▼
     qc-kit          ← runtime · hợp đồng · scaffold
        │
        ▼
  dự án automation   ← locator, URL, tài khoản  (web-first-automation là một trong số đó)
        │
        ▼
   result.json ──────────► agent-memory   (case nào flaky, bug nào đã xác nhận)
```

Hai phép thử để biết ranh giới bị rò:

- Sản phẩm đổi mà phải sửa `qc-kit` → **rò**. Cái đó thuộc dự án sản phẩm.
- Thêm một *loại* case mới mà phải sửa `qc-kit` → **rò**. Cái đó thuộc `platform-qc-agent`.

## 3. Ý tưởng kiến trúc cốt lõi

Toàn bộ thiết kế đi ra từ việc tách hai loại tri thức:

| | **Tri thức framework** | **Tri thức sản phẩm** |
|---|---|---|
| Trả lời | *Chúng ta test như thế nào?* | *Chúng ta đang test cái gì?* |
| Ví dụ | step ghi vào report ra sao, session cache thế nào | `beta` trỏ URL nào, nút submit ghi chữ gì |
| Nằm ở | **`src/` của repo này** | **dự án tiêu thụ** — kit chỉ giữ bản mẫu ở `cmd/scaffold/templates/` |

Ranh giới đó kiểm được, và đáng chạy trước mỗi lần merge:

```bash
grep -rniE "fcam\.vn|vmsmart|beta-" src/ cmd/
```

In ra dòng nào là vi phạm dòng đó. Chi tiết đầy đủ: [STRUCTURE.md](STRUCTURE.md).

## 4. Hợp đồng với platform-qc-agent

Agent trả về `TestCaseGenerationResult`, trong đó một step **đã là bước thực thi được**,
không còn là văn xuôi:

```json
{ "no": 1, "screen": "livestream_setup", "action": "tap",
  "target": "start_live_button", "description": "...", "expected": "..." }
```

Ba thuộc tính của schema đó ép ra ba thứ:

| Schema có gì | qc-kit phải có gì |
|---|---|
| `action` là enum 8 verb (`tap · input · swipe · scroll · wait · verify · navigate · select`) | `translateAction()` — `tap→click`, `input→fill`, `verify→expect`, `navigate→goto`, `select→selectOption`, `wait→waitFor`. `swipe`/`scroll` khai rõ là **cần handler riêng** |
| `source: requirement \| context \| inferred` + `assumptions[]` | `assertGrounded()` — case `inferred` là giả định chưa ai xác nhận, phải qua review |
| Endpoint Dify đang dùng (`/v1/test-suite/generate`) **không** validate schema | `parseTestCaseResult()` — dung thứ đóng gói, nghiêm với schema, lỗi kèm đường dẫn JSON |

⚠️ `target: start_live_button` chưa khớp format `data-testid` của kit
(`livestream-start-live-btn`). `toTestId()` làm việc chuẩn hoá đó, và module prefix là một
**heuristic** — override được khi tên màn hình không phải tên module.

## 5. Luật vàng khi thêm code

> **Mỗi tri thức có đúng một chủ. Ai cần thì tiêu thụ, tuyệt đối không copy.**

| Bạn đang thêm… | Đi đâu |
|---|---|
| Cách sinh ra một loại case mới | `platform-qc-agent` — không phải đây |
| Locator / URL / tài khoản của một sản phẩm | Dự án sản phẩm — không phải đây |
| Một page object, component, API client **mẫu** | `cmd/scaffold/templates/` |
| Cách trình bày, xuất báo cáo test case | `src/report/` (chưa có, xem lộ trình) |
| Năng lực cắt ngang (dọn dữ liệu, matcher riêng) | `src/core/` — phải dùng được cho **mọi** sản phẩm, nếu không thì nó không phải core |

## 6. Đọc tiếp ở đâu

| Cần biết | Đọc |
|---|---|
| Dựng dự án mới, biến `.env`, các project của preset | [README.md](README.md) |
| Vì sao code có hình dạng đó, các điểm nối | [STRUCTURE.md](STRUCTURE.md) |
| Hợp đồng test case | [docs/testcase-standard.md](docs/testcase-standard.md) |
| Quyết định kiến trúc và điều kiện đổi ý | [docs/adr/](docs/adr/) |
| Nợ kỹ thuật đã biết | [docs/TECH_DEBT.md](docs/TECH_DEBT.md) |
| Bức tranh tổng quan — sơ đồ, phân vai, lộ trình | [docs/vong-khep-kin-qc.html](docs/vong-khep-kin-qc.html) |
| Ghi việc lên Jira, bug sản phẩm vs việc của kit | `.claude/skills/jira/SKILL.md` |
| Luật cho agent khi viết code trong repo | `.claude/skills/qc-concept/SKILL.md` |
| Cách xử lý chỗ không chắc chắn | `.claude/skills/research-and-recommend/SKILL.md` |

## 7. Mười phút đầu tiên

**Muốn dùng kit** — dựng một dự án rồi chạy nó:

```bash
make new NAME=thu-nghiem OUT=/tmp/thu-nghiem
cd /tmp/thu-nghiem && npm install && npm run install:browsers
```

**Muốn sửa kit** — chạy đúng một lệnh:

```bash
npm install
make verify      # typecheck + build + unit test. Không browser, không credential, không mạng.
make smoke       # nghiệm thu thật: sinh dự án, cài từ tarball, chạy. Cần browser.
```

`make` không tham số liệt kê hết lệnh. Và nhớ: **TDD là bắt buộc** — viết `*.test.ts` đỏ
trước rồi mới code.
