# Dữ liệu đo được của project RPA / board 239

> Transition đo 2026-09-03, component đo 2026-09-07. Đây là **dữ liệu**, hết hạn được — luôn
> kiểm lại bằng lệnh trước khi tin.

## Component — Web-First là `NewCoreFit`, hết

| | |
|---|---|
| Board | `239` — *RPA Q3 - NewWebFirst-NewCoreFit*, scrum, Story → Sub-task |
| Component | **`NewCoreFit`** — id `10414`, Epic `RPA-2638` *NewWebFirst - NewCoreFit* |

Tra việc dự án: `project = RPA AND component = NewCoreFit` — 466 issue, đo 2026-09-07.

Bảy component còn lại của project RPA **không** phải Web-First:

| Component | id | Là gì |
|---|---|---|
| `TechDebt-FRT-Ops` | 10415 | Luồng OKR khác — Epic `RPA-2639`, nợ kỹ thuật FRT/Ops |
| `Squad-1-Core-Infras` | 10408 | Đội — lead `chunghv4` Hoàng Văn Chung |
| `Squad-2-Application` | 10409 | Đội — lead `duynm14` Nguyễn Minh Duy |
| `Squad-3-AI-base` | 10410 | Đội — lead `minhlq21` Lê Quang Minh |
| `DiscoveryTeam` | 10411 | Đội — lead `duytp3-jira` Trịnh Phú Duy |
| `Enabling-Team` | 10412 | Đội — lead `bangdx2` Đinh Xuân Bằng |
| `K8S-Infras` | 10413 | Đội — lead `duylt27` Lưu Thanh Duy |

**Mỗi issue một component.** Đo được: 465 trong 466 issue `NewCoreFit` không mang component
nào khác, và `NewCoreFit` với `TechDebt-FRT-Ops` chưa bao giờ đi cùng nhau. Tạo issue
Web-First thì gắn `NewCoreFit` — đừng gắn thêm component đội.

Chín module tài liệu **không** có trong metadata Jira: cả 9 dùng chung `NewCoreFit`. Đó là
thiết kế, không phải thiếu sót. Đừng tạo component mới cho module.

Story mới KHÔNG tự lên board — đưa vào bằng `jira sprint <id> <KEY>`
(xem id: `jira sprints 239`).

## Tiền tố `US-` trong summary — thói quen, chưa phải quy ước

Story và Sub-task hay mở đầu summary bằng `US-<MODULE>-NN`: `US-LIVE`, `US-DEVICE`, `US-AUTH`,
`US-USR`, `US-GRP`, `US-LOC`, `US-ROLE`, `US-DEV` (đếm 2026-09-07: 87 issue có `US-`).

**Chưa chốt thành luật, và có chỗ chồng nhau** — `US-DEV` với `US-DEVICE` cùng chỉ
`05. Device`, trùng cả dãy số `01`–`05`. Nên:

- Tạo sub-task thì **bám tiền tố của story cha**, đừng đặt tiền tố mới.
- **Đừng dùng tiền tố để thống kê hay sinh scope map** — sẽ đếm sai.

## Tên transition — ĐỌC, đừng đoán

Workflow project này đặt tên **tiếng Việt**, không phải `In Progress` / `In Review` / `Done`
như mặc định Jira. Đo 2026-09-03:

| Trạng thái đang ở | `transitions` trả về |
|---|---|
| Open (sub-task) | `541 Bắt đầu task` · `551 Product Backlog khởi tạo` · `591 Reset status về Open` |
| In Progress | `441 SubTask hoàn thành` · `361 SubBug chờ review` · `561 Pending -> change` · `591 Reset status về Open` |

Danh sách **đổi theo trạng thái hiện tại**, nên luôn chạy trước khi chuyển:

```bash
bash .claude/skills/jira/jira.sh transitions RPA-1234
```

Truyền tên không có trong danh sách thì script báo lỗi và không làm gì. Đừng gõ tên theo
thói quen Jira mặc định.

## Cài lần đầu

(Bản hướng dẫn cho người: `CONTRIBUTING.md` §6.)

Token chưa có thì script báo `Chưa set FCAM_JIRA_PAT`. Repo có `.jira.env.example` — user tự
tạo PAT trên jira.fcam.vn (Profile → Personal Access Tokens) rồi tự copy và điền,
**agent không ghi token hộ**:

```bash
cp .jira.env.example ~/.jira.env && chmod 600 ~/.jira.env    # rồi điền FCAM_JIRA_PAT=
```

Kiểm tra: `bash .claude/skills/jira/jira.sh me` phải in ra tên.
