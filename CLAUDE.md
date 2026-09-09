# CLAUDE.md

Hướng dẫn cho Claude Code trong repo này. **Giữ file này gọn** — nó nạp vào mọi prompt.
Chi tiết để trong `docs/`, hành vi để trong skills. Ở đây chỉ những fact chặn đoán sai.

## Đây là cái gì

`qc-kit` = kit QC dùng chung cho automation **web · mobile · backend**. Mỗi dự án kế
thừa thay vì copy khung — mô hình theo `b2b-gokit`. Nó trả lời **"test bằng cách nào"**;
không trả lời "test cái gì" (đó là dự án sản phẩm) và không trả lời "cần test những case
nào" (đó là `platform-qc-agent`).

Concept đầy đủ: [`ONBOARDING.md`](ONBOARDING.md). Quyết định kiến trúc:
[`docs/adr/0001`](docs/adr/0001-kien-truc-qc-kit.md).

## Bốn luật — vi phạm nghĩa là code đang nằm sai repo

1. **Không gọi LLM.** Không `anthropic`, `openai`, `claude`. Sinh test case là việc của
   `platform-qc-agent`.
2. **Không chứa tri thức sản phẩm.** Không locator thật, URL, tài khoản, tên module của
   một sản phẩm cụ thể.
3. **Không chứa tri thức sinh case.** Checklist các nhóm case, cách suy case từ
   requirement — thuộc prompt của agent.
4. **Phụ thuộc chảy một chiều.** `config` · `contract` · `util` · `types` không bao giờ
   import `pages` · `components` · `data`.

```bash
# 1 — dò import và dependency, KHÔNG dò chữ trong comment: `validate.ts` nhắc
# "OpenAI envelope" khi mô tả định dạng upstream, đó không phải vi phạm.
grep -rE "from ['\"](@anthropic-ai/|openai|langchain)" src/ && echo "VI PHẠM 1"

# 2 — loại trừ ba file đang mang nợ sản phẩm (docs/TECH_DEBT.md #1). Check này bắt
# vi phạm MỚI. Dọn xong nợ thì bỏ --exclude đi.
grep -rniE "fcam\.vn|vmsmart" src/ \
  --exclude=environments.ts --exclude=LoginPage.ts --exclude=credentials.ts && echo "VI PHẠM 2"

grep -rE "from '\.\./(pages|components|data)" src/core src/config src/contract src/utils src/types && echo "VI PHẠM 4"
```

## Verify — một phát, không chạy lẻ từng file

```bash
make verify         # = npm run verify: typecheck + build + unit test.
                    # Không browser, không credential, không mạng.
make new NAME=x     # sinh dự án automation mới; `make` không tham số liệt kê hết lệnh
```

Luôn nối sửa → verify bằng `&&`. Test đơn vị chạy bằng **chính Playwright runner** qua
project `unit` (`testDir: './src'`, `testMatch: *.test.ts`) — repo này **không** có
runner thứ hai, đừng thêm vitest/jest.

## Nền tảng là source

- **Tìm trước khi viết.** Đã có `contract.*`, `config.*`, `BaseUiObject`, `BasePage`,
  `BaseComponent`, `BaseApiClient`, `logger`, `step`, `session`. Dựng lại thứ đã có là
  một defect.
- **Không bịa.** Helper/signature/hành vi không có trong source và không chắc thì đọc
  code. Thật sự chưa có thì nói chưa có và đề xuất thêm — đừng vờ như nó tồn tại.
- **Pattern mới cần cơ sở.** Neo vào một spec hoặc thư viện đang được duy trì, trích dẫn
  trong ADR. Không cargo-cult.

## Quy ước — không thương lượng, đừng suy lại

- **TDD**: viết `*.test.ts` đỏ trước. Đỏ → xanh → refactor → commit.
- **Hợp đồng test case**: `src/contract/types.ts` là nguồn sự thật; luật ở
  [`docs/testcase-standard.md`](docs/testcase-standard.md). Đổi nó là đổi hợp đồng công
  khai — cần ADR.
- **Validate đầu vào**: dung thứ đóng gói (fence, lời dẫn), nghiêm với schema. Lỗi phải
  kèm đường dẫn JSON.
- **Mô hình viết test mặc định**: spec + page object. Gherkin là adapter opt-in, không
  phải đường mặc định.
- **Một package**: `qc-kit` với subpath export, một version. Không tách `@qc/*`.
  Dependency nặng khai `peerDependenciesMeta.optional`.
- **Step**: mọi method public của page object và component bọc thân hàm trong
  `this.step(...)`.
- **Locator**: `data-testid` là đích; chưa có thì theo thứ tự ưu tiên trong
  `docs/`. Tuyệt đối không XPath.
- **Chờ**: dựa vào auto-waiting và web-first assertion. `page.waitForTimeout` không được
  xuất hiện trong code đã commit.
- **Secret**: chỉ trong `.env` / `.jira.env` / secret CI. Không bao giờ commit.
- **Đổi public API thì đổi docs**, và thêm ADR cho quyết định khó lùi.

## Git — đề xuất, đừng tự chạy

**Không tự `git commit` hay `git push`.** Đề xuất lệnh chính xác (tên nhánh, message đầy
đủ) để user tự chạy — kể cả khi việc "rõ ràng cần commit". Sửa và stage file thì được.
User hay làm song song, nên: kiểm `git status` trước khi đụng index, và **không bao giờ**
`git add -A` — add đúng file.

Thứ tự làm việc: **sub-task → nhánh → code → cập nhật sub-task → commit → MR →
transition** (xem skill `jira`).

## Bẫy của repo

- `src/config/define-config.ts` là JSDoc dày: chuỗi có `*/` trong comment sẽ đóng comment
  sớm và làm hỏng cả file config. Đã dính một lần với `**/*.test.ts`.
- `.env` trống nghĩa là *"dùng mặc định"*, không phải *"chuỗi rỗng"* — `env.ts` cố tình
  coi giá trị rỗng là vắng mặt.
- Session cache ghi atomic (temp + rename). Đừng đổi thành ghi thẳng: worker khác đang
  đọc sẽ trúng file JSON dở.

## Skills (tự áp dụng theo `description`)

Mỗi skill giữ một phạm vi, đừng lấn sang nhau. Tuân theo skill là đủ, không cần đọc lại
tài liệu gốc.

- **qc-concept** — qc-kit đứng ở đâu, sở hữu gì, cấm gì.
- **jira** — ghi việc lên Jira, phân biệt bug sản phẩm với việc của kit.
- **research-and-recommend** — xử lý chỗ không chắc chắn: hỏi, đọc nguồn uy tín, rồi đề xuất.
