# ADR — quyết định kiến trúc

Một ADR cho mỗi **quyết định khó lùi**: thứ mà sáu tháng sau có người sẽ hỏi "sao lại
làm thế này", và câu trả lời không nằm trong code.

Không viết ADR cho: đổi tên biến, thêm một helper, sửa bug. Viết ADR cho: đổi hợp đồng
công khai, chọn giữa hai kiến trúc, bỏ một thư viện, đảo chiều một luồng dữ liệu.

Định dạng — theo `b2b-gokit/docs/adr/`:

```
# ADR-000N: <tiêu đề>

- **Status:** Proposed | Accepted | Superseded by ADR-000M
- **Date:** YYYY-MM-DD
- **Deciders:** ai chốt
- **Related:** tài liệu, chuẩn, source đã đọc để ra quyết định

## Context     — sức ép nào dẫn tới đây, kèm số đo nếu có
## Decision    — chốt cái gì, đủ cụ thể để làm theo
## Consequences— được gì, mất gì. Phải có phần "mất".
## Đổi ý nếu   — điều kiện cụ thể làm quyết định này sai
```

Mục **Đổi ý nếu** là mục hay bị bỏ nhất và có giá trị nhất: nó biến một quyết định thành
thứ kiểm lại được, thay vì một niềm tin không ai dám động vào.

| ADR | Nội dung |
|---|---|
| [0001](0001-kien-truc-qc-kit.md) | Spec-based TDD, một package, hợp đồng ở giữa |
