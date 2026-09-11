# ADR-0002: Bỏ `target` khỏi hợp đồng test case

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** taipham
- **Related:** [ADR-0001](0001-kien-truc-qc-kit.md) · `src/contract/types.ts` ·
  `src/contract/from-excel.ts` · `docs/testcase-standard.md` · skill `gen-script`

## Context

`TestStep` có field `target: string` — định danh snake_case của phần tử bị thao tác
(`start_live_button`). Nó tồn tại vì `platform-qc-agent` sinh ra được field đó, và vì kit
có `toTestId(screen, target)` đổi nó sang format `data-testid` của kit.

Cửa vào thứ hai của hợp đồng là **Excel viết tay**, và ở đó `target` không có nguồn:

- File Excel của các đội **không có cột nào** cho phần tử. Nó chỉ có `Steps` — văn xuôi.
- `from-excel.ts` vì thế đoán: `extractTarget()` lấy chuỗi trong ngoặc kép của câu step
  (`Click nút "Xác nhận"` → `xac_nhan`). Câu nào không có ngoặc kép thì trả rỗng và ghi
  một dòng vào `issues`.
- `validate.ts` lại từ chối chuỗi rỗng. **Kit tự mâu thuẫn**: converter của nó sinh ra
  output mà validator của chính nó không nhận.

Đo trên file thật (`Device_Management_TestCase_v1.0.0.json`, 1 case, 4 step): 3/4 step có
`target` rỗng vì chúng là câu điều hướng không có ngoặc kép. Suite dừng ngay ở
`test_cases[0].steps[0].target`.

Sức ép sâu hơn nằm ở chỗ khác. `target` là một **định danh nghe như locator**, và nó nằm
ngay cạnh `screen` trong cùng một object. Người đọc — và bộ sinh script — rất dễ coi nó
là đầu vào để dựng selector. Nhưng nó không phải: nó là tên tiếng Việt viết lại. Một tên
đoán từ câu chữ sẽ thành một locator đoán, và locator đoán trông y hệt locator thật cho
tới lúc chạy.

## Decision

Bỏ `target` khỏi `TestStep`, và bỏ luôn mọi thứ dựng trên nó:

| Bỏ | Vì |
|---|---|
| `TestStep.target` | Không producer nào điền được một cách trung thực |
| `readString(raw.target, …)` trong `validate.ts` | Field không còn |
| `extractTarget()` trong `from-excel.ts` | Chính là bước đoán cần loại |
| `toTestId(screen, target)` và `src/contract/testid.ts` | Mất đầu vào duy nhất |

Một step từ nay chỉ nói **làm gì** (`action`) và **ở màn nào** (`screen`). Phần tử nào bị
thao tác được quyết ở nơi duy nhất biết sự thật: **DOM của app đang chạy**, tại bước sinh
script (skill `gen-script`).

Validator **không** từ chối đầu vào còn mang `target` — field thừa bị bỏ qua, để suite cũ
và `platform-qc-agent` chưa kịp đổi vẫn đi qua được.

## Consequences

**Được**

- Hết mâu thuẫn nội bộ: output của `from-excel.ts` qua được `validate.ts`.
- Hợp đồng không còn field nào mời gọi việc đoán locator. Ranh giới "case nói ý định, DOM
  nói phần tử" thành thứ **cấu trúc dữ liệu ép buộc**, không còn là một dòng dặn dò.
- Excel viết tay lên thẳng hợp đồng mà không phải thêm cột nào.

**Mất**

- **Breaking change với `platform-qc-agent`.** Bên sinh vẫn có `target` trong
  `schemas.py`; `docs/testcase-standard.md` mục 6 yêu cầu hai bản khớp nhau, và từ đây
  chúng lệch. Phải báo cho phía agent.
- Mất `toTestId()` — hàm public, có test riêng. Đội nào đang gọi nó để lập phiếu xin
  `data-testid` phải tự đặt tên theo quy ước dự án.
- `from-excel.ts` không còn báo "step thiếu target" trong `issues`. Tín hiệu "case này
  chưa đủ dữ kiện" giờ mỏng hơn một chút.
- **Chưa giải quyết hết:** `expected` vẫn bị `validate.ts` bắt buộc không rỗng, trong khi
  `from-excel.ts` cố ý để trống cho mọi step trừ bước cuối. File Excel nhiều bước vì thế
  vẫn trượt validator, chỉ là trượt ở `steps[0].expected` thay vì `steps[0].target`.
  Đây là cùng một loại mâu thuẫn, chưa chốt cách xử lý.

## Đổi ý nếu

- `platform-qc-agent` trở thành producer chính và Excel viết tay biến mất. Khi đó `target`
  có nguồn thật, và một hợp đồng mang nó sẽ tiết kiệm được một vòng đọc DOM.
- Hoặc: file Excel của các đội thêm hẳn một cột cho phần tử, được điền nghiêm túc. Lúc đó
  field này không còn là suy đoán và nên quay lại — nhưng phải quay lại như một field
  **bắt buộc có nguồn**, không phải một field trích từ dấu ngoặc kép.
