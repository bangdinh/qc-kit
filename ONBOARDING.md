# qc-kit — hiểu concept trong 5 phút

Đọc file này trước khi đọc bất cứ file nào khác. Nó trả lời *vì sao repo này tồn tại* và
*nó đứng ở đâu*. [README.md](README.md) nói **cách chạy**, [STRUCTURE.md](STRUCTURE.md) nói
**vì sao code có hình dạng đó**.

---

## 1. qc-kit là gì

**Một bộ kit QC dùng chung** — phủ automation web, mobile và backend — để mỗi dự án **kế thừa**
thay vì copy khung. Mô hình lấy theo
[`b2b-gokit`](https://git.fpt.net/b2b-manager/b2b-gokit), là kit Go dùng chung của team backend B2B.

Nó **không phải**:

- không phải bộ test của một sản phẩm cụ thể — không chứa locator, URL hay tài khoản của ai;
- không phải công cụ sinh test case — nó không gọi LLM, một dòng `anthropic` trong repo này là sai vai;
- không phải một framework nguyên khối — nó là các package lắp ghép, mỗi dự án lấy đúng phần cần.

Hôm nay repo mới có tầng runtime Playwright cho web. Phần còn lại đang được gom vào.

## 2. Câu hỏi mà qc-kit trả lời

Có năm hệ thống trong bức tranh QC của Web-First, mỗi cái trả lời đúng một câu hỏi:

| Hệ thống | Câu hỏi | Ở đâu |
|---|---|---|
| **Dify** | *Người dùng hỏi ở đâu?* | `b2b-agents.fcam.vn` |
| **platform-qc-agent** | *Cần test những case nào?* | `git.fpt.net/fli-backend/core` |
| **agent-memory** | *Dự án này đã biết những gì?* | Zep, gọi qua MCP/SSE |
| **qc-kit** | *Test bằng cách nào?* | ← **repo này** |
| **web-first-automation** | *Sản phẩm này cụ thể ra sao?* | gitlab `tamdt35` |

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
     qc-kit          ← .feature ↔ Excel ↔ runtime ↔ report
        │
        ▼
 web-first-automation   ← locator, URL, tài khoản
        │
        ▼
   result.json ──────────► agent-memory   (case nào flaky, bug nào đã xác nhận)
```

Hai phép thử để biết ranh giới bị rò:

- Sản phẩm đổi mà phải sửa `qc-kit` → **rò**. Cái đó thuộc `web-first-automation`.
- Thêm một *loại* case mới mà phải sửa `qc-kit` → **rò**. Cái đó thuộc `platform-qc-agent`.

## 3. Ý tưởng kiến trúc cốt lõi

Mọi dòng trong `src/` thuộc về một trong hai loại, và toàn bộ thiết kế đi ra từ việc giữ chúng
tách bạch:

| | **Tri thức framework** | **Tri thức sản phẩm** |
|---|---|---|
| Trả lời | *Chúng ta test như thế nào?* | *Chúng ta đang test cái gì?* |
| Ví dụ | step ghi vào report ra sao, session cache thế nào | `beta` trỏ URL nào, nút submit ghi chữ gì |
| Nằm ở | `src/config`, `src/core`, `src/utils`, `src/api/clients/base.client.ts` | `src/pages`, `src/components`, `src/data`, `tests/` |

**Phụ thuộc chỉ chảy một chiều. Code framework không bao giờ import code sản phẩm.** Kiểm được:

```bash
grep -rE "from '\.\./(pages|components|data)" src/core src/config src/utils src/types
```

In ra dòng nào là vi phạm dòng đó. Chi tiết đầy đủ: [STRUCTURE.md](STRUCTURE.md).

## 4. Hợp đồng với platform-qc-agent

Đây là phần mới, và nó quyết định `qc-kit` phải có gì. Agent trả về `TestCaseGenerationResult`,
trong đó một step **đã là bước thực thi được**, không còn là văn xuôi:

```json
{ "no": 1, "screen": "livestream_setup", "action": "tap",
  "target": "start_live_button", "description": "...", "expected": "..." }
```

Ba thuộc tính của schema đó ép ra ba thứ:

| Schema có gì | qc-kit phải có gì |
|---|---|
| `action` là enum 8 verb (`tap · input · swipe · scroll · wait · verify · navigate · select`) | Bảng dịch sang Playwright: `tap→click`, `input→fill`, `verify→expect`, `navigate→goto`, `select→selectOption` |
| `source: requirement \| context \| inferred` + `assumptions[]` | **Cổng duyệt**: case `inferred` không được vào `.feature`, nó vào Excel làm hàng đợi review |
| Endpoint Dify đang dùng (`/v1/test-suite/generate`) **không** validate schema | qc-kit **tự validate lại ở cửa vào** — không tin output |

⚠️ `target: start_live_button` **chưa khớp** format `data-testid` của kit
(`livestream-start-live-btn`). Cần một hàm chuẩn hoá, và nó chưa được viết.

## 5. Luật vàng khi thêm code

> **Mỗi tri thức có đúng một chủ. Ai cần thì tiêu thụ, tuyệt đối không copy.**

Bảy chỗ đang chồng chéo giữa ba repo đều trùng nhau vì đã copy. Trước khi thêm một file, hỏi
xem tri thức đó đã có chủ chưa.

| Bạn đang thêm… | Đi đâu |
|---|---|
| Một màn hình, một mảnh UI, một API resource | `src/pages` / `src/components` / `src/api/clients` — nhưng nếu là locator **của một sản phẩm**, nó thuộc repo sản phẩm |
| Cách sinh ra một loại case mới | `platform-qc-agent`, không phải đây |
| Cách trình bày / xuất báo cáo test case | `@qc/testcase` trong repo này |
| Một năng lực cắt ngang (dọn dữ liệu, matcher riêng) | `src/core` — phải dùng được cho **mọi** sản phẩm, nếu không thì nó không phải core |

## 6. Đọc tiếp ở đâu

| Cần biết | Đọc |
|---|---|
| Cách chạy suite, `.env`, project của Playwright | [README.md](README.md) |
| Vì sao code có hình dạng đó, 4 điểm nối, luồng thực thi | [STRUCTURE.md](STRUCTURE.md) |
| Test nào đặt thư mục nào | [tests/README.md](tests/README.md) |
| Ghi việc lên Jira, phân biệt bug sản phẩm với việc của kit | `.claude/skills/jira/SKILL.md` |
| Cách xử lý chỗ không chắc chắn | `.claude/skills/research-and-recommend/SKILL.md` |
| Bức tranh tổng quan — sơ đồ vòng chạy, phân vai, lộ trình | [docs/vong-khep-kin-qc.html](docs/vong-khep-kin-qc.html) — mở bằng browser |
| Luật cho agent khi viết code trong repo | `.claude/skills/qc-concept/SKILL.md` |

## 7. Mười phút đầu tiên

```bash
npm install
npm run install:browsers
cp .env.example .env          # điền COMPANY_CODE + tài khoản test
npm run typecheck             # không in gì là đạt
npx playwright test --list    # xem test nào thuộc project nào
```

Thiếu tài khoản trong `.env` thì suite vẫn chạy — test cần đăng nhập tự skip kèm thông báo nói
rõ đang thiếu biến nào.
