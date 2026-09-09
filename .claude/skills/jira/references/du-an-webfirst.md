# Web-First — hiểu nhanh dự án

Đọc file này trước khi làm bất cứ việc gì trên Jira của Web-First. Mọi con số ở đây là
**đo được**, kèm ngày đo — dữ liệu hết hạn được, luôn kiểm lại bằng lệnh trước khi tin.

## 1. Web-First là gì

Nền tảng B2B giám sát camera, gồm **năm repo**. `Service:` trong chữ ký description là
repo chứa commit của việc đó, lấy đúng bằng `basename $(git rev-parse --show-toplevel)`.

| Repo | Là gì | Module tài liệu |
|---|---|---|
| `camera-ai-platform` | FE monorepo — web (Next.js 15), mobile (Expo 53), desktop (Electron 31) | tất cả |
| `iam-v2` | Định danh & xác thực, nền Keycloak. **Không** giữ role/scope nghiệp vụ | `02. IAM` |
| `brm-v2` | Authorization store toàn hệ thống + cây tài nguyên (hexagonal + CQRS) | `09. BRM` |
| `devicemanagement` | Thiết bị / camera / gateway (VMSmart B2B) | `05. Device` |
| `proxy-smtp` | Cầu SMTP sang NES API | `07. Alert & Notification` |

Backend **không** nằm trong `camera-ai-platform` — đó là monorepo FE. Đừng ghi
`Service: camera-ai-platform` cho một commit BE.

## 2. Jira ở đâu

| | |
|---|---|
| Instance | `https://jira.fcam.vn`, Jira **Data Center** (không phải Cloud) |
| Project | `RPA` — tên thật là **VMSmart-WinTheBase** |
| Board | `239` — *RPA Q3 - NewWebFirst-NewCoreFit*, scrum |
| Component | **`NewCoreFit`** (id 10414), Epic `RPA-2638` |

Tra việc dự án: `project = RPA AND component = NewCoreFit`. Bảy component khác của
project RPA **không** phải Web-First — chi tiết ở `jira-project.md`.

Web-First vẫn nằm trong dự án VMSmart, chỉ là nhánh mới. VMSmart cũ rải ở các project
riêng: `VMS` (FPT VMSMART B2B-2025), `BDD`, `BDL`, `NVR`.

## 3. Mô hình làm việc — ba quy tắc chi phối mọi thứ

**a) Story thuộc owner dự án, sub-task thuộc member.**
Member tạo sub-task và đánh điểm **trên sub-task**. Point đặt trên Story/Task là đặt sai
chỗ: nó không được cộng vào effort của ai. Đo 2026-09-08 trên board 239 — 9 issue cha
đang mang 50h, riêng một người gánh 32h từ 4 story.

**b) Ticket Point = giờ.** `customfield_10301`, quy ước **1 point = 1 giờ** (design +
code + test + doc). **Sub-task tối đa 8h** — `jira.sh point` tự chặn. Ước ra >8h nghĩa
là sub-task quá to, phải tách. Point dùng để đánh giá năng lực member nên **bịa số là
làm hỏng dữ liệu cả team**; không đủ thông tin thì HỎI, để trống còn thấy được.

**c) Mỗi sáng dev tạo sub-task cho việc trong ngày.**
Thứ tự: **sub-task → nhánh → code → cập nhật sub-task → commit → MR → transition**.
Dev tự tạo cho mình (đo 14 ngày: 179/182 sub-task). Làm xong mà lệch thì sửa lại
description và point — nội dung lúc tạo là dự định.

## 4. Nhiều sprint active song song = nhiều team nhỏ

Board 239 chạy **nhiều sprint active cùng lúc**, mỗi sprint là một team. Đo 2026-09-09:

| Sprint | Team |
|---|---|
| `395` Control SP 02 \| IAM - BRM | control plane |
| `396` Control \| DVM Wave 0 | control plane |
| `398` Media \| Livestream & Playback | media plane |

Nên khi tra việc phải nói rõ đang hỏi **sprint nào**, không chỉ "board 239". Story mới
KHÔNG tự lên board — đưa vào bằng `jira sprint <id> <KEY>` (xem id: `jira sprints 239`).

## 5. Năm chỗ số liệu Jira dễ hiểu sai — đều đo được

Đây là phần tốn thời gian nhất nếu phải tự phát hiện lại.

**a) Board đo bằng Story Points, team chấm Ticket Point.**
`board/239/configuration` trả `estimation.field = customfield_10111` (Story Points),
trong khi team chấm `customfield_10301` ở cấp sub-task. Mọi biểu đồ mặc định của Jira
đang đo sai field.

**b) Burndown của Jira bỏ sót sub-task.** Endpoint Greenhopper chỉ phát sự kiện cho
card trên board; sprint 385 có 68 issue nhưng chart chỉ thấy 28 — 53 sub-task mang toàn
bộ point không phải card.

**c) `Ready for Sprint` mang `statusCategory = done`** nhưng nghĩa thật là *chưa làm*.
Đếm "đã xong" theo statusCategory sẽ tính nhầm.

**d) JQL `DURING` với ngày trần lấn sang hết ngày cuối.**
`DURING ("2026-09-07","2026-09-08")` trả 64 issue; `DURING ("2026-09-07 00:00","2026-09-08 00:00")`
trả 35. Phải ghi kèm giờ.

**e) Tên transition là tiếng Việt và đổi theo trạng thái hiện tại.**
Không có `In Progress` / `Done` như mặc định Jira. **Luôn** chạy
`jira transitions <KEY>` trước khi chuyển, đừng gõ theo thói quen.

## 6. Công cụ

| | |
|---|---|
| `.claude/skills/jira/jira.sh` | 19 lệnh CLI (xem `references/lenh.md`). Có 7 bản phải sync — xem mục cuối `SKILL.md` |
| `pm-agent/dashboard` | Web quản trị board: standup theo người, effort, burndown theo Ticket Point, sức khoẻ sprint. `node server.mjs` |

## 7. Cài lần đầu

Token là **Personal Access Token** gắn với instance, dùng chung cho mọi project trên
jira.fcam.vn. Tạo tại jira.fcam.vn → Profile → Personal Access Tokens, rồi:

```bash
cp .jira.env.example ~/.jira.env && chmod 600 ~/.jira.env   # rồi tự điền FCAM_JIRA_PAT=
bash .claude/skills/jira/jira.sh me                          # phải in ra tên
```

**Agent không ghi token hộ.** Không commit `.jira.env`. Không in `$FCAM_JIRA_PAT` ra
bất cứ đâu, kể cả khi debug.
