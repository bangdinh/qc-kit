# Chuẩn test case

Hợp đồng mà **mọi** bên sinh và **mọi** bên tiêu thụ test case phải theo. Nguồn sự thật
là `src/contract/types.ts`; tài liệu này giải thích *vì sao* từng field tồn tại và luật
nào không được vi phạm.

Ai đọc: người viết test bằng tay, người sửa prompt của `platform-qc-agent`, người thêm
một định dạng nguồn mới.

---

## 1. Bốn nguồn, một hợp đồng

```
.feature (Gherkin)  ─┐
.spec.ts + qc.case() ─┼──► TestCase[] ──► Excel · OVERVIEW · RUN_HISTORY · failures-latest
platform-qc-agent    ─┤
CSV / nhập tay       ─┘
```

Thêm một nguồn nghĩa là viết một adapter đổ ra `TestCase[]`. **Không** nghĩa là sửa
pipeline báo cáo — nếu phải sửa, adapter đang làm sai.

## 2. Các field

### `TestStep`

| Field | Bắt buộc | Luật |
|---|---|---|
| `no` | có | Số nguyên, bắt đầu từ 1 **trong từng case** |
| `description` | có | Tester làm gì — **văn xuôi**, nguyên văn như người viết case |
| `expected` | có | Kết quả **quan sát được** của riêng bước này |

Ba field, hết. Step **không** mang hành động, màn hình hay phần tử: case viết tay trong
Excel không có ô nào cho cả ba, và suy chúng ra từ câu chữ là đoán. Xem
[`ADR-0003`](adr/0003-step-chi-con-van-xuoi.md).

Hệ quả phải nhìn thẳng: hợp đồng **không còn tự kiểm được** một step có thực thi được hay
không. Việc đó chuyển sang bước sinh script, nơi có DOM thật để đối chiếu — và nơi người
đọc kết quả biết mình đang nhìn một phán đoán.

### `TestCase`

| Field | Bắt buộc | Luật |
|---|---|---|
| `test_case_id` | có | `TC_<flow_key>_<3 số>` từ generator, hoặc `<MODULE>-<NN><a-z>` viết tay |
| `title` | có | Một dòng, kèm kết quả nếu có |
| `preconditions` | mặc định `[]` | Mỗi phần tử một chuỗi không rỗng |
| `steps` | có | Mảng `TestStep` |
| `test_data` | mặc định `{}` | Key/value tự do — chính là một dòng `Examples:` |
| `priority` | có | `High` \| `Medium` \| `Low` |
| `tags` | mặc định `[]` | `smoke`, `regression`, … |
| `source` | có | `requirement` \| `context` \| `inferred` |

### `source` — field quan trọng nhất, và hay bị bỏ qua nhất

| Giá trị | Nghĩa |
|---|---|
| `requirement` | Luật nghiệp vụ nêu thẳng trong yêu cầu người gọi đưa vào |
| `context` | Có trong project context truy hồi được |
| `inferred` | **Không ai nêu** — đây là giả định, chưa được xác nhận |

Case bịa là case **nghe hợp lý nhất** — đọc không phát hiện ra. Bắt khai nguồn biến việc
đó thành một bộ lọc chạy được: `source === 'inferred'` là hàng đợi review.

**Luật:** case `inferred` **không được** vào bộ chạy thật cho tới khi có người duyệt. Nó
vào Excel với cột `Source` để tester thấy.

## 3. `assumptions[]`

Mỗi dòng là một sự thật chưa ai nêu mà test case dựa vào. Phải phủ hết case `inferred`.

`assertGrounded()` kiểm điều này — nhưng chỉ **thô**: assumptions là văn bản tự do nên
chỉ xác minh được là *có* khai, không xác minh được từng case đã được phủ. Đó là giới
hạn thật của một kiểm tra tự động ở đây; phần còn lại là việc của người duyệt.

Tách khỏi `parseTestCaseResult()` có chủ ý: một suite thiếu assumptions vẫn **đúng hình
dạng**, chỉ là chưa đáng tin. Người import về để review thì cần nó; người đẩy vào bộ chạy
thì phải qua cổng này trước.

## 4. Dung thứ đóng gói, nghiêm với schema

`parseTestCaseResult()` nhận cả object đã parse lẫn văn bản thô, và:

- bóc ```` ```json ```` fence;
- cứu `{…}` ngoài cùng ra khỏi lời dẫn (*"Đây là các test case: {…} Bạn cần thêm gì
  không?"*) — việc cứu này **hiểu chuỗi**, nên dấu `{` nằm trong một `title` tiếng Việt
  không làm lệch việc đếm ngoặc;
- nhưng **không** nới một field nào của schema. Sai field thì từ chối, kèm đường dẫn JSON
  chính xác: `test_cases[0].steps[2].action`.

Vì sao kit phải validate khi bên sinh đã có schema: endpoint Dify thật sự gọi
(`POST /v1/test-suite/generate`) streaming và **không** validate; endpoint có validate
(`/testcases/generate`) bị tắt 503 khi provider là omni. Suite tới tay kit, ở đường phổ
biến nhất, **chưa từng được ai kiểm**.

## 5. Phần tử bị thao tác — hợp đồng KHÔNG mang

Một step nói *làm gì* và *ở màn nào*; nó không nói *phần tử nào*. Hợp đồng cố tình không
có field cho phần tử, và đây là quyết định có ADR: [`0002`](adr/0002-bo-target-khoi-hop-dong.md).

Lý do ngắn gọn: case viết tay trong Excel không có ô nào cho phần tử. Suy nó ra từ câu
chữ của step là **đoán**, và một tên phần tử đoán sẽ thành một locator đoán — thứ trông y
hệt locator thật cho tới lúc chạy.

Phần tử thật được quyết ở nơi duy nhất biết sự thật: **DOM của app đang chạy**, tại bước
sinh script (skill `gen-script`). Producer nào gửi kèm field thừa thì validator bỏ qua,
không lỗi.

## 6. Giữ khớp với bên sinh

`src/contract/types.ts` là bản của bên tiêu thụ;
`platform-qc-agent/platform_qc_agent/schemas.py` (nhánh `development`) là bản của bên
sinh. Hai bản phải khớp, và **giữ khớp bằng kiểm tra, không bằng trí nhớ**.

Lệch schema biểu hiện ra ở đây là một đống `ContractError` cùng trỏ vào một field — đọc
đường dẫn trong thông báo lỗi trước khi nghi ngờ dữ liệu.
