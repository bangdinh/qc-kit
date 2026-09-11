# ADR-0003: Step chỉ còn văn xuôi — bỏ `screen` và `action`

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** taipham
- **Related:** [ADR-0001](0001-kien-truc-qc-kit.md) · [ADR-0002](0002-bo-target-khoi-hop-dong.md) ·
  `src/contract/types.ts` · `src/contract/from-excel.ts` · skill `gen-script`

## Context

[ADR-0002](0002-bo-target-khoi-hop-dong.md) bỏ `target` vì Excel viết tay không có nguồn
cho nó. Hai field còn lại của `TestStep` mắc **cùng một bệnh**, và một file thật làm nó lộ
ra: `Manage_TestCase_v1.0.0.json`, case `Manage_TC_001`, cả **5/5 step** có
`screen: ""` và `action: ""`.

| Field | Kit lấy từ đâu | Vấn đề |
|---|---|---|
| `screen` | cột `Component ref` trong Excel | Đội không điền thì rỗng. Không có nguồn nào khác |
| `action` | bảng `DEFAULT_VERBS` khớp đầu câu step | Có nguồn, nhưng là **suy đoán từ câu chữ** |

`action` khác `screen` ở chỗ nó suy được khá tốt — chạy `DEFAULT_VERBS` trên đúng file
trên dịch sạch 5/5 (`Chọn tab Quản lý` → `select`, `Kiểm tra button Thêm nhân viên` →
`verify`). Nhưng "khá tốt" là đặc điểm của một phán đoán, không phải của một hợp đồng.
Một verb suy sai không báo lỗi ở đâu cả: nó thành một lời gọi Playwright sai, nằm trong
một step trông hoàn toàn bình thường.

Sức ép thứ hai: hợp đồng đang **giả vờ biết** ba thứ nó không biết. `screen`, `action`,
`target` đứng cạnh nhau trong cùng một object, đọc như dữ liệu đã được xác nhận. Bộ sinh
script vì thế tin chúng — và đó đúng là chỗ lỗi đi vào.

## Decision

`TestStep` rút về **ba field**: `no`, `description`, `expected`.

Bỏ, cùng với mọi thứ dựng trên hai field kia:

| Bỏ | Vì |
|---|---|
| `TestStep.screen`, `TestStep.action` | Không có nguồn trung thực trong Excel viết tay |
| `STEP_ACTIONS`, `StepAction` | Không còn field nào mang verb |
| `translateAction()` và `src/contract/translate.ts` | Mất đầu vào duy nhất |
| `DEFAULT_VERBS`, `VerbRule`, `ImportOptions.verbs` | Chính là bảng suy đoán cần loại |
| `HeaderLabels.screenRef` | Cột `Component ref` không còn đích để ánh xạ |
| `ImportReport.untranslatedLines` | Không còn khái niệm "dòng không dịch được verb" |

Validator **không** từ chối đầu vào còn mang ba field cũ — chúng bị bỏ qua, để suite cũ và
`platform-qc-agent` chưa kịp đổi vẫn đi qua được.

Việc đọc hành động ra từ `description` chuyển sang skill `gen-script`, kèm hai ràng buộc
để phán đoán đó không tàng hình:

1. Mỗi step sinh ra **một** lời gọi method, và giữ **nguyên văn** `description` trong
   comment ngay trên nó — người review đối chiếu được mà không mở Excel.
2. Câu không đọc ra được hành động thì **bỏ case và trích nguyên văn câu đó**, không đoán.

## Consequences

**Được**

- Hợp đồng chỉ còn những gì nó thật sự biết. Không còn field nào mời gọi việc tin vào một
  suy đoán.
- File Excel thiếu cột `Component ref` — trường hợp phổ biến — không còn sinh ra case hỏng.
- Phán đoán về hành động vẫn xảy ra, nhưng ở một chỗ **có DOM thật để đối chiếu** và có
  người đọc kết quả.

**Mất**

- **Đây là thay đổi lớn nhất từ trước tới nay của hợp đồng.** Nguyên tắc "một step phải
  thực thi được, không phải văn xuôi" của [ADR-0001](0001-kien-truc-qc-kit.md) bị đảo
  ngược. Step giờ **là** văn xuôi.
- Mất kiểm tra tự động cuối cùng về tính thực thi được. Trước đây verb lạ chết ở validator;
  giờ một câu vô nghĩa chỉ bị bắt nếu bộ sinh script chịu khó báo.
- Mất `translateAction()` — API công khai, có test riêng.
- **Breaking với `platform-qc-agent`.** Bên đó vẫn sinh `screen` và `action` enum;
  `docs/testcase-standard.md` mục 6 yêu cầu hai bản schema khớp nhau, và độ lệch giờ là
  ba field. Phải báo cho phía agent.
- Skill `testcase-standard` mất phần lớn nội dung — mục "tám verb" từng là trung tâm của
  nó. Còn lại `source`, id, priority, và cách viết `description`.
- Gom case theo màn hình không còn khoá. `gen-script` phải suy từ `title`/`preconditions`,
  và phải nói ra cách nó gom.

## Đổi ý nếu

- File Excel của các đội thêm cột thật cho màn hình và cho hành động, được điền nghiêm
  túc. Khi đó hai field này có nguồn và nên quay lại — nhưng phải quay lại như field
  **bắt buộc có nguồn**, không phải field trích từ regex đầu câu.
- Hoặc: `platform-qc-agent` thành producer chính và Excel viết tay biến mất. Agent sinh
  được cả ba field một cách có căn cứ, và lúc đó hợp đồng nên nhận lại chúng.
- Hoặc: tỉ lệ case bị bỏ vì "không đọc ra hành động" cao tới mức việc sinh script không
  còn tiết kiệm được gì so với viết tay. Đó là dấu hiệu phán đoán đã bị đẩy đi quá xa.
