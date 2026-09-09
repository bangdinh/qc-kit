# Nợ kỹ thuật

Nợ đã biết, có chủ đích, kèm điều kiện trả. Không phải danh sách ước muốn — mỗi mục phải
nói rõ **vì sao còn nợ** và **cái gì làm nó trả được**.

---

## 1. Kit còn mang tri thức sản phẩm — vi phạm luật 2 của chính nó

**Đo 2026-09-09**, chạy check trong `CLAUDE.md`:

```
src/config/environments.ts:22-25   URL thật của FPT VMSmart beta
src/pages/LoginPage.ts             locator thật + toàn bộ text tiếng Việt màn đăng nhập VMSmart
src/data/credentials.ts            khái niệm "mã doanh nghiệp" — đặc thù luồng login của VMSmart
```

**Vì sao còn:** `qc-kit` sinh ra như bộ test của một sản phẩm rồi mới thành kit dùng
chung. Ba file này là dấu vết của giai đoạn đó. Xoá ngay thì mất luôn ví dụ chạy được
duy nhất và mất `Login.spec.ts` đang pass với tài khoản thật.

**Trả bằng cách:** chuyển ba file thành **template của `cmd/scaffold`** cộng một dự án ví
dụ trong `examples/`. Kit giữ `BasePage`/`BaseComponent`/`Authenticator`; VMSmart giữ
locator của VMSmart.

**Điều kiện:** làm cùng lúc với `cmd/scaffold`. Làm trước thì repo không còn gì chạy được
để đối chứng.

**Trong lúc chưa trả:** check luật 2 loại trừ đúng ba file này. Bất kỳ file **mới** nào
nhắc `fcam.vn` / `vmsmart` đều bị chặn — đó là điều check này đang bảo vệ.

**Cập nhật 2026-09-09 (RPA-4507):** ba file này **không còn nằm trong gói publish**.
`tsconfig.build.json` loại `src/pages`, `src/data`, `src/components` và
`src/config/environments.ts` khỏi `dist/`, và `src/fixtures` đã đổi thành factory không
nhắc tên sản phẩm nào (phần compose chuyển sang `tests/fixtures.ts`). Kiểm được:

```bash
npm run build && grep -rniE "vmsmart|fcam\.vn" dist/ && echo "RÒ RỈ"
```

Nợ còn lại **nhỏ hơn hẳn**: ba file vẫn nằm trong repo phục vụ suite ví dụ. Trả nốt khi
làm `cmd/scaffold`.

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
