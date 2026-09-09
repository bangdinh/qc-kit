# Nợ kỹ thuật

Nợ đã biết, có chủ đích, kèm điều kiện trả. Không phải danh sách ước muốn — mỗi mục phải
nói rõ **vì sao còn nợ** và **cái gì làm nó trả được**.

---

## 1. ~~Kit còn mang tri thức sản phẩm~~ — ĐÃ TRẢ 2026-09-09

Nợ này đóng ở RPA-4509. Ba file (`src/config/environments.ts`, `src/pages/LoginPage.ts`,
`src/data/credentials.ts`) cùng cả `src/pages`, `src/data`, `src/components` và `tests/`
đã **xoá khỏi repo**; bản mẫu tương đương sống ở `cmd/scaffold/templates/` dưới dạng
trung tính, không mang tên sản phẩm nào.

Điều kiện đóng đã đủ: `cmd/scaffold` tồn tại, nên xoá không còn làm mất ví dụ chạy được —
`make smoke` sinh một dự án thật rồi chạy nó, tốt hơn một suite ví dụ nằm chết trong repo.

Check giờ chạy sạch, không cần loại trừ file nào:

```bash
grep -rniE "fcam\.vn|vmsmart|beta-" src/ cmd/
```

Bản `Login.spec.ts` của VMSmart nằm trong lịch sử git (`git log --all -- tests/ui`) nếu
cần lấy lại; chỗ đúng của nó là một dự án tiêu thụ, không phải kit.

---

## 2. Hợp đồng chưa có kiểm tra lệch với bên sinh

`src/contract/types.ts` và `platform-qc-agent/platform_qc_agent/schemas.py` (nhánh
`development`) phải khớp nhau, nhưng hôm nay **giữ khớp bằng trí nhớ**.

**Trả bằng cách:** kit publish `testcase.schema.json` sinh từ `types.ts`; agent thêm một
test CI so `TestCaseGenerationResult.model_json_schema()` với file đó.

**Điều kiện:** cần thống nhất với team platform ai sở hữu schema — xem ADR-0001, mục
"Đổi ý nếu".

---

## 3. `swipe` và `scroll` chưa có handler

`translateAction()` trả `custom: true` cho hai verb này, tức là báo cho caller "tự lo".
Chưa có `custom` handler mẫu nào trong kit.

**Vì sao còn:** cử chỉ phụ thuộc khoảng cách, hướng và phần tử; một cài đặt mặc định sai
sẽ lan ra mọi dự án kế thừa. Thà chưa có còn hơn có mà sai.

**Trả bằng cách:** khi có một dự án thật cần swipe (nhiều khả năng là mobile), lấy cài
đặt của dự án đó làm mẫu — sau khi nó chạy đúng trên thiết bị thật.


---

## 4. Output của scaffold chưa được typecheck tự động

`make new` sinh ra một dự án, nhưng không có gì kiểm rằng dự án đó **biên dịch được**.

**Đã suýt trả giá:** template `auth/LoginPage.ts.tmpl` từng import `STORAGE_STATE` từ
`qc-kit/core` trong khi nó nằm ở `qc-kit/config`. Chỉ phát hiện vì lần này có chạy tay
`npm run typecheck` trên dự án vừa sinh.

**Trả bằng cách:** một job CI sinh cả hai biến thể (trơn, và `AUTH=1 API=1`), cài từ
tarball `npm pack`, chạy `tsc --noEmit`. Chậm (~1 phút) nhưng đây đúng là loại lỗi mà
unit test của kit không bao giờ thấy.

**Điều kiện:** làm cùng lúc với dựng CI — hiện repo chưa có CI nào.
